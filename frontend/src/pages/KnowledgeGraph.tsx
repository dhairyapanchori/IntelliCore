import { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useHierarchyStore } from '../store/hierarchyStore';
import api from '../lib/api';
import { 
  Network, Search, Filter, Download, ZoomIn, ZoomOut, 
  Maximize, X, FileText, Users, Building, Tag, Layers, Briefcase
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GraphNode {
  id: string;
  name: string;
  type: string;
  val: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
}

export default function KnowledgeGraph() {
  const { selectedOrgId } = useHierarchyStore();
  const [graphData, setGraphData] = useState<{nodes: GraphNode[], links: GraphLink[]}>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    async function fetchGraph() {
      if (!selectedOrgId) return;
      try {
        const res = await api.get(`/graph?organization_id=${selectedOrgId}`);
        setGraphData(res.data);
      } catch (err) {
        console.error("Failed to load graph", err);
      }
    }
    fetchGraph();
  }, [selectedOrgId]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'Organization': return '#6366f1'; // Indigo
      case 'Workspace': return '#8b5cf6'; // Purple
      case 'Department': return '#ec4899'; // Pink
      case 'Collection': return '#3b82f6'; // Blue
      case 'Document': return '#10b981'; // Emerald
      case 'Topic': return '#f59e0b'; // Amber
      default: return '#94a3b8';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'Organization': return Building;
      case 'Workspace': return Briefcase;
      case 'Department': return Users;
      case 'Collection': return Layers;
      case 'Document': return FileText;
      case 'Topic': return Tag;
      default: return Network;
    }
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    
    if (fgRef.current) {
      // Center and zoom in on the node
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(2.5, 2000);
    }
  }, []);

  const handleZoomIn = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom * 1.5, 400);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom / 1.5, 400);
    }
  };

  const handleFitView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 20);
    }
  };

  // Node canvas drawing
  const drawNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12/globalScale;
    ctx.font = `${fontSize}px Inter, sans-serif`;
    
    // Draw Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node.type);
    ctx.fill();
    
    // Draw border if selected
    if (selectedNode && selectedNode.id === node.id) {
      ctx.lineWidth = 2 / globalScale;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
    
    // Draw Text below node
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(label, node.x, node.y + node.val + (8/globalScale));
  };

  // Link canvas drawing
  const drawLink = (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.lineWidth = 1 / globalScale;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.stroke();
    
    // Draw label
    if (globalScale > 1.5) { // Only show link labels when zoomed in
      const x = link.source.x + (link.target.x - link.source.x) / 2;
      const y = link.source.y + (link.target.y - link.source.y) / 2;
      ctx.font = `${8/globalScale}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.fillText(link.label, x, y);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] overflow-hidden text-slate-300">
      
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0A0C10]/90 backdrop-blur-md sticky top-0 z-10 px-8 py-6 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Knowledge Graph</h1>
            <p className="text-slate-400 text-sm mt-1">Visualize relationships between entities across your enterprise knowledge.</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search entities, topics..." 
                className="bg-[#13161F] border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 w-64 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-[#13161F] border border-slate-800 px-4 py-2 rounded-lg">
              <Filter size={14} /> Filters
            </button>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Graph Controls & Legend */}
        <div className="flex justify-between items-center mt-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-[#13161F] border border-slate-800 rounded-lg p-1">
              <button onClick={handleFitView} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Fit View"><Maximize size={16}/></button>
              <button onClick={handleZoomIn} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Zoom In"><ZoomIn size={16}/></button>
              <button onClick={handleZoomOut} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Zoom Out"><ZoomOut size={16}/></button>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]"></span> Organization</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]"></span> Workspace</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#ec4899]"></span> Department</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span> Collection</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> Document</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Topic</div>
            </div>
          </div>
          
          <div className="flex gap-8 text-right">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Entities</div>
              <div className="text-xl font-bold text-white">{graphData.nodes.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Relationships</div>
              <div className="text-xl font-bold text-white">{graphData.links.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Main Graph Area */}
        <div ref={containerRef} className="flex-1 bg-[#0F1117] relative">
          {graphData.nodes.length > 0 ? (
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel={() => ''} // Handled by custom render
              nodeRelSize={1}
              nodeCanvasObject={drawNode}
              linkCanvasObject={drawLink}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              onNodeClick={handleNodeClick}
              cooldownTicks={100} // Stop simulation early to stabilize quickly
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Network size={48} className="mb-4 opacity-30" />
              <p>No knowledge graph data available.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Entity Details */}
        {selectedNode && (
          <div className="w-80 border-l border-slate-800 bg-[#0A0C10] flex flex-col absolute right-0 top-0 bottom-0 shadow-2xl z-20 animate-in slide-in-from-right">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${getNodeColor(selectedNode.type)}20`, color: getNodeColor(selectedNode.type) }}
                >
                  {(() => {
                    const Icon = getNodeIcon(selectedNode.type);
                    return <Icon size={24} />;
                  })()}
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <h2 className="text-xl font-bold text-white mb-1 leading-tight">{selectedNode.name}</h2>
              <div className="flex items-center gap-2">
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${getNodeColor(selectedNode.type)}20`, color: getNodeColor(selectedNode.type), border: `1px solid ${getNodeColor(selectedNode.type)}40` }}
                >
                  {selectedNode.type}
                </span>
                <span className="text-xs text-slate-500">ID: {selectedNode.id}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Entity Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Type</span>
                    <span className="text-white font-medium">{selectedNode.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Connections</span>
                    <span className="text-white font-medium">
                      {graphData.links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id || (typeof l.source === 'object' && (l.source as any).id === selectedNode.id) || (typeof l.target === 'object' && (l.target as any).id === selectedNode.id)).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Weight</span>
                    <span className="text-white font-medium">{selectedNode.val}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-sm text-slate-300">Entity indexed via Document Analysis</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDistanceToNow(new Date(), { addSuffix: true })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-sm text-slate-300">New relationship detected</p>
                      <p className="text-xs text-slate-500 mt-0.5">2 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
