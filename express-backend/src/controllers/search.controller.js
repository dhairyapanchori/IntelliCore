const prisma = require('../config/db');

let pipeline = null;
(async () => {
  try {
    const transformers = await import('@xenova/transformers');
    pipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  } catch (err) {
    console.error("Failed to load transformers:", err);
  }
})();

const advancedSearch = async (req, res) => {
  try {
    const { query, search_type = "hybrid", workspace_id, department_id, collection_id, document_type, limit = 10 } = req.body;
    
    // 1. Base security filter
    const orgs = await prisma.organization_users.findMany({
      where: { user_id: req.user.id },
      select: { organization_id: true }
    });
    const orgIds = orgs.map(o => o.organization_id);

    // Prisma $queryRaw for pgvector and complex joins
    // We construct the WHERE clause dynamically
    let conditions = [`w.organization_id IN (${orgIds.join(',') || '0'})`, `d.status = 'completed'`];
    
    if (workspace_id) conditions.push(`w.id = ${parseInt(workspace_id)}`);
    if (department_id) conditions.push(`dept.id = ${parseInt(department_id)}`);
    if (collection_id) conditions.push(`c.id = ${parseInt(collection_id)}`);
    if (document_type) conditions.push(`d.file_type = '${document_type.replace(/'/g, "''")}'`);
    
    const whereClause = conditions.join(' AND ');
    const results = [];

    if (search_type === "keyword" || search_type === "hybrid") {
      const kw = `%${query}%`;
      const kwResults = await prisma.$queryRawUnsafe(`
        SELECT d.id as document_id, d.title, ch.text_content as chunk_text, 1.0 as similarity
        FROM document_chunks ch
        JOIN documents d ON ch.document_id = d.id
        JOIN collections c ON d.collection_id = c.id
        JOIN departments dept ON c.department_id = dept.id
        JOIN workspaces w ON dept.workspace_id = w.id
        WHERE ${whereClause} AND (d.title ILIKE $1 OR ch.text_content ILIKE $1)
        LIMIT $2
      `, kw, limit);
      results.push(...kwResults);
    }

    if ((search_type === "semantic" || search_type === "hybrid") && pipeline) {
      const output = await pipeline(query, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      const embeddingStr = `[${embedding.join(',')}]`;

      const semResults = await prisma.$queryRawUnsafe(`
        SELECT d.id as document_id, d.title, ch.text_content as chunk_text, 
               1 - (ch.embedding <=> $1::vector) as similarity
        FROM document_chunks ch
        JOIN documents d ON ch.document_id = d.id
        JOIN collections c ON d.collection_id = c.id
        JOIN departments dept ON c.department_id = dept.id
        JOIN workspaces w ON dept.workspace_id = w.id
        WHERE ${whereClause}
        ORDER BY ch.embedding <=> $1::vector
        LIMIT $2
      `, embeddingStr, limit);

      for (const r of semResults) {
        if (!results.some(x => x.document_id === r.document_id && x.chunk_text === r.chunk_text)) {
          results.push(r);
        }
      }
    }

    // Group by document
    const uniqueResults = {};
    for (const r of results) {
      const docId = r.document_id;
      if (!uniqueResults[docId] || r.similarity > uniqueResults[docId].similarity) {
        uniqueResults[docId] = {
          document_id: docId,
          title: r.title,
          chunk_text: r.chunk_text,
          similarity: r.similarity
        };
      }
    }

    const finalResults = Object.values(uniqueResults).sort((a, b) => b.similarity - a.similarity).slice(0, limit);

    await prisma.activity_logs.create({
      data: {
        user_id: req.user.id,
        action: "search",
        details: `Searched for '${query}'. Found ${finalResults.length} results`
      }
    });

    res.json(finalResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: error.message });
  }
};

module.exports = { advancedSearch };
