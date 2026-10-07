import React, {useMemo, useCallback} from 'react';
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
import {type ArchitectureProject} from '../../types/spec';

const nodeTypes = {
  classNode: ClassNode,
  uiNode: UINode,
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
  // Convert project classes & UI components to React Flow Nodes
  const nodes: Node[] = useMemo(() => {
    const list: Node[] = [];
    let colIndex = 0;
    let rowIndex = 0;

    // Place classes
    project.classes.forEach(cls => {
      const defaultPos = {
        x: 60 + (colIndex % 3) * 320,
        y: 60 + Math.floor(colIndex / 3) * 280,
      };
      colIndex++;

      list.push({
        id: cls.id,
        type: 'classNode',
        position: cls.position || defaultPos,
        data: cls as unknown as Record<string, unknown>,
      });
    });

    // Place UI components
    project.uiComponents.forEach(ui => {
      const defaultPos = {
        x: 60 + (rowIndex % 3) * 280,
        y: 420 + Math.floor(rowIndex / 3) * 180,
      };
      rowIndex++;

      list.push({
        id: ui.id,
        type: 'uiNode',
        position: ui.position || defaultPos,
        data: ui as unknown as Record<string, unknown>,
      });
    });

    return list;
  }, [project.classes, project.uiComponents]);

  // Convert project connections to React Flow Edges
  const edges: Edge[] = useMemo(() => {
    return project.connections.map(conn => {
      const isInvokes = conn.type === 'invokes';
      return {
        id: conn.id,
        source: conn.sourceId,
        sourceHandle: conn.sourceMember || undefined,
        target: conn.targetId,
        targetHandle: conn.targetMember || undefined,
        animated: isInvokes,
        type: 'smoothstep',
        style: {
          stroke: isInvokes ? 'hsl(var(--primary))' : '#0284c7',
          strokeWidth: 2,
          strokeDasharray: isInvokes ? undefined : '5,5',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isInvokes ? 'hsl(var(--primary))' : '#0284c7',
        },
        label: isInvokes ? conn.targetMember : 'binds',
        labelStyle: {fontSize: 10, fill: 'hsl(var(--foreground))'},
        labelBgStyle: {fill: 'hsl(var(--card))'},
      };
    });
  }, [project.connections]);

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);

      if (sourceNode && targetNode) {
        const sourceName = sourceNode.id.replace(/^(entity-|ui-)/, '');
        const targetName = targetNode.id.replace(/^(entity-|ui-)/, '');
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

  return (
    <div className="h-full w-full bg-background relative">
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
          nodeColor={n => (n.type === 'uiNode' ? '#38bdf8' : '#a855f7')}
          maskColor="rgba(0, 0, 0, 0.4)"
        />
      </ReactFlow>
    </div>
  );
};
