import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  FileText, Tag, ArrowLeft, Loader2, Link as LinkIcon, 
  Sparkles, CheckCircle2, Clock, AlertCircle, FileArchive, File,
  Code2, Share2, MoreVertical, Search, FileJson
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [chunks, setChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'insights' | 'raw_chunks'>('insights');

  useEffect(() => {
    async function fetchDoc() {
      try {
        const [docRes, relatedRes, chunksRes] = await Promise.all([
          api.get(`/documents/${id}`),
          api.get(`/documents/${id}/related`),
          api.get(`/documents/${id}/chunks`)
        ]);
        setDocument(docRes.data);
        setRelated(relatedRes.data);
        setChunks(chunksRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDoc();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0A0C10]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-slate-500 text-sm font-medium">Loading document insights...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-8 bg-[#0A0C10] h-full flex flex-col">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-white mb-6 w-fit">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-center mt-20 text-slate-500">Document not found.</div>
      </div>
    );
  }

  const { metadata } = document;

  const getFileIcon = (fileType: string, size: number = 24) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return <FileText className="text-red-400" size={size} />;
      case 'docx': return <FileText className="text-blue-400" size={size} />;
      case 'txt': return <File className="text-slate-400" size={size} />;
      default: return <FileArchive className="text-indigo-400" size={size} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-y-auto scrollbar-thin text-slate-300">
      
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-20 px-8 py-6 shrink-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-white mb-6 transition-colors w-fit">
          <ArrowLeft size={14} /> Back to Documents
        </button>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#13161F] border border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
              {getFileIcon(document.file_type, 28)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">{document.title}</h1>
                {document.status === 'completed' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10}/> Synced</span>}
                {document.status === 'processing' && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> Processing</span>}
                {document.status === 'pending' && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Clock size={10}/> Queued</span>}
                {document.status === 'error' && <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle size={10}/> Failed</span>}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                <span className="uppercase tracking-wider text-[11px] font-bold bg-[#1E2333] px-2 py-0.5 rounded">{document.file_type}</span>
                <span>Uploaded {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button className="flex items-center gap-2 bg-[#13161F] border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Share2 size={16} /> Share
            </button>
            <button className="flex items-center gap-2 bg-[#13161F] border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <LinkIcon size={16} /> Copy Link
            </button>
            <button className="p-2 bg-[#13161F] border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-8 border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('insights')}
            className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'insights' ? 'text-indigo-400 border-indigo-500' : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'}`}
          >
            <Sparkles size={16} /> AI Insights
          </button>
          <button 
            onClick={() => setActiveTab('raw_chunks')}
            className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'raw_chunks' ? 'text-indigo-400 border-indigo-500' : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'}`}
          >
            <Code2 size={16} /> Raw Text Chunks <span className="bg-[#1E2333] text-slate-400 px-1.5 py-0.5 rounded text-[10px] ml-1">{chunks.length}</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8">
        
        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content (Preview + Summary) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* AI Summary */}
              <div className="bg-[#13161F] border border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-400" /> Executive Summary
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed relative z-10">
                  {metadata?.summary || <span className="italic text-slate-500">Document is processing or no summary could be generated.</span>}
                </p>
              </div>

              {/* PDF Viewer Placeholder */}
              <div className="bg-[#0A0C10] border border-slate-800 rounded-2xl shadow-inner min-h-[600px] flex flex-col relative overflow-hidden">
                <div className="h-12 border-b border-slate-800 bg-[#13161F] flex items-center justify-between px-4">
                  <div className="flex gap-2 items-center text-xs text-slate-500 font-medium">
                    {getFileIcon(document.file_type, 14)} {document.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><Search size={14}/></button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="text-white font-medium mb-1">Interactive Viewer Not Initialized</p>
                  <p className="text-sm max-w-sm mx-auto">This environment does not currently have the PDF.js canvas engine installed for rendering binary blobs.</p>
                  <button className="mt-6 bg-[#1E2333] hover:bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Download Original File
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar (Topics, Related) */}
            <div className="space-y-6">
              
              {/* Topics */}
              <div className="bg-[#13161F] border border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Tag size={16} className="text-slate-400" /> Extracted Topics
                </h3>
                {metadata?.topics?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {metadata.topics.map((topic: string, i: number) => (
                      <span key={i} className="px-2.5 py-1.5 bg-[#1E2333] border border-slate-700 hover:border-slate-500 cursor-default transition-colors text-slate-300 rounded-lg text-xs font-medium">
                        {topic}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No topics extracted.</p>
                )}
              </div>

              {/* Related Documents */}
              <div className="bg-[#13161F] border border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <LinkIcon size={16} className="text-slate-400" /> Related Documents
                </h3>
                {related.length > 0 ? (
                  <div className="space-y-2">
                    {related.map(r => (
                      <a 
                        key={r.id} 
                        href={`/dashboard/documents/${r.id}`}
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-800/50 hover:border-slate-700 hover:bg-[#1E2333] transition-all group"
                      >
                        <div className="mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                          {getFileIcon(r.title.split('.').pop() || 'txt', 14)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-300 group-hover:text-white truncate mb-1">{r.title}</div>
                          <div className="text-[10px] text-emerald-400 font-bold tracking-wider">{(r.similarity * 100).toFixed(0)}% MATCH</div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No related documents found in this collection.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'raw_chunks' && (
          <div className="space-y-6">
            <div className="bg-[#13161F] border border-slate-800 rounded-xl p-5 shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <FileJson size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Embedding Vector Transparency</h3>
                <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
                  These are the raw text chunks extracted from the document before being passed into the SentenceTransformer embedding model. 
                  This view is for debugging semantic search accuracy and verifying chunk sizes (context window limits).
                </p>
              </div>
            </div>

            {chunks.length === 0 ? (
              <div className="text-center py-20 border border-slate-800 border-dashed rounded-xl">
                <p className="text-slate-500">No chunks available. Document may still be processing or failed ingestion.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="bg-[#0A0C10] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="bg-[#13161F] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chunk {chunk.chunk_index}</span>
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                        {chunk.text_content.length} chars
                      </span>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: '300px' }}>
                      <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {chunk.text_content}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
