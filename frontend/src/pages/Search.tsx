import { useState, useMemo } from 'react';
import { 
  Search as SearchIcon, X, Bookmark, HelpCircle, Bell, 
  FileText, Folder, Network, List, Grid, MoreVertical,
  Calendar, ChevronDown, ArrowLeft, ArrowUpRight, CheckCircle2, Sparkles, Tags
} from 'lucide-react';
import { useHierarchyStore } from '../store/hierarchyStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

const formatSnippet = (text: string, highlightQuery: string) => {
  if (!text) return 'No preview available';
  
  let cleaned = text.replace(/\.{2,}/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (!highlightQuery.trim()) return cleaned;
  
  const escaped = highlightQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  
  return cleaned.replace(regex, `<span class="text-[#FBBF24] bg-[#FBBF24]/10 px-1 rounded font-medium shadow-sm">$1</span>`);
};

export default function Search() {
  const { workspaces, departments } = useHierarchyStore();
  
  // Search State
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('hybrid');
  
  // Filter State
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [docType, setDocType] = useState('all');
  const [dateRange, setDateRange] = useState('All Time');
  
  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list'|'grid'>('list');
  const [sortBy, setSortBy] = useState('Relevance');
  
  // Data State
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Preview State
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [relatedDocs, setRelatedDocs] = useState<any[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setSelectedDocId(null);
    const start = performance.now();
    
    try {
      const payload: any = {
        query,
        search_type: searchType,
        limit: 50
      };
      
      if (selectedWorkspace) payload.workspace_id = parseInt(selectedWorkspace);
      if (selectedDepartment) payload.department_id = parseInt(selectedDepartment);
      if (selectedCollection) payload.collection_id = parseInt(selectedCollection);
      if (docType !== 'all') payload.document_type = docType;

      const res = await api.post('/search/', payload);
      setResults(res.data);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed to execute.');
    } finally {
      setSearchTime((performance.now() - start) / 1000);
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    setSearchType('hybrid');
    setSelectedWorkspace('');
    setSelectedDepartment('');
    setSelectedCollection('');
    setDocType('all');
    setDateRange('All Time');
    setActiveTab('all');
    setQuery('');
    setResults([]);
    setSearched(false);
    setSelectedDocId(null);
    toast.success('Filters cleared');
  };

  const handleSelectDocument = async (docId: number) => {
    setSelectedDocId(docId);
    setPreviewLoading(true);
    try {
      const [docRes, relatedRes] = await Promise.all([
        api.get(`/documents/${docId}`),
        api.get(`/documents/${docId}/related`)
      ]);
      setPreviewData(docRes.data);
      setRelatedDocs(relatedRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load document preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    let processed = [...results];
    
    if (activeTab === 'documents') processed = processed.filter(r => r.type !== 'collection' && r.type !== 'person');
    if (activeTab === 'collections') processed = processed.filter(r => r.type === 'collection');
    if (activeTab === 'people') processed = processed.filter(r => r.type === 'person');
    
    if (sortBy === 'Relevance') {
      processed.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    } else if (sortBy === 'Title') {
      processed.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    
    return processed;
  }, [results, activeTab, sortBy]);

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] text-slate-300 overflow-hidden">
      
      {/* Top Header */}
      <div className="flex items-start justify-between px-8 pt-8 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Search</h1>
          <p className="text-slate-400 text-sm">Find the information you need across your enterprise knowledge.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => toast('Saved searches feature coming soon!', { icon: '🔖' })}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 text-sm text-slate-300 transition-colors"
          >
            <Bookmark size={14} /> Saved Searches
          </button>
          <button 
            onClick={() => toast('Help documentation opening...', { icon: '❓' })}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 text-slate-400 transition-colors"
          >
            <HelpCircle size={16} />
          </button>
          <button 
            onClick={() => toast('No new notifications', { icon: '🔕' })}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 text-slate-400 transition-colors relative"
          >
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0A0C10]"></span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden px-8 pb-8 gap-8">
        
        {/* Left Column: Search & Results */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Search Bar */}
          <div className="flex items-center gap-2 mb-6 shrink-0">
            <form onSubmit={handleSearch} className="flex-1 relative flex items-center bg-[#13161F] border border-slate-800 rounded-xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-sm">
              <SearchIcon size={18} className="absolute left-4 text-slate-500" />
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search across all your documents..." 
                className="w-full bg-transparent border-none py-3.5 pl-12 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-0"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="absolute right-3 p-1 text-slate-500 hover:text-slate-300">
                  <X size={16} />
                </button>
              )}
            </form>
            <button 
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:bg-slate-800"
            >
              Search
            </button>
          </div>

          {/* Results Tabs */}
          <div className="flex items-center gap-6 border-b border-slate-800 mb-4 shrink-0">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'all' ? 'border-indigo-500 text-indigo-400' : 'border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              <SearchIcon size={16} /> All Results <span className={`${activeTab === 'all' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'} px-1.5 py-0.5 rounded text-xs`}>{results.length || 0}</span>
            </button>
            <button 
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'documents' ? 'border-indigo-500 text-indigo-400' : 'border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              <FileText size={16} /> Documents <span className={`${activeTab === 'documents' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'} px-1.5 py-0.5 rounded text-xs`}>{results.length || 0}</span>
            </button>
            <button 
              onClick={() => setActiveTab('collections')}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'collections' ? 'border-indigo-500 text-indigo-400' : 'border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              <Folder size={16} /> Collections <span className={`${activeTab === 'collections' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'} px-1.5 py-0.5 rounded text-xs`}>0</span>
            </button>
            <button 
              onClick={() => { setActiveTab('graph'); toast('Knowledge graph visualization opened'); }}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'graph' ? 'border-indigo-500 text-indigo-400' : 'border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              <Network size={16} /> Knowledge Graph
            </button>
          </div>

          <div className="flex justify-between items-center mb-4 text-xs text-slate-500 shrink-0">
            <span>{searched ? `${filteredAndSortedResults.length} results found (${searchTime.toFixed(2)}s)` : '0 results found'}</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 cursor-pointer hover:text-slate-300 relative group">
                Sort by: 
                <span className="text-indigo-400 font-medium ml-1 flex items-center gap-1">
                  {sortBy} <ChevronDown size={12} />
                </span>
                <div className="absolute top-full right-0 mt-1 w-32 bg-[#1E2333] border border-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
                  <div onClick={() => setSortBy('Relevance')} className="px-3 py-1.5 hover:bg-slate-800/50 cursor-pointer text-slate-300">Relevance</div>
                  <div onClick={() => setSortBy('Title')} className="px-3 py-1.5 hover:bg-slate-800/50 cursor-pointer text-slate-300">Title</div>
                </div>
              </div>
              <div className="flex bg-[#13161F] border border-slate-800 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                ><List size={14} /></button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                ><Grid size={14} /></button>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className={`flex-1 overflow-y-auto scrollbar-thin pr-2 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-4 auto-rows-max' : 'space-y-4'}`}>
            {loading ? (
              <div className="flex justify-center py-20 col-span-full">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredAndSortedResults.length > 0 ? (
              filteredAndSortedResults.map((result, i) => (
                <div 
                  key={i} 
                  onClick={() => handleSelectDocument(result.document_id)}
                  className={`group bg-[#13161F] border rounded-xl cursor-pointer transition-all ${
                    selectedDocId === result.document_id 
                      ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)] ring-1 ring-indigo-500/20' 
                      : 'border-slate-800 hover:border-slate-700'
                  } ${viewMode === 'list' ? 'p-5 flex gap-4' : 'p-4 flex flex-col'}`}
                >
                  <div className={`${viewMode === 'list' ? 'mt-1' : 'mb-3'}`}>
                    {result.title?.toLowerCase().endsWith('.docx') ? (
                      <div className="w-9 h-11 bg-blue-500/10 border border-blue-500/20 rounded flex flex-col items-center justify-center text-blue-400 shadow-sm">
                        <FileText size={16} className="mb-0.5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Doc</span>
                      </div>
                    ) : (
                      <div className="w-9 h-11 bg-red-500/10 border border-red-500/20 rounded flex flex-col items-center justify-center text-red-400 shadow-sm">
                        <FileText size={16} className="mb-0.5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">PDF</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h4 className={`text-base font-semibold truncate ${selectedDocId === result.document_id ? 'text-indigo-400' : 'text-white'}`}>
                        {result.document_title || result.title}
                      </h4>
                      {i === 0 && sortBy === 'Relevance' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          Best Match
                        </span>
                      )}
                    </div>
                    
                    <p 
                      className={`text-slate-400 text-sm leading-relaxed mb-3 ${viewMode === 'grid' ? 'line-clamp-3' : 'line-clamp-2'}`}
                      dangerouslySetInnerHTML={{ 
                        __html: `...${formatSnippet(result.chunk_text || result.text_content, query)}...`
                      }}
                    />
                    
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5 bg-[#0F111A] px-2 py-1 rounded border border-slate-800"><Folder size={12} className="text-amber-500" /> Root Collection</div>
                    </div>
                  </div>
                  
                  <div className={`${viewMode === 'list' ? 'flex flex-col items-end justify-between ml-4 pl-4 border-l border-slate-800/50' : 'mt-4 pt-3 border-t border-slate-800/50 flex flex-row items-center justify-between'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                        <Network size={12}/> {((result.similarity || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : searched ? (
              <div className="text-center py-20 col-span-full">
                <SearchIcon size={48} className="mx-auto text-slate-800 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
                <p className="text-slate-500">Try adjusting your filters or search terms.</p>
              </div>
            ) : null}
          </div>

        </div>

        {/* Right Column: Dynamic Panel (Filters vs Document Preview) */}
        <div className="w-[320px] flex flex-col shrink-0 overflow-hidden bg-[#13161F] border border-slate-800 rounded-2xl shadow-xl relative">
          
          {selectedDocId ? (
            /* PREVIEW STATE */
            <div className="flex flex-col h-full absolute inset-0 animate-in slide-in-from-right-4 duration-300">
              
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#13161F]/90 backdrop-blur z-10 shrink-0">
                <button 
                  onClick={() => setSelectedDocId(null)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors px-2 py-1.5 hover:bg-slate-800 rounded-lg"
                >
                  <ArrowLeft size={14} /> Back to filters
                </button>
                <div className="flex gap-2">
                  <button className="text-slate-500 hover:text-indigo-400 transition-colors p-1" title="Open in new tab"><ArrowUpRight size={16} /></button>
                  <button className="text-slate-500 hover:text-white transition-colors p-1"><MoreVertical size={16} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-6">
                {previewLoading ? (
                  <div className="flex flex-col items-center justify-center h-40">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-xs text-slate-500">Loading document insights...</p>
                  </div>
                ) : previewData ? (
                  <>
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        {previewData.file_type === 'pdf' ? <FileText size={18} className="text-red-400" /> : <FileText size={18} className="text-blue-400" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{previewData.file_type} Document</span>
                      </div>
                      <h2 className="text-lg font-bold text-white leading-snug mb-3">{previewData.title}</h2>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-400 bg-[#0A0C10] p-3 rounded-lg border border-slate-800/50">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-500">Status</span>
                          <span className="flex items-center gap-1 text-emerald-400 font-medium"><CheckCircle2 size={12}/> {previewData.status}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-800"></div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-500">Uploaded</span>
                          <span className="text-slate-300 font-medium">{new Date(previewData.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Summary */}
                    {previewData.metadata?.summary && (
                      <div>
                        <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-400" /> AI Summary</h3>
                        <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl">
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {previewData.metadata.summary}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Topics */}
                    {previewData.metadata?.topics && previewData.metadata.topics.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5"><Tags size={14} className="text-slate-400" /> Extracted Topics</h3>
                        <div className="flex flex-wrap gap-2">
                          {previewData.metadata.topics.map((topic: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-[#1E2333] border border-slate-700 rounded-md text-xs text-slate-300 hover:border-slate-500 cursor-pointer transition-colors">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related Documents */}
                    {relatedDocs.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5"><Network size={14} className="text-slate-400" /> Related Documents</h3>
                        <div className="space-y-2">
                          {relatedDocs.map((rd: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-[#0A0C10] border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-colors group">
                              <FileText size={14} className="text-slate-500 mt-0.5 group-hover:text-indigo-400 transition-colors" />
                              <div>
                                <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors line-clamp-2">{rd.title}</p>
                                <p className="text-[10px] text-emerald-400 mt-1">{((rd.similarity || 0) * 100).toFixed(0)}% Match</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 text-slate-500 text-sm">Failed to load preview.</div>
                )}
              </div>
            </div>
          ) : (
            /* FILTERS STATE */
            <div className="flex flex-col h-full absolute inset-0 animate-in slide-in-from-left-4 duration-300">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-white">Filters</h3>
                <button onClick={handleClearAll} className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Clear All</button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-6">
                
                {/* Search Type */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-slate-400">Search Engine</label>
                    <HelpCircle size={12} className="text-slate-600" />
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-[#0A0C10] p-1 rounded-lg border border-slate-800/50">
                    <button 
                      onClick={() => setSearchType('hybrid')}
                      className={`flex flex-col items-center justify-center py-2 rounded-md transition-all ${searchType === 'hybrid' ? 'bg-[#1E2333] border border-indigo-500/30 shadow-sm' : 'hover:bg-slate-800/50'}`}
                    >
                      <span className={`text-xs font-medium ${searchType === 'hybrid' ? 'text-indigo-400' : 'text-slate-400'}`}>Hybrid</span>
                    </button>
                    <button 
                      onClick={() => setSearchType('semantic')}
                      className={`flex flex-col items-center justify-center py-2 rounded-md transition-all ${searchType === 'semantic' ? 'bg-[#1E2333] border border-indigo-500/30 shadow-sm' : 'hover:bg-slate-800/50'}`}
                    >
                      <span className={`text-xs font-medium ${searchType === 'semantic' ? 'text-white' : 'text-slate-400'}`}>Semantic</span>
                    </button>
                    <button 
                      onClick={() => setSearchType('keyword')}
                      className={`flex flex-col items-center justify-center py-2 rounded-md transition-all ${searchType === 'keyword' ? 'bg-[#1E2333] border border-indigo-500/30 shadow-sm' : 'hover:bg-slate-800/50'}`}
                    >
                      <span className={`text-xs font-medium ${searchType === 'keyword' ? 'text-white' : 'text-slate-400'}`}>Keyword</span>
                    </button>
                  </div>
                </div>

                {/* Workspaces */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Workspaces</label>
                  <div className="relative">
                    <select 
                      value={selectedWorkspace}
                      onChange={e => setSelectedWorkspace(e.target.value)}
                      className="w-full bg-[#0A0C10] border border-slate-800 text-sm text-slate-300 rounded-lg pl-3 pr-8 py-2.5 appearance-none focus:outline-none focus:border-slate-600"
                    >
                      <option value="">All Workspaces</option>
                      {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Departments */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Departments</label>
                  <div className="relative">
                    <select 
                      value={selectedDepartment}
                      onChange={e => setSelectedDepartment(e.target.value)}
                      className="w-full bg-[#0A0C10] border border-slate-800 text-sm text-slate-300 rounded-lg pl-3 pr-8 py-2.5 appearance-none focus:outline-none focus:border-slate-600"
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Document Type</label>
                  <div className="grid grid-cols-4 gap-1">
                    <button 
                      onClick={() => setDocType('all')}
                      className={`py-2 text-xs font-medium rounded-lg border transition-colors ${docType === 'all' ? 'bg-[#1E2333] border-indigo-500/30 text-indigo-400' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setDocType('pdf')}
                      className={`py-2 flex items-center justify-center gap-1 text-xs font-medium rounded-lg border transition-colors ${docType === 'pdf' ? 'bg-[#1E2333] border-indigo-500/30 text-indigo-400' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                    >
                      <FileText size={10} className="text-red-400" /> PDF
                    </button>
                    <button 
                      onClick={() => setDocType('docx')}
                      className={`py-2 flex items-center justify-center gap-1 text-xs font-medium rounded-lg border transition-colors ${docType === 'docx' ? 'bg-[#1E2333] border-indigo-500/30 text-indigo-400' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                    >
                      <FileText size={10} className="text-blue-400" /> DOCX
                    </button>
                    <button 
                      onClick={() => setDocType('txt')}
                      className={`py-2 flex items-center justify-center gap-1 text-xs font-medium rounded-lg border transition-colors ${docType === 'txt' ? 'bg-[#1E2333] border-indigo-500/30 text-indigo-400' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                    >
                      <FileText size={10} className="text-slate-400" /> TXT
                    </button>
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Date Range</label>
                  <div className="relative">
                    <select 
                      value={dateRange}
                      onChange={e => setDateRange(e.target.value)}
                      className="w-full bg-[#0A0C10] border border-slate-800 text-sm text-slate-300 rounded-lg pl-9 pr-8 py-2.5 appearance-none focus:outline-none focus:border-slate-600"
                    >
                      <option value="All Time">All Time</option>
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                      <option value="This Year">This Year</option>
                    </select>
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

              </div>

              <div className="p-5 border-t border-slate-800 shrink-0">
                <button 
                  onClick={(e) => {
                    toast.success('Filters applied successfully');
                    handleSearch(e as any);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-medium transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
