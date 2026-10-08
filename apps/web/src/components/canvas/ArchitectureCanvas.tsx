import React, {useMemo, useCallback, useState, useEffect} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnConnect,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Maximize2,
  Focus,
  Box,
  Database,
  Globe,
  Zap,
  Layout,
  Layers,
  Sparkles,
} from 'lucide-react';
import {computeAutoLayout, type LayoutDirection} from './layout';
import {ClassNode} from './nodes/ClassNode';
import {UINode} from './nodes/UINode';
import {useTheme} from '../theme/ThemeProvider';
import {TableNode} from './nodes/TableNode';
import {ApiNode} from './nodes/ApiNode';
import {EventNode} from './nodes/EventNode';
import {StateNode} from './nodes/StateNode';
import {type ArchitectureProject, type DomainType} from '@draftr/core';
import {extractEntityRawSnippet} from '@draftr/core';

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
  onAutoLayout?: (positions: Record<string, {x: number; y: number}>) => void;
  onSelectEntity?: (entityId: string | null) => void;
  onUpdateEntityText?: (entityName: string, newSnippet: string) => void;
  onInsertSnippet?: (snippet: string) => void;
  selectedEntityId?: string | null;
}

interface ContextMenuState {
  x: number;
  y: number;
  flowX?: number;
  flowY?: number;
}

const InnerCanvas: React.FC<ArchitectureCanvasProps> = ({
  project,
  onConnectWire,
  onNodeDragStop,
  onAutoLayout,
  onSelectEntity,
  onUpdateEntityText,
  onInsertSnippet,
  selectedEntityId,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  // Multi-select active filters (empty or including 'all' means all enabled)
  const [activeFilters, setActiveFilters] = useState<Set<DomainType>>(
    new Set<DomainType>(['logic', 'ui', 'database', 'api', 'event', 'state'])
  );
  const [isAllSelected, setIsAllSelected] = useState(true);
  const {fitView, setCenter, screenToFlowPosition} = useReactFlow();
  const {resolvedTheme} = useTheme();

  const isDomainVisible = useCallback(
    (domain: DomainType) => {
      if (isAllSelected) return true;
      return activeFilters.has(domain);
    },
    [isAllSelected, activeFilters]
  );

  // Convert project domain entities to React Flow Nodes
  const computedNodes: Node[] = useMemo(() => {
    const list: Node[] = [];

    // 1. Classes / Types (Logic)
    if (isDomainVisible('logic')) {
      project.classes.forEach((cls, idx) => {
        const defaultPos = {
          x: 60 + (idx % 3) * 320,
          y: 60 + Math.floor(idx / 3) * 280,
        };
        const rawSnippet =
          extractEntityRawSnippet(project.rawOutlineText, cls.name) ||
          undefined;

        list.push({
          id: cls.id,
          type: 'classNode',
          position: cls.position || defaultPos,
          data: {
            ...cls,
            rawSnippet,
            project,
            onSelectEntity,
            onUpdateText: onUpdateEntityText,
          } as unknown as Record<string, unknown>,
          selected: selectedEntityId === cls.id,
        });
      });
    }

    // 2. UI Components
    if (isDomainVisible('ui')) {
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
          selected: selectedEntityId === ui.id,
        });
      });
    }

    // 3. Database Tables
    if (isDomainVisible('database')) {
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
          selected: selectedEntityId === tbl.id,
        });
      });
    }

    // 4. API Routes
    if (isDomainVisible('api')) {
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
          selected: selectedEntityId === api.id,
        });
      });
    }

    // 5. Events
    if (isDomainVisible('event')) {
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
          selected: selectedEntityId === ev.id,
        });
      });
    }

    // 6. States
    if (isDomainVisible('state')) {
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
          selected: selectedEntityId === st.id,
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
    project.rawOutlineText,
    project,
    isDomainVisible,
    onUpdateEntityText,
    onSelectEntity,
    selectedEntityId,
  ]);

  // Convert project connections to React Flow Edges
  const computedEdges: Edge[] = useMemo(() => {
    const visibleNodeIds = new Set(computedNodes.map(n => n.id));

    return project.connections
      .filter(
        conn =>
          visibleNodeIds.has(conn.sourceId) && visibleNodeIds.has(conn.targetId)
      )
      .map(conn => {
        const isInvokes = conn.type === 'invokes';
        const isForeignKey = conn.type === 'foreignKey';
        const isEmits = conn.type === 'emits';

        let strokeColor = '#f59e0b';
        let isAnimated = isInvokes;
        let dashArray: string | undefined = undefined;
        let edgeLabel = '';

        if (conn.type === 'inherits') {
          strokeColor = '#a855f7';
          edgeLabel = 'extends';
          isAnimated = false;
        } else if (conn.type === 'implements') {
          strokeColor = '#06b6d4';
          dashArray = '5,5';
          edgeLabel = 'implements';
          isAnimated = false;
        } else if (conn.type === 'binds') {
          strokeColor = '#0284c7';
          dashArray = '5,5';
          edgeLabel = 'binds';
          isAnimated = false;
        } else if (isForeignKey) {
          strokeColor = '#10b981';
          edgeLabel = conn.targetMember
            ? `fk → ${conn.targetMember}`
            : 'references';
          isAnimated = false;
        } else if (isEmits) {
          strokeColor = '#8b5cf6';
          isAnimated = true;
          dashArray = '4,4';
          edgeLabel = conn.targetMember
            ? `emits → ${conn.targetMember}()`
            : 'emits';
        } else if (isInvokes) {
          strokeColor = '#0284c7';
          dashArray = '5,5';
          edgeLabel = 'calls';
          isAnimated = false;
        }

        // Validate and resolve sourceHandle if present
        let sourceHandle: string | undefined = undefined;
        if (conn.sourceMember) {
          if (conn.sourceId.startsWith('entity-')) {
            const cls = project.classes?.find(c => c.id === conn.sourceId);
            if (cls) {
              const hasMeth = cls.methods?.some(
                m => m.name === conn.sourceMember
              );
              const hasProp = cls.properties?.some(
                p => p.name === conn.sourceMember
              );
              if (hasMeth || hasProp) sourceHandle = conn.sourceMember;
            }
          } else if (conn.sourceId.startsWith('table-')) {
            const tbl = project.tables?.find(t => t.id === conn.sourceId);
            if (tbl && tbl.columns?.some(c => c.name === conn.sourceMember)) {
              sourceHandle = conn.sourceMember;
            }
          }
        }

        // Validate and resolve targetHandle if present
        let targetHandle: string | undefined = undefined;
        if (conn.targetMember) {
          if (conn.targetId.startsWith('entity-')) {
            const cls = project.classes?.find(c => c.id === conn.targetId);
            if (cls) {
              const hasMeth = cls.methods?.some(
                m => m.name === conn.targetMember
              );
              const hasProp = cls.properties?.some(
                p => p.name === conn.targetMember
              );
              if (hasMeth || hasProp) targetHandle = conn.targetMember;
            }
          } else if (conn.targetId.startsWith('table-')) {
            const tbl = project.tables?.find(t => t.id === conn.targetId);
            if (tbl && tbl.columns?.some(c => c.name === conn.targetMember)) {
              targetHandle = conn.targetMember;
            }
          }
        }

        return {
          id: conn.id,
          source: conn.sourceId,
          sourceHandle,
          target: conn.targetId,
          targetHandle,
          animated: isAnimated,
          type: 'smoothstep',
          pathOptions: {
            borderRadius: 16,
            offset: 20,
          },
          style: {
            stroke: strokeColor,
            strokeWidth: 2,
            strokeDasharray: dashArray,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 14,
            height: 14,
          },
          label: edgeLabel,
          labelStyle: {
            fontSize: 10,
            fontWeight: 600,
            fill: 'hsl(var(--foreground))',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
          labelBgStyle: {
            fill: 'hsl(var(--card))',
            fillOpacity: 0.95,
            stroke: strokeColor,
            strokeWidth: 1,
            rx: 4,
            ry: 4,
          },
          labelBgPadding: [6, 3] as [number, number],
        };
      });
  }, [project.connections, computedNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  // Sync internal nodes state whenever outline changes or filter changes
  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes, setNodes]);

  useEffect(() => {
    setEdges(computedEdges);
  }, [computedEdges, setEdges]);

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

  const handleCenterContent = useCallback(() => {
    fitView({padding: 0.2, duration: 800});
  }, [fitView]);

  const handleCenterSelected = useCallback(() => {
    if (!selectedEntityId) {
      fitView({padding: 0.2, duration: 800});
      return;
    }
    const node = nodes.find(n => n.id === selectedEntityId);
    if (node) {
      setCenter(node.position.x + 120, node.position.y + 100, {
        zoom: 1.1,
        duration: 800,
      });
    }
  }, [selectedEntityId, nodes, setCenter, fitView]);

  const handleAutoLayout = useCallback(
    (direction: LayoutDirection = 'TB') => {
      const layouted = computeAutoLayout(nodes, edges, {direction});
      if (onAutoLayout) {
        onAutoLayout(layouted);
      }
      setTimeout(() => {
        fitView({padding: 0.2, duration: 600});
      }, 50);
    },
    [nodes, edges, onAutoLayout, fitView]
  );

  const filters: Array<{key: DomainType | 'all'; label: string}> = [
    {key: 'all', label: 'All'},
    {key: 'logic', label: 'Logic'},
    {key: 'ui', label: 'UI'},
    {key: 'database', label: 'Database'},
    {key: 'api', label: 'API'},
    {key: 'event', label: 'Events'},
  ];

  const handleToggleFilter = (key: DomainType | 'all') => {
    if (key === 'all') {
      setIsAllSelected(true);
      setActiveFilters(
        new Set<DomainType>([
          'logic',
          'ui',
          'database',
          'api',
          'event',
          'state',
        ])
      );
      return;
    }

    if (isAllSelected) {
      // Switching from "all" to a specific filter: select only that key
      setIsAllSelected(false);
      setActiveFilters(new Set<DomainType>([key]));
      return;
    }

    const next = new Set<DomainType>(activeFilters);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    // If all individual items selected or none selected, revert to all
    if (next.size === 0 || next.size === 6) {
      setIsAllSelected(true);
      setActiveFilters(
        new Set<DomainType>([
          'logic',
          'ui',
          'database',
          'api',
          'event',
          'state',
        ])
      );
    } else {
      setIsAllSelected(false);
      setActiveFilters(next);
    }
  };

  return (
    <div className="h-full w-full bg-background relative select-none">
      {/* Floating Domain Filter Pill Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border rounded-lg p-1 shadow-md">
        {filters.map(f => {
          const isSelected =
            f.key === 'all'
              ? isAllSelected
              : !isAllSelected && activeFilters.has(f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => handleToggleFilter(f.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Floating Canvas Controls: Auto Layout, Center to Content & Focus Selected */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-card/90 backdrop-blur-md border border-border rounded-lg p-1 shadow-md">
        <button
          type="button"
          onClick={() => handleAutoLayout('TB')}
          title="Auto-organize layout (Hierarchical)"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-foreground hover:bg-accent transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Auto Layout</span>
        </button>
        <button
          type="button"
          onClick={handleCenterContent}
          title="Center to Content"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-foreground hover:bg-accent transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5 text-primary" />
          <span>Center to Content</span>
        </button>
        {selectedEntityId && (
          <button
            type="button"
            onClick={handleCenterSelected}
            title="Focus Selected Entity"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Focus className="h-3.5 w-3.5" />
            <span>Focus</span>
          </button>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={resolvedTheme}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => {
          setContextMenu(null);
          if (onSelectEntity) onSelectEntity(node.id);
        }}
        onPaneClick={() => {
          setContextMenu(null);
          if (onSelectEntity) onSelectEntity(null);
        }}
        onPaneContextMenu={e => {
          e.preventDefault();
          const flowPos = screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            flowX: Math.round(flowPos.x),
            flowY: Math.round(flowPos.y),
          });
        }}
        onNodeDragStop={(_, node) => {
          if (onNodeDragStop) {
            onNodeDragStop(node.id, node.position);
          }
        }}
        fitView
        fitViewOptions={{padding: 0.2, duration: 600}}
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

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 260),
            left: Math.min(contextMenu.x, window.innerWidth - 220),
          }}
          className="fixed z-50 min-w-[200px] rounded-lg border border-border bg-popover/95 backdrop-blur-md p-1.5 shadow-xl text-popover-foreground text-xs animate-in fade-in zoom-in-95 duration-100"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-1">
            Insert Entity
          </div>

          <button
            type="button"
            onClick={() => {
              const name = `Service_${Date.now().toString().slice(-4)}`;
              onInsertSnippet?.(`\nclass ${name}\n  + execute(): void\n`);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
          >
            <Box className="h-3.5 w-3.5 text-purple-500" />
            <div className="flex flex-col">
              <span className="font-medium">Class / Service</span>
              <span className="text-[10px] text-muted-foreground">
                Logic & methods
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const name = `Table_${Date.now().toString().slice(-4)}`;
              onInsertSnippet?.(
                `\ndb ${name}\n  + id: uuid pk\n  + name: string\n`
              );
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
          >
            <Database className="h-3.5 w-3.5 text-emerald-500" />
            <div className="flex flex-col">
              <span className="font-medium">Database Table</span>
              <span className="text-[10px] text-muted-foreground">
                Columns, PK, FK
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const route = `/resource_${Date.now().toString().slice(-4)}`;
              onInsertSnippet?.(
                `\napi /api/v1${route}\n  + GET /list(): Item[]\n`
              );
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-amber-500" />
            <div className="flex flex-col">
              <span className="font-medium">REST API Route</span>
              <span className="text-[10px] text-muted-foreground">
                Endpoints & handlers
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const name = `View_${Date.now().toString().slice(-4)}`;
              onInsertSnippet?.(`\nui ${name}\n  ui Content\n`);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
          >
            <Layout className="h-3.5 w-3.5 text-sky-500" />
            <div className="flex flex-col">
              <span className="font-medium">UI Component</span>
              <span className="text-[10px] text-muted-foreground">
                DOM hierarchy & binds
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const name = `Event_${Date.now().toString().slice(-4)}`;
              onInsertSnippet?.(`\nevent ${name}(Payload)\n`);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
          >
            <Zap className="h-3.5 w-3.5 text-violet-500" />
            <div className="flex flex-col">
              <span className="font-medium">Event Stream</span>
              <span className="text-[10px] text-muted-foreground">
                Pub/sub messaging
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const name = `State_${Date.now().toString().slice(-4)}`;
              onInsertSnippet?.(
                `\nstate ${name}\n  + data: Record<string, any>\n`
              );
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-cyan-500" />
            <div className="flex flex-col">
              <span className="font-medium">State Slice</span>
              <span className="text-[10px] text-muted-foreground">
                Client state store
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = props => {
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} />
    </ReactFlowProvider>
  );
};
