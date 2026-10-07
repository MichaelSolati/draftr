import React, {useMemo, useCallback, useState} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
  type OnConnect,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {ClassNode} from './nodes/ClassNode';
import {UINode} from './nodes/UINode';
import {TableNode} from './nodes/TableNode';
import {ApiNode} from './nodes/ApiNode';
import {EventNode} from './nodes/EventNode';
import {StateNode} from './nodes/StateNode';
import {type ArchitectureProject, type DomainType} from '../../types/spec';

const nodeTypes = {
  classNode: ClassNode,
  uiNode: UINode,
  tableNode: TableNode,
  apiNode: ApiNode,
  eventNode: EventNode,
  stateNode: StateNode,
};

interface ArchitectureCanvasProps {
  project: ArchitectureProject;
  onConnectWire: (
    sourceEntity: string,
    sourceMember: string | null,
    targetEntity: string,
    targetMember: string | null
  ) => void;
  onNodeDragStop?: (id: string, position: {x: number; y: number}) => void;
}

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  project,
  onConnectWire,
  onNodeDragStop,
}) => {
  const [activeFilter, setActiveFilter] = useState<DomainType | 'all'>('all');

  // Convert project domain entities to React Flow Nodes
  const nodes: Node[] = useMemo(() => {
    const list: Node[] = [];

    // 1. Classes / Types (Logic)
    if (activeFilter === 'all' || activeFilter === 'logic') {
      project.classes.forEach((cls, idx) => {
        const defaultPos = {
          x: 60 + (idx % 3) * 320,
          y: 60 + Math.floor(idx / 3) * 280,
        };
        list.push({
          id: cls.id,
          type: 'classNode',
          position: cls.position || defaultPos,
          data: cls as unknown as Record<string, unknown>,
        });
      });
    }

    // 2. UI Components
    if (activeFilter === 'all' || activeFilter === 'ui') {
      project.uiComponents.forEach((ui, idx) => {
        const defaultPos = {
          x: 60 + (idx % 3) * 280,
          y: 420 + Math.floor(idx / 3) * 200,
        };
        list.push({
          id: ui.id,
          type: 'uiNode',
          position: ui.position || defaultPos,
          data: ui as unknown as Record<string, unknown>,
        });
      });
    }

    // 3. Database Tables
    if (activeFilter === 'all' || activeFilter === 'database') {
      project.tables?.forEach((tbl, idx) => {
        const defaultPos = {
          x: 60 + (idx % 3) * 300,
          y: 720 + Math.floor(idx / 3) * 240,
        };
        list.push({
          id: tbl.id,
          type: 'tableNode',
          position: tbl.position || defaultPos,
          data: tbl as unknown as Record<string, unknown>,
        });
      });
    }

    // 4. API Routes
    if (activeFilter === 'all' || activeFilter === 'api') {
      project.apiRoutes?.forEach((api, idx) => {
        const defaultPos = {
          x: 1040,
          y: 60 + idx * 240,
        };
        list.push({
          id: api.id,
          type: 'apiNode',
          position: api.position || defaultPos,
          data: api as unknown as Record<string, unknown>,
        });
      });
    }

    // 5. Events
    if (activeFilter === 'all' || activeFilter === 'event') {
      project.events?.forEach((ev, idx) => {
        const defaultPos = {
          x: 1040,
          y: 560 + idx * 140,
        };
        list.push({
          id: ev.id,
          type: 'eventNode',
          position: ev.position || defaultPos,
          data: ev as unknown as Record<string, unknown>,
        });
      });
    }

    // 6. States
    if (activeFilter === 'all' || activeFilter === 'state') {
      project.states?.forEach((st, idx) => {
        const defaultPos = {
          x: 1040,
          y: 840 + idx * 160,
        };
        list.push({
          id: st.id,
          type: 'stateNode',
          position: st.position || defaultPos,
          data: st as unknown as Record<string, unknown>,
        });
      });
    }

    return list;
  }, [
    project.classes,
    project.uiComponents,
    project.tables,
    project.apiRoutes,
    project.events,
    project.states,
    activeFilter,
  ]);

  // Convert project connections to React Flow Edges
  const edges: Edge[] = useMemo(() => {
    const visibleNodeIds = new Set(nodes.map(n => n.id));

    return project.connections
      .filter(
        conn =>
          visibleNodeIds.has(conn.sourceId) && visibleNodeIds.has(conn.targetId)
      )
      .map(conn => {
        const isInvokes = conn.type === 'invokes';
        const isForeignKey = conn.type === 'foreignKey';
        const isEmits = conn.type === 'emits';

        let strokeColor = 'hsl(var(--primary))';
        let isAnimated = isInvokes;
        let dashArray: string | undefined = undefined;
        let edgeLabel = conn.targetMember || '';

        if (conn.type === 'binds') {
          strokeColor = '#0284c7';
          dashArray = '5,5';
          edgeLabel = 'binds';
        } else if (isForeignKey) {
          strokeColor = '#10b981';
          edgeLabel = 'references';
        } else if (isEmits) {
          strokeColor = '#8b5cf6';
          isAnimated = true;
          dashArray = '4,4';
          edgeLabel = 'emits';
        }

        return {
          id: conn.id,
          source: conn.sourceId,
          sourceHandle: conn.sourceMember || undefined,
          target: conn.targetId,
          targetHandle: conn.targetMember || undefined,
          animated: isAnimated,
          type: 'smoothstep',
          style: {
            stroke: strokeColor,
            strokeWidth: 2,
            strokeDasharray: dashArray,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
          },
          label: edgeLabel,
          labelStyle: {fontSize: 10, fill: 'hsl(var(--foreground))'},
          labelBgStyle: {fill: 'hsl(var(--card))'},
        };
      });
  }, [project.connections, nodes]);

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);

      if (sourceNode && targetNode) {
        const sourceName = sourceNode.id.replace(
          /^(entity-|ui-|table-|api-|event-|state-)/,
          ''
        );
        const targetName = targetNode.id.replace(
          /^(entity-|ui-|table-|api-|event-|state-)/,
          ''
        );
        onConnectWire(
          sourceName,
          connection.sourceHandle || null,
          targetName,
          connection.targetHandle || null
        );
      }
    },
    [nodes, onConnectWire]
  );

  const filters: Array<{key: DomainType | 'all'; label: string}> = [
    {key: 'all', label: 'All'},
    {key: 'logic', label: 'Logic'},
    {key: 'ui', label: 'UI'},
    {key: 'database', label: 'Database'},
    {key: 'api', label: 'API'},
    {key: 'event', label: 'Events'},
  ];

  return (
    <div className="h-full w-full bg-background relative">
      {/* Floating Domain Filter Pill Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border rounded-lg p-1 shadow-md">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeFilter === f.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={handleConnect}
        onNodeDragStop={(_, node) => {
          if (onNodeDragStop) {
            onNodeDragStop(node.id, node.position);
          }
        }}
        fitView
        className="bg-dot-pattern"
      >
        <Background gap={16} size={1} />
        <Controls className="!bg-card !border-border !fill-foreground [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground hover:[&>button]:!bg-accent" />
        <MiniMap
          className="!bg-card !border !border-border !rounded-lg overflow-hidden"
          nodeColor={n => {
            if (n.type === 'uiNode') return '#38bdf8';
            if (n.type === 'tableNode') return '#34d399';
            if (n.type === 'apiNode') return '#fbbf24';
            if (n.type === 'eventNode') return '#a78bfa';
            if (n.type === 'stateNode') return '#22d3ee';
            return '#a855f7';
          }}
          maskColor="rgba(0, 0, 0, 0.4)"
        />
      </ReactFlow>
    </div>
  );
};
