import React, {memo} from 'react';
import {Handle, Position, type NodeProps} from '@xyflow/react';
import {Layout, Link2} from 'lucide-react';
import {type UIComponentSpec} from '@arch-spec/core';

export const UINode: React.FC<NodeProps> = memo(({data}) => {
  const spec = data as unknown as UIComponentSpec;

  return (
    <div className="min-w-[200px] rounded-lg border-2 border-dashed border-sky-500/40 bg-sky-950/10 dark:bg-sky-950/20 text-card-foreground shadow-sm transition-shadow hover:shadow-md font-sans text-xs overflow-hidden backdrop-blur-sm">
      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-sky-500/20 bg-sky-500/10 px-3 py-2">
        <div className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
          <Layout className="h-3.5 w-3.5" />
          <span>{spec.name}</span>
        </div>
        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-300 uppercase">
          UI
        </span>
      </div>

      <div className="p-3 space-y-2">
        {spec.parentId && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span>Child of:</span>
            <span className="font-semibold text-foreground">
              {spec.parentId.replace(/^ui-/, '')}
            </span>
          </div>
        )}

        {spec.boundLogicEntities && spec.boundLogicEntities.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Link2 className="h-3 w-3 text-sky-500" />
              <span>Bound Services</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {spec.boundLogicEntities.map((service, idx) => (
                <span
                  key={`service-${idx}`}
                  className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !bg-sky-500 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !bg-sky-500 !border-2 !border-background"
      />
    </div>
  );
});

UINode.displayName = 'UINode';
