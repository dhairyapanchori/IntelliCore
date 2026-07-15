import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useHierarchyStore } from '../store/hierarchyStore';
import { Network } from 'lucide-react';

export default function KnowledgeGraph() {
  const { organizations, selectedOrgId, workspaces, departments, collections } = useHierarchyStore();
  const currentOrg = organizations.find(o => o.id === selectedOrgId);
  const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Resize observer for the graph container
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
    if (!currentOrg) return;

    // Build the graph locally from the hierarchy store to save an API call
    const nodes: any[] = [];
    const links: any[] = [];

    // Root node (Org)
    nodes.push({ id: `org-${currentOrg.id}`, name: currentOrg.name, group: 'org', val: 30, color: '#6366f1' });

    workspaces.forEach(ws => {
      nodes.push({ id: `ws-${ws.id}`, name: ws.name, group: 'workspace', val: 20, color: '#8b5cf6' });
      links.push({ source: `org-${ws.organization_id}`, target: `ws-${ws.id}` });
    });

    departments.forEach(dept => {
      nodes.push({ id: `dept-${dept.id}`, name: dept.name, group: 'department', val: 15, color: '#ec4899' });
      links.push({ source: `ws-${dept.workspace_id}`, target: `dept-${dept.id}` });
    });

    collections.forEach(col => {
      nodes.push({ id: `col-${col.id}`, name: col.name, group: 'collection', val: 10, color: '#3b82f6' });
      links.push({ source: `dept-${col.department_id}`, target: `col-${col.id}` });
    });

    setGraphData({ nodes, links });
  }, [currentOrg, workspaces, departments, collections]);

  return (
    <div className="flex-1 flex flex-col p-8 bg-slate-50 dark:bg-[#0F172A]">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Knowledge Graph</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Visualize the relationships between your enterprise data silos.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="w-3 h-3 rounded-full bg-[#6366f1]"></span> Org
            <span className="w-3 h-3 rounded-full bg-[#8b5cf6] ml-2"></span> Workspace
            <span className="w-3 h-3 rounded-full bg-[#ec4899] ml-2"></span> Dept
            <span className="w-3 h-3 rounded-full bg-[#3b82f6] ml-2"></span> Collection
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative"
      >
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(node: any) => node.color}
            nodeRelSize={1}
            linkColor={() => 'rgba(148, 163, 184, 0.2)'}
            linkWidth={1.5}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <Network size={48} className="mb-4 opacity-50" />
            <p>Insufficient data to build graph.</p>
          </div>
        )}
      </div>
    </div>
  );
}
