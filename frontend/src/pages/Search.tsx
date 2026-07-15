import { useState, useMemo } from 'react';
import { 
  Search as SearchIcon, X, Bookmark, HelpCircle, Bell, 
  FileText, Folder, Users, Network, List, Grid, MoreVertical,
  Calendar, ChevronDown, Clock
} from 'lucide-react';
import { useHierarchyStore } from '../store/hierarchyStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

const formatSnippet = (text: string, highlightQuery: string) => {
  if (!text) return 'No preview available';
  
  // Clean up PDF artifacts (multiple dots, weird spacing)
  let cleaned = text.replace(/\.{2,}/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (!highlightQuery.trim()) return cleaned;
  
  // Safely escape user query for regex so special characters don't crash the page
  const escaped = highlightQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  
  // Apply highlight with professional styling
  return cleaned.replace(regex, `<span class="text-[#FBBF24] bg-[#FBBF24]/10 px-1 rounded font-medium shadow-sm">$1</span>`);
};

export default function Search() {
  const { workspaces, departments, collections } = useHierarchyStore();
  
  // Search State
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('hybrid');
  
  // Filter State
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [docType, setDocType] = useState('all');
  const [dateRange, setDateRange] = useState('All Time');
  const [selectedTag, setSelectedTag] = useState('');
  
  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list'|'grid'>('list');
  const [sortBy, setSortBy] = useState('Relevance');
  
  // Data State
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    const start = performance.now();
    
    try {
      const payload: any = {
        query,
        search_type: searchType,
        limit: 50
      };
      
      // Wire up backend filters
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

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(fakeEvent);
    }, 0);
  };

  const handleClearAll = () => {
    setSearchType('hybrid');
    setSelectedWorkspace('');
    setSelectedDepartment('');
    setSelectedCollection('');
    setDocType('all');
    setDateRange('All Time');
    setSelectedTag('');
    setActiveTab('all');
    setQuery('');
    setResults([]);
    setSearched(false);
    toast.success('Filters cleared');
  };

  // Compute final results by applying frontend filters and sorting
  const filteredAndSortedResults = useMemo(() => {
    let processed = [...results];
    
    // Tab filtering (mock logic based on file types since backend returns mostly chunks)
    if (activeTab === 'documents') processed = processed.filter(r => r.type !== 'collection' && r.type !== 'person');
    if (activeTab === 'collections') processed = processed.filter(r => r.type === 'collection'); // Would require backend support
    if (activeTab === 'people') processed = processed.filter(r => r.type === 'person'); // Would require backend support
    
    // Sorting
    if (sortBy === 'Relevance') {
      processed.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    } else if (sortBy === 'Title') {
      processed.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    
    return processed;
  }, [results, activeTab, sortBy]);

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] text-slate-300">
      
      {/* Top Header */}
      <div className="flex items-start justify-between px-8 pt-8 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Search</h1>
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

      {/* Main Content Area: 2 Columns */}
      <div className="flex flex-1 overflow-hidden px-8 pb-8 gap-8">
        
        {/* Left Column: Search & Results */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Search Bar Area */}
          <div className="flex items-center gap-2 mb-6">
            <form onSubmit={handleSearch} className="flex-1 relative flex items-center bg-[#13161F] border border-slate-800 rounded-xl focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
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
              className="bg-[#6366F1] hover:bg-[#5558DD] text-white px-8 py-3.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Search
            </button>
          </div>

          {/* Results Tabs */}
          <div className="flex items-center gap-6 border-b border-slate-800 mb-6">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'all' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              <SearchIcon size={16} /> All Results <span className={`${activeTab === 'all' ? 'bg-[#6366F1]/20 text-[#6366F1]' : 'bg-slate-800 text-slate-500'} px-1.5 py-0.5 rounded text-xs`}>{results.length || 0}</span>
            </button>
            <button 
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'documents' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              <FileText size={16} /> Documents <span className={`${activeTab === 'documents' ? 'bg-[#6366F1]/20 text-[#6366F1]' : 'bg-slate-800 text-slate-500'} px-1.5 py-0.5 rounded text-xs`}>{results.length || 0}</span>
            </button>
            <button 
              onClick={() => setActiveTab('collections')}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'collections' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              <Folder size={16} /> Collections <span className={`${activeTab === 'collections' ? 'bg-[#6366F1]/20 text-[#6366F1]' : 'bg-slate-800 text-slate-500'} px-1.5 py-0.5 rounded text-xs`}>0</span>
            </button>
            <button 
              onClick={() => setActiveTab('people')}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'people' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              <Users size={16} /> People <span className={`${activeTab === 'people' ? 'bg-[#6366F1]/20 text-[#6366F1]' : 'bg-slate-800 text-slate-500'} px-1.5 py-0.5 rounded text-xs`}>0</span>
            </button>
            <button 
              onClick={() => { setActiveTab('graph'); toast('Knowledge graph visualization opened'); }}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'graph' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              <Network size={16} /> Knowledge Graph <span className={`${activeTab === 'graph' ? 'bg-[#6366F1]/20 text-[#6366F1]' : 'bg-slate-800 text-slate-500'} px-1.5 py-0.5 rounded text-xs`}>0</span>
            </button>
          </div>

          <div className="flex justify-between items-center mb-4 text-xs text-slate-500">
            <span>{searched ? `${filteredAndSortedResults.length} results found (${searchTime.toFixed(2)}s)` : '0 results found'}</span>
            <div className="flex items-center gap-4">
              <div 
                className="flex items-center gap-1 cursor-pointer hover:text-slate-300 relative group"
              >
                Sort by: 
                <span className="text-[#6366F1] font-medium ml-1 flex items-center gap-1">
                  {sortBy} <ChevronDown size={12} />
                </span>
                
                {/* Custom Sort Dropdown on Hover */}
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
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredAndSortedResults.length > 0 ? (
              filteredAndSortedResults.map((result, i) => (
                <div key={i} className={`group bg-[#13161F] border border-slate-800 rounded-xl hover:border-slate-700 transition-colors ${viewMode === 'list' ? 'p-5 flex gap-4' : 'p-4 flex flex-col'}`}>
                  <div className={`${viewMode === 'list' ? 'mt-1' : 'mb-3'}`}>
                    {result.type === 'word' || result.title?.endsWith('.docx') ? (
                      <div className="w-8 h-10 bg-blue-500/10 border border-blue-500/20 rounded-md flex flex-col items-center justify-center text-blue-500">
                        <FileText size={14} className="mb-0.5" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">Word</span>
                      </div>
                    ) : (
                      <div className="w-8 h-10 bg-red-500/10 border border-red-500/20 rounded-md flex flex-col items-center justify-center text-red-500">
                        <FileText size={14} className="mb-0.5" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">PDF</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h4 className="text-base font-semibold text-white truncate">{result.document_title || result.title}</h4>
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
                    
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5"><Folder size={12} /> Root Collection</div>
                    </div>
                  </div>
                  
                  <div className={`${viewMode === 'list' ? 'flex flex-col items-end justify-between ml-4 pl-4 border-l border-slate-800/50' : 'mt-4 pt-3 border-t border-slate-800/50 flex flex-row items-center justify-between'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#6366F1]">
                        {((result.similarity || 0) * 100).toFixed(0)}%
                      </span>
                      <button onClick={() => toast.success('Added to saved items')} className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={16} />
                      </button>
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

          {/* Quick Links Footer */}
          <div className="pt-4 border-t border-slate-800/50 mt-4 flex items-center justify-between text-xs overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center gap-4">
              <span className="text-slate-500 font-medium">Quick Searches</span>
              <div className="flex gap-2">
                <button onClick={() => handleQuickSearch('HR Policies')} className="px-3 py-1.5 rounded-full border border-slate-800 hover:border-slate-600 bg-[#13161F] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1">
                  HR Policies <ChevronDown size={12} />
                </button>
                <button onClick={() => handleQuickSearch('IT Security')} className="px-3 py-1.5 rounded-full border border-slate-800 hover:border-slate-600 bg-[#13161F] text-slate-400 hover:text-slate-200 transition-colors">
                  IT Security
                </button>
                <button onClick={() => handleQuickSearch('Finance Reports')} className="px-3 py-1.5 rounded-full border border-slate-800 hover:border-slate-600 bg-[#13161F] text-slate-400 hover:text-slate-200 transition-colors">
                  Finance Reports
                </button>
                <button onClick={() => handleQuickSearch('Employee Handbook')} className="px-3 py-1.5 rounded-full border border-slate-800 hover:border-slate-600 bg-[#13161F] text-slate-400 hover:text-slate-200 transition-colors">
                  Employee Handbook
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 ml-8">
              <span className="text-slate-500 font-medium">Recent</span>
              <div className="flex gap-2">
                <button onClick={() => handleQuickSearch('remote work policy')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800/50 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors">
                  <Clock size={12} /> remote work policy
                </button>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column: Filters Sidebar */}
        <div className="w-[300px] flex flex-col shrink-0 overflow-y-auto scrollbar-thin bg-[#13161F] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Filters</h3>
            <button onClick={handleClearAll} className="text-xs font-medium text-[#6366F1] hover:text-[#7A7DF2] transition-colors">Clear All</button>
          </div>

          <div className="space-y-6">
            
            {/* Search Type */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-slate-400">Search Type</label>
                <HelpCircle size={12} className="text-slate-600" />
              </div>
              <div className="grid grid-cols-3 gap-1 bg-[#0A0C10] p-1 rounded-lg border border-slate-800/50">
                <button 
                  onClick={() => setSearchType('hybrid')}
                  className={`flex flex-col items-center justify-center py-2 rounded-md transition-all ${searchType === 'hybrid' ? 'bg-[#1E2333] border border-[#6366F1]/30 shadow-sm' : 'hover:bg-slate-800/50'}`}
                >
                  <span className={`text-xs font-medium ${searchType === 'hybrid' ? 'text-[#6366F1]' : 'text-slate-400'}`}>Hybrid</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Best of both</span>
                </button>
                <button 
                  onClick={() => setSearchType('semantic')}
                  className={`flex flex-col items-center justify-center py-2 rounded-md transition-all ${searchType === 'semantic' ? 'bg-[#1E2333] border border-[#6366F1]/30 shadow-sm' : 'hover:bg-slate-800/50'}`}
                >
                  <span className={`text-xs font-medium ${searchType === 'semantic' ? 'text-white' : 'text-slate-400'}`}>Semantic</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">AI-powered</span>
                </button>
                <button 
                  onClick={() => setSearchType('keyword')}
                  className={`flex flex-col items-center justify-center py-2 rounded-md transition-all ${searchType === 'keyword' ? 'bg-[#1E2333] border border-[#6366F1]/30 shadow-sm' : 'hover:bg-slate-800/50'}`}
                >
                  <span className={`text-xs font-medium ${searchType === 'keyword' ? 'text-white' : 'text-slate-400'}`}>Keyword</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Exact match</span>
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

            {/* Collections */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Collections</label>
              <div className="relative">
                <select 
                  value={selectedCollection}
                  onChange={e => setSelectedCollection(e.target.value)}
                  className="w-full bg-[#0A0C10] border border-slate-800 text-sm text-slate-300 rounded-lg pl-3 pr-8 py-2.5 appearance-none focus:outline-none focus:border-slate-600"
                >
                  <option value="">All Collections</option>
                  {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors ${docType === 'all' ? 'bg-[#1E2333] border-[#6366F1]/30 text-[#6366F1]' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setDocType('pdf')}
                  className={`py-2 flex items-center justify-center gap-1 text-xs font-medium rounded-lg border transition-colors ${docType === 'pdf' ? 'bg-[#1E2333] border-[#6366F1]/30 text-[#6366F1]' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                  <FileText size={10} className="text-red-400" /> PDF
                </button>
                <button 
                  onClick={() => setDocType('docx')}
                  className={`py-2 flex items-center justify-center gap-1 text-xs font-medium rounded-lg border transition-colors ${docType === 'docx' ? 'bg-[#1E2333] border-[#6366F1]/30 text-[#6366F1]' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                  <FileText size={10} className="text-blue-400" /> DOCX
                </button>
                <button 
                  onClick={() => setDocType('txt')}
                  className={`py-2 flex items-center justify-center gap-1 text-xs font-medium rounded-lg border transition-colors ${docType === 'txt' ? 'bg-[#1E2333] border-[#6366F1]/30 text-[#6366F1]' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
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
            
            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Tags</label>
              <div className="relative">
                <select 
                  value={selectedTag}
                  onChange={e => setSelectedTag(e.target.value)}
                  className="w-full bg-[#0A0C10] border border-slate-800 text-sm text-slate-300 rounded-lg pl-3 pr-8 py-2.5 appearance-none focus:outline-none focus:border-slate-600"
                >
                  <option value="">Select tags</option>
                  <option value="Important">Important</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

          </div>

          <div className="mt-8 pt-4 border-t border-slate-800">
            <button 
              onClick={(e) => {
                toast.success('Filters applied successfully');
                handleSearch(e as any);
              }}
              className="w-full bg-[#6366F1] hover:bg-[#5558DD] text-white py-3 rounded-xl font-medium transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
