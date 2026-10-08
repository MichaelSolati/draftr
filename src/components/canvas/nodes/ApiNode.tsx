import React, {memo} from 'react';
import {Handle, Position, type NodeProps} from '@xyflow/react';
import {Globe} from 'lucide-react';
import {type ApiRouteSpec, type HttpMethod} from '../../../types/spec';

function renderMethodBadge(method: HttpMethod) {
  let color = 'bg-muted text-muted-foreground';
  switch (method) {
    case 'GET':
      color =
        'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      break;
    case 'POST':
      color =
        'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30';
      break;
    case 'PUT':
    case 'PATCH':
      color =
        'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      break;
    case 'DELETE':
      color =
        'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30';
      break;
  }
  return (
    <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${color}`}>
      {method}
    </span>
  );
}

export const ApiNode: React.FC<NodeProps> = memo(({data}) => {
  const spec = data as unknown as ApiRouteSpec;

  return (
    <div className="relative min-w-[240px] rounded-lg border border-amber-500/30 bg-card text-card-foreground shadow-md transition-shadow hover:shadow-lg font-sans text-xs overflow-visible">
      {/* Node-level Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !bg-amber-500/50 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !bg-amber-500/50 !border-2 !border-background"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-3 py-2 rounded-t-lg">
        <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
          <Globe className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] truncate">{spec.path}</span>
        </div>
        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
          API
        </span>
      </div>

      {/* Endpoints List */}
      <div className="p-2 space-y-1.5 bg-background/50 rounded-b-lg">
        {spec.endpoints && spec.endpoints.length > 0 ? (
          spec.endpoints.map((ep, idx) => (
            <div
              key={`ep-${idx}`}
              className="relative flex items-center justify-between py-1 px-1 font-mono text-[11px] group rounded hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {renderMethodBadge(ep.method)}
                <span className="text-foreground font-medium">{ep.name}</span>
              </div>

              {ep.responseType && (
                <span className="text-[10px] text-muted-foreground">
                  {ep.responseType}
                </span>
              )}

              {/* Source Handle (connects to backend service) */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${ep.method} ${ep.name}`}
                className="!h-2.5 !w-2.5 !bg-amber-500 !border-2 !border-background transition-transform group-hover:scale-150 shadow-sm"
                style={{right: -5}}
                title={`Endpoint: ${ep.method} ${ep.name}`}
              />
            </div>
          ))
        ) : (
          <div className="text-[10px] text-muted-foreground italic px-1">
            No endpoints
          </div>
        )}
      </div>
    </div>
  );
});

ApiNode.displayName = 'ApiNode';
