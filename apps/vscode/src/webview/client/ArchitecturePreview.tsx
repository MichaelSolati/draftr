import '@xyflow/react/dist/style.css';

import dagre from '@dagrejs/dagre';
import {type ArchitectureProject} from '@draftr/core';
import {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import React, {useCallback, useEffect, useState} from 'react';

declare const acquireVsCodeApi: () => {
  postMessage: (msg: unknown) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
};

let vscodeApi: ReturnType<typeof acquireVsCodeApi> | null = null;
try {
  vscodeApi = acquireVsCodeApi();
} catch {
  // Running outside VS Code webview (e.g. browser preview or test)
}

function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): Record<string, {x: number; y: number}> {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach(node => {
    dagreGraph.setNode(node.id, {width: 260, height: 160});
  });

  edges.forEach(edge => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const positions: Record<string, {x: number; y: number}> = {};
  nodes.forEach(node => {
    const layouted = dagreGraph.node(node.id);
    if (layouted) {
      positions[node.id] = {
        x: Math.round(layouted.x - 130),
        y: Math.round(layouted.y - 80),
      };
    }
  });

  return positions;
}

export const ArchitecturePreview: React.FC = () => {
  const [project, setProject] = useState<ArchitectureProject | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');

  // Convert ArchitectureProject into React Flow nodes and edges
  const updateGraph = useCallback(
    (proj: ArchitectureProject, dir: 'TB' | 'LR') => {
      const generatedNodes: Node[] = [];
      const generatedEdges: Edge[] = [];

      // 1. Classes & Interfaces
      (proj.classes || []).forEach(cls => {
        const methodsCount = cls.methods?.length || 0;
        const propsCount = cls.properties?.length || 0;
        const subLabel =
          cls.kind === 'interface'
            ? 'interface'
            : cls.kind === 'abstract'
              ? 'abstract class'
              : 'class';

        generatedNodes.push({
          id: cls.id,
          type: 'default',
          position: {x: 0, y: 0},
          data: {
            label: (
              <div className="draftr-node node-class">
                <div className="node-badge badge-class">{subLabel}</div>
                <div className="node-title">{cls.name}</div>
                <div className="node-meta">
                  {propsCount} prop(s) • {methodsCount} method(s)
                </div>
              </div>
            ),
          },
        });
      });

      // 2. UI Components
      (proj.uiComponents || []).forEach(ui => {
        generatedNodes.push({
          id: ui.id,
          type: 'default',
          position: {x: 0, y: 0},
          data: {
            label: (
              <div className="draftr-node node-ui">
                <div className="node-badge badge-ui">ui</div>
                <div className="node-title">{ui.name}</div>
                <div className="node-meta">
                  {ui.boundLogicEntities?.length || 0} bound service(s)
                </div>
              </div>
            ),
          },
        });
      });

      // 3. Database Tables
      (proj.tables || []).forEach(tbl => {
        generatedNodes.push({
          id: tbl.id,
          type: 'default',
          position: {x: 0, y: 0},
          data: {
            label: (
              <div className="draftr-node node-table">
                <div className="node-badge badge-table">db</div>
                <div className="node-title">{tbl.name}</div>
                <div className="node-meta">
                  {tbl.columns?.length || 0} column(s)
                </div>
              </div>
            ),
          },
        });
      });

      // 4. API Routes
      (proj.apiRoutes || []).forEach(api => {
        generatedNodes.push({
          id: api.id,
          type: 'default',
          position: {x: 0, y: 0},
          data: {
            label: (
              <div className="draftr-node node-api">
                <div className="node-badge badge-api">api</div>
                <div className="node-title">{api.path}</div>
                <div className="node-meta">
                  {api.endpoints?.length || 0} endpoint(s)
                </div>
              </div>
            ),
          },
        });
      });

      // 5. Events
      (proj.events || []).forEach(ev => {
        generatedNodes.push({
          id: ev.id,
          type: 'default',
          position: {x: 0, y: 0},
          data: {
            label: (
              <div className="draftr-node node-event">
                <div className="node-badge badge-event">event</div>
                <div className="node-title">{ev.name}</div>
                <div className="node-meta">{ev.payloadType || 'void'}</div>
              </div>
            ),
          },
        });
      });

      // 6. Connections -> Edges
      (proj.connections || []).forEach(conn => {
        const edgeColor =
          conn.type === 'binds'
            ? '#3b82f6'
            : conn.type === 'emits'
              ? '#f43f5e'
              : conn.type === 'foreignKey'
                ? '#10b981'
                : conn.type === 'inherits' || conn.type === 'implements'
                  ? '#a855f7'
                  : '#8b5cf6';

        generatedEdges.push({
          id: conn.id,
          source: conn.sourceId,
          target: conn.targetId,
          animated: conn.type === 'invokes' || conn.type === 'binds',
          label: conn.type,
          style: {stroke: edgeColor, strokeWidth: 2},
        });
      });

      // Apply auto layout
      const positions = layoutGraph(generatedNodes, generatedEdges, dir);
      const positionedNodes = generatedNodes.map(n => ({
        ...n,
        position: positions[n.id] || {x: 0, y: 0},
      }));

      setNodes(positionedNodes);
      setEdges(generatedEdges);
    },
    [setNodes, setEdges]
  );

  // Listen to messages from VS Code extension host
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === 'sync' && message.project) {
        setProject(message.project);
        updateGraph(message.project, direction);
      }
    };

    window.addEventListener('message', handleMessage);
    // Request initial sync
    vscodeApi?.postMessage({type: 'ready'});

    return () => window.removeEventListener('message', handleMessage);
  }, [updateGraph, direction]);

  const toggleDirection = () => {
    const newDir = direction === 'TB' ? 'LR' : 'TB';
    setDirection(newDir);
    if (project) {
      updateGraph(project, newDir);
    }
  };

  return (
    <div className="draftr-preview-container">
      <div className="draftr-toolbar">
        <span className="toolbar-title">Draftr Architecture Preview</span>
        <div className="toolbar-actions">
          <button
            type="button"
            className="toolbar-btn"
            onClick={toggleDirection}
            title="Toggle Layout Direction (Top-Bottom / Left-Right)"
          >
            Layout: {direction}
          </button>
          {project && (
            <span className="toolbar-stats">
              {nodes.length} entities • {edges.length} edges
            </span>
          )}
        </div>
      </div>
      <div className="canvas-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background
            color="var(--vscode-editor-lineHighlightBackground, #2d3748)"
            gap={16}
          />
          <Controls />
          <MiniMap
            nodeColor="#8b5cf6"
            maskColor="rgba(0, 0, 0, 0.4)"
            style={{background: 'var(--vscode-editor-background, #1e1e1e)'}}
          />
        </ReactFlow>
      </div>
    </div>
  );
};
