import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Loader2 } from 'lucide-react';

const GraphView = ({ onSelectNote }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/graph');
        if (res.ok) {
          const data = await res.json();
          setGraphData(data);
        }
      } catch (e) {
        console.error("Failed to fetch graph data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    setTimeout(updateDimensions, 100);

    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-10);
      fgRef.current.d3Force('link').distance(40);
      fgRef.current.d3Force('center').strength(0.2);
      fgRef.current.zoom(2, 500);
    }
  }, [graphData]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-editor)] text-[var(--text-muted)]">
        <Loader2 size={32} className="animate-spin text-[var(--text-accent)] mb-4" />
        <p className="text-sm">Cargando red de conocimiento...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-[var(--bg-editor)] overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] shadow-sm">
        <span className="font-semibold text-[var(--text-accent)]">{graphData.nodes.length}</span> notas, 
        <span className="font-semibold text-[var(--accent)] ml-1">{graphData.links.length}</span> conexiones
      </div>
      
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel=""
          linkColor={() => 'rgba(156, 163, 175, 0.2)'}
          backgroundColor="transparent"
          onNodeClick={node => {
            if (onSelectNote) onSelectNote(node.id + '.md');
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.group === 1 ? '#a855f7' : '#6b7280';
            ctx.fill();

            if (globalScale >= 1.3) {
              const label = node.id;
              const fontSize = 16 / globalScale;

              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#e2e8f0'; 
              ctx.fillText(label, node.x, node.y + 6 + (fontSize / 2));
            }
          }}
        />
      )}
    </div>
  );
};

export default GraphView;
