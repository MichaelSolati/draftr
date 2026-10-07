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
  const [filterQuery, setFilterQuery] = React.useState('');
  const [isPropsOpen, setIsPropsOpen] = React.useState(true);
  const [isMethodsOpen, setIsMethodsOpen] = React.useState(true);

  const query = filterQuery.toLowerCase().trim();

  const filteredProperties = React.useMemo(() => {
    if (!spec.properties) return [];
    if (!query) return spec.properties;
    return spec.properties.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query)
    );
  }, [spec.properties, query]);

  const filteredMethods = React.useMemo(() => {
    if (!spec.methods) return [];
    if (!query) return spec.methods;
    return spec.methods.filter(
      m =>
        m.name.toLowerCase().includes(query) ||
        m.returnType.toLowerCase().includes(query)
    );
  }, [spec.methods, query]);

  const hasItems =
    (spec.properties && spec.properties.length > 0) ||
    (spec.methods && spec.methods.length > 0);

  return (
    <div className="min-w-[250px] max-w-[340px] rounded-lg border border-border bg-card text-card-foreground shadow-md transition-shadow hover:shadow-lg font-sans text-xs overflow-hidden">
      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
          <Box className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{spec.name}</span>
        </div>
        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">
          {spec.kind || 'class'}
        </span>
      </div>

      {/* Inline Member Filter Input */}
      {hasItems && (
        <div className="px-2 py-1.5 border-b border-border/40 bg-muted/20">
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filter members..."
            className="w-full text-[11px] px-2 py-0.5 rounded border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary nodrag"
          />
        </div>
      )}

      {/* Properties Section */}
      {spec.properties && spec.properties.length > 0 && (
        <div className="border-b border-border/60 px-3 py-1.5 bg-background/40">
          <div
            onClick={() => setIsPropsOpen(prev => !prev)}
            className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase mb-1 cursor-pointer select-none hover:text-foreground"
          >
            <span>
              Properties ({filteredProperties.length}/{spec.properties.length})
            </span>
            <span>{isPropsOpen ? '▾' : '▸'}</span>
          </div>
          {isPropsOpen && (
            <div className="space-y-1">
              {filteredProperties.length === 0 ? (
                <div className="text-[10px] text-muted-foreground italic py-0.5">
                  No matching properties
                </div>
              ) : (
                filteredProperties.map((prop, idx) => (
                  <div
                    key={`prop-${idx}`}
                    className="flex items-center justify-between text-muted-foreground font-mono"
                  >
                    <div className="flex items-center truncate mr-2">
                      {renderVisibilityIcon(prop.visibility)}
                      <span className="text-foreground truncate">
                        {prop.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/80 shrink-0">
                      {prop.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Methods Section */}
      {spec.methods && spec.methods.length > 0 && (
        <div className="px-3 py-1.5 bg-background/70">
          <div
            onClick={() => setIsMethodsOpen(prev => !prev)}
            className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase mb-1 cursor-pointer select-none hover:text-foreground"
          >
            <span>
              Methods ({filteredMethods.length}/{spec.methods.length})
            </span>
            <span>{isMethodsOpen ? '▾' : '▸'}</span>
          </div>
          {isMethodsOpen && (
            <div className="space-y-1.5">
              {filteredMethods.length === 0 ? (
                <div className="text-[10px] text-muted-foreground italic py-0.5">
                  No matching methods
                </div>
              ) : (
                filteredMethods.map((meth, idx) => (
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

                    <div className="flex items-center truncate mr-2">
                      {renderVisibilityIcon(meth.visibility)}
                      <span className="text-foreground font-medium truncate">
                        {meth.name}
                      </span>
                      <span className="text-muted-foreground/70">()</span>
                    </div>
                    <span className="text-[11px] text-primary/80 shrink-0">
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
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ClassNode.displayName = 'ClassNode';
