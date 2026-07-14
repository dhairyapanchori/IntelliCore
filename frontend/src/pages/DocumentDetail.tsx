import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { FileText, Tag, HelpCircle, ArrowLeft, Loader2, Link as LinkIcon } from 'lucide-react';

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDoc() {
      try {
        const [docRes, relatedRes] = await Promise.all([
          api.get(`/documents/${id}`),
          api.get(`/documents/${id}/related`)
        ]);
        setDocument(docRes.data);
        setRelated(relatedRes.data);
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-center mt-20 text-muted-foreground">Document not found.</div>
      </div>
    );
  }

  const { metadata } = document;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 w-full">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Collection
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{document.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span className="uppercase">{document.file_type}</span>
              <span>•</span>
              <span>Status: <span className={document.status === 'completed' ? 'text-emerald-500 font-medium' : ''}>{document.status}</span></span>
              <span>•</span>
              <span>Imported {new Date(document.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (Preview + Summary) */}
        <div className="lg:col-span-2 space-y-8">
          {/* AI Summary */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                ✨
              </span>
              AI Executive Summary
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {metadata?.summary || <span className="italic text-slate-400">No summary available. Document may still be processing.</span>}
            </p>
          </div>

          {/* Placeholder for PDF Preview */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-inner min-h-[500px] flex items-center justify-center">
            <div className="text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Document Viewer Component</p>
              <p className="text-sm mt-2">PDF.js integration required for full rendering</p>
            </div>
          </div>
        </div>

        {/* Sidebar (Topics, Questions, Related) */}
        <div className="space-y-6">
          {/* Topics */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <Tag size={18} className="text-indigo-500" />
              Key Topics
            </h3>
            {metadata?.topics?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {metadata.topics.map((topic: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium">
                    {topic}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No topics extracted.</p>
            )}
          </div>

          {/* Suggested Questions */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-orange-500" />
              Suggested Questions
            </h3>
            {metadata?.suggested_questions?.length > 0 ? (
              <ul className="space-y-3">
                {metadata.suggested_questions.map((q: string, i: number) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 cursor-pointer hover:text-primary transition-colors">
                    <span className="text-primary mt-0.5">•</span> {q}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">No questions generated.</p>
            )}
          </div>

          {/* Related Documents */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <LinkIcon size={18} className="text-blue-500" />
              Related Documents
            </h3>
            {related.length > 0 ? (
              <div className="space-y-3">
                {related.map(r => (
                  <a 
                    key={r.id} 
                    href={`/dashboard/documents/${r.id}`}
                    className="block p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                  >
                    <div className="text-sm font-medium text-slate-800 dark:text-white truncate mb-1">{r.title}</div>
                    <div className="text-xs text-emerald-500 font-medium">{(r.similarity * 100).toFixed(0)}% Match</div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No related documents found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
