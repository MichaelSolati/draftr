import React, {memo} from 'react';
import {Handle, Position, type NodeProps} from '@xyflow/react';
import {Box, Lock, Unlock, Shield} from 'lucide-react';
import {type ClassSpec, type Visibility} from '../../../types/spec';

function renderVisibilityIcon(visibility: Visibility) {
  switch (visibility) {
    case 'private':
      return <Lock className="h-3 w-3 text-rose-500 inline mr-1" />;
    case 'protected':
      return <Shield className="h-3 w-3 text-amber-500 inline mr-1" />;
    case 'public':
    default:
      return <Unlock className="h-3 w-3 text-emerald-500 inline mr-1" />;
  }
}

export const ClassNode: React.FC<NodeProps> = memo(({data}) => {
  const spec = data as unknown as ClassSpec;

  return (
    <div className="min-w-[240px] rounded-lg border border-border bg-card text-card-foreground shadow-md transition-shadow hover:shadow-lg font-sans text-xs overflow-hidden">
      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Box className="h-3.5 w-3.5 text-primary" />
          <span>{spec.name}</span>
        </div>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">
          {spec.kind || 'class'}
        </span>
      </div>

      {/* Properties Section */}
      {spec.properties && spec.properties.length > 0 && (
        <div className="border-b border-border/60 px-3 py-1.5 bg-background/40">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
            Properties
          </div>
          <div className="space-y-1">
            {spec.properties.map((prop, idx) => (
              <div
                key={`prop-${idx}`}
                className="flex items-center justify-between text-muted-foreground font-mono"
              >
                <div className="flex items-center">
                  {renderVisibilityIcon(prop.visibility)}
                  <span className="text-foreground">{prop.name}</span>
                </div>
                <span className="text-[11px] text-muted-foreground/80">
                  {prop.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Methods Section */}
      {spec.methods && spec.methods.length > 0 && (
        <div className="px-3 py-1.5 bg-background/70">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
            Methods
          </div>
          <div className="space-y-1.5">
            {spec.methods.map((meth, idx) => (
              <div
                key={`meth-${idx}`}
                className="relative flex items-center justify-between text-muted-foreground font-mono group py-0.5"
              >
                {/* Target Handle (Left) */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={meth.name}
                  className="!h-2.5 !w-2.5 !bg-primary !border-2 !border-background transition-transform group-hover:scale-125"
                  style={{left: -16}}
                />

                <div className="flex items-center">
                  {renderVisibilityIcon(meth.visibility)}
                  <span className="text-foreground font-medium">
                    {meth.name}
                  </span>
                  <span className="text-muted-foreground/70">()</span>
                </div>
                <span className="text-[11px] text-primary/80">
                  {meth.returnType}
                </span>

                {/* Source Handle (Right) */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={meth.name}
                  className="!h-2.5 !w-2.5 !bg-primary !border-2 !border-background transition-transform group-hover:scale-125"
                  style={{right: -16}}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ClassNode.displayName = 'ClassNode';
