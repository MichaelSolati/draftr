import React, {memo} from 'react';
import {Handle, Position, type NodeProps} from '@xyflow/react';
import {Zap} from 'lucide-react';
import {type EventSpec} from '../../../types/spec';

export const EventNode: React.FC<NodeProps> = memo(({data}) => {
  const spec = data as unknown as EventSpec;

  return (
    <div className="min-w-[200px] rounded-lg border-2 border-violet-500/40 bg-violet-950/15 dark:bg-violet-950/25 text-card-foreground shadow-sm transition-shadow hover:shadow-md font-sans text-xs overflow-hidden backdrop-blur-sm">
      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-violet-500/20 bg-violet-500/10 px-3 py-2">
        <div className="flex items-center gap-1.5 font-semibold text-violet-600 dark:text-violet-400">
          <Zap className="h-3.5 w-3.5 fill-violet-500/20" />
          <span>{spec.name}</span>
        </div>
        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-300 uppercase">
          Event
        </span>
      </div>

      <div className="p-2.5 text-[11px] font-mono text-muted-foreground">
        {spec.payloadType ? (
          <div>
            Payload:{' '}
            <span className="text-foreground font-semibold">
              {spec.payloadType}
            </span>
          </div>
        ) : (
          <div className="italic text-[10px]">No payload</div>
        )}
      </div>

      {/* Source Handle (connects to listener) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !bg-violet-500 !border-2 !border-background"
      />
    </div>
  );
});

EventNode.displayName = 'EventNode';
