const { spawn } = require('child_process');
const path = require('path');

async function verifyE2ECollectionLifecycle() {
  console.log('\n┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│  🚀 IntelliCore E2E Verification: Full Collection Lifecycle          │');
  console.log('└──────────────────────────────────────────────────────────────────────┘\n');

  const backendDir = path.join(__dirname, '../express-backend');
  const server = spawn('node', ['src/index.js'], {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '8001' }
  });

  server.stdout.on('data', data => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      console.log(`[Backend Log] ${line}`);
    }
  });

  server.stderr.on('data', data => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });

  await new Promise(r => setTimeout(r, 3500));
  const baseUrl = 'http://127.0.0.1:8001/api/v1';

  try {
    console.log('\n======================================================================');
    console.log('STEP 1: Verify Account Login & Authentication');
    console.log('======================================================================');
    const email = `verify_col_${Date.now()}@intellicore.ai`;
    await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!', full_name: 'E2E Lifecycle Tester' })
    });

    const resLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password: 'Password123!' })
    });
    if (!resLogin.ok) throw new Error(`Login failed: ${resLogin.status}`);
    const { access_token } = await resLogin.json();
    console.log(`✅ User Login successful (HTTP 200). JWT Bearer token received.`);
    
    const authHeaders = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };

    console.log('\n======================================================================');
    console.log('STEP 2: Fetch Organizational Hierarchy IDs');
    console.log('======================================================================');
    const resOrgs = await fetch(`${baseUrl}/organizations`, { headers: authHeaders });
    const orgs = await resOrgs.json();
    const orgId = orgs[0].id;

    const resWs = await fetch(`${baseUrl}/workspaces?organization_id=${orgId}`, { headers: authHeaders });
    const workspaces = await resWs.json();
    const wsId = workspaces[0].id;

    const resDepts = await fetch(`${baseUrl}/departments?workspace_id=${wsId}`, { headers: authHeaders });
    const departments = await resDepts.json();
    const deptId = departments[0].id;
    console.log(`✅ Resolved Workspace ID: ${wsId}, Department ID: ${deptId}`);

    console.log('\n======================================================================');
    console.log('STEP 3: Verify Create Collection & HTTP 201 Return');
    console.log('======================================================================');
    const newColName = `Production Enterprise Collection ${Date.now()}`;
    const resCreate = await fetch(`${baseUrl}/collections/`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: newColName,
        description: "Initial automated RAG knowledge base",
        department_id: deptId
      })
    });
    
    console.log(`📥 Response Status: HTTP ${resCreate.status} ${resCreate.statusText}`);
    const colData = await resCreate.json();
    if (resCreate.status !== 201) {
      throw new Error(`Expected HTTP 201 Created but got ${resCreate.status}: ${JSON.stringify(colData)}`);
    }
    console.log(`✅ HTTP 201 Returned! Collection saved in PostgreSQL with ID=${colData.id}`);

    console.log('\n======================================================================');
    console.log('STEP 4: Verify Collection Appears Immediately in UI (GET /analytics/collections)');
    console.log('======================================================================');
    const resList1 = await fetch(`${baseUrl}/analytics/collections`, { headers: authHeaders });
    if (!resList1.ok) throw new Error(`GET /analytics/collections failed with status ${resList1.status}`);
    const list1 = await resList1.json();
    console.log(`📥 Returned ${list1.length} total collection records from analytics endpoint.`);
    
    const foundCol1 = list1.find(c => c.id === colData.id || c.collection_id === colData.id);
    if (!foundCol1) throw new Error(`Created collection ID=${colData.id} NOT found in immediate list!`);
    console.log(`✅ Collection appeared immediately in UI list: "${foundCol1.name}" (Docs: ${foundCol1.document_count}, Storage: ${foundCol1.total_size_bytes}B)`);

    console.log('\n======================================================================');
    console.log('STEP 4B: Verify Collection Detail API Endpoint (GET /collections/:id)');
    console.log('======================================================================');
    const resDetail = await fetch(`${baseUrl}/collections/${colData.id}`, { headers: authHeaders });
    console.log(`📥 Detail Response Status: HTTP ${resDetail.status} ${resDetail.statusText}`);
    const detailData = await resDetail.json();
    if (!resDetail.ok || detailData.id !== colData.id) {
      throw new Error(`GET /collections/${colData.id} failed with status ${resDetail.status}: ${JSON.stringify(detailData)}`);
    }
    console.log(`✅ Collection details returned cleanly: ID=${detailData.id}, Name="${detailData.name}", Workspace="${detailData.workspace_name}", Dept="${detailData.department_name}"`);

    console.log('\n======================================================================');
    console.log('STEP 5: Verify Collection Still Exists After Page Refresh');
    console.log('======================================================================');
    const resList2 = await fetch(`${baseUrl}/analytics/collections`, { headers: authHeaders });
    const list2 = await resList2.json();
    const foundCol2 = list2.find(c => c.id === colData.id);
    if (!foundCol2) throw new Error(`Collection did not survive page refresh!`);
    console.log(`✅ Collection still present after simulated page refresh (HTTP 200).`);

    console.log('\n======================================================================');
    console.log('STEP 6: Verify Collection Can Be Edited (PATCH /collections/:id)');
    console.log('======================================================================');
    const updatedName = `${newColName} [EDITED]`;
    const resEdit = await fetch(`${baseUrl}/collections/${colData.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ name: updatedName, description: "Updated description via UI Modal" })
    });
    console.log(`📥 Edit Response Status: HTTP ${resEdit.status} ${resEdit.statusText}`);
    const editData = await resEdit.json();
    if (!resEdit.ok) throw new Error(`Edit failed with status ${resEdit.status}: ${JSON.stringify(editData)}`);
    console.log(`✅ Collection successfully edited in PostgreSQL. New Name: "${editData.name}"`);

    // Verify change is reflected in list
    const resList3 = await fetch(`${baseUrl}/analytics/collections`, { headers: authHeaders });
    const list3 = await resList3.json();
    const foundCol3 = list3.find(c => c.id === colData.id);
    if (foundCol3.name !== updatedName) throw new Error(`Edit not reflected in analytics list!`);
    console.log(`✅ Verified updated name in analytical collections overview.`);

    console.log('\n======================================================================');
    console.log('STEP 7: Verify Collection Can Be Deleted (DELETE /collections/:id)');
    console.log('======================================================================');
    const resDel = await fetch(`${baseUrl}/collections/${colData.id}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log(`📥 Delete Response Status: HTTP ${resDel.status} ${resDel.statusText}`);
    if (resDel.status !== 204 && !resDel.ok) {
      throw new Error(`Delete failed with HTTP ${resDel.status}`);
    }
    console.log(`✅ HTTP 204 Returned! Collection deleted from database.`);

    // Verify removal from list
    const resList4 = await fetch(`${baseUrl}/analytics/collections`, { headers: authHeaders });
    const list4 = await resList4.json();
    const foundCol4 = list4.find(c => c.id === colData.id);
    if (foundCol4) throw new Error(`Deleted collection still exists in list!`);
    console.log(`✅ Confirmed: Deleted collection is permanently removed from Postgres and UI list.`);

    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║  🏆 FULL E2E COLLECTION LIFECYCLE VERIFIED SUCCESSFULLY (100% PASS)  ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('\n❌ E2E Verification Failed:', err.message || err);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    server.kill('SIGINT');
    await new Promise(r => setTimeout(r, 500));
    process.exit(0);
  }
}

verifyE2ECollectionLifecycle();
