import {type StateSpec} from '@draftr/core';
import {type NodeProps} from '@xyflow/react';
import {Layers} from 'lucide-react';
import React, {memo} from 'react';

export const StateNode: React.FC<NodeProps> = memo(({data}) => {
  const spec = data as unknown as StateSpec;

  return (
    <div className="min-w-[200px] rounded-lg border border-cyan-500/40 bg-card text-card-foreground shadow-md transition-shadow hover:shadow-lg font-sans text-xs overflow-hidden">
      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 bg-cyan-500/10 px-3 py-2">
        <div className="flex items-center gap-1.5 font-semibold text-cyan-600 dark:text-cyan-400">
          <Layers className="h-3.5 w-3.5" />
          <span>{spec.name}</span>
        </div>
        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300 uppercase">
          State
        </span>
      </div>

      <div className="p-2 space-y-1 bg-background/50 font-mono text-[11px]">
        {spec.fields && spec.fields.length > 0 ? (
          spec.fields.map((f, idx) => (
            <div
              key={`field-${idx}`}
              className="flex justify-between py-0.5 px-1"
            >
              <span className="text-foreground">{f.name}</span>
              <span className="text-muted-foreground">{f.type}</span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-muted-foreground italic px-1">
            No fields
          </div>
        )}
      </div>
    </div>
  );
});

StateNode.displayName = 'StateNode';
