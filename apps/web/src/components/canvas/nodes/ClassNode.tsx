import React, {memo, useState} from 'react';
import {Handle, Position, type NodeProps} from '@xyflow/react';
import {Box, Lock, Unlock, Shield, Edit3, Check, X} from 'lucide-react';
import {
  type ClassSpec,
  type Visibility,
  type ArchitectureProject,
} from '@draftr/core';
import {CodeEditor} from '../../editor/CodeEditor';
import {ReferencedChips} from '../../editor/ReferencedChips';
import {extractReferencedItems} from '@draftr/core';

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

interface ClassNodeData extends ClassSpec {
  rawSnippet?: string;
  project?: ArchitectureProject;
  onSelectEntity?: (entityId: string) => void;
  onUpdateText?: (className: string, newSnippet: string) => void;
}

export const ClassNode: React.FC<NodeProps> = memo(({data}) => {
  const spec = data as unknown as ClassNodeData;
  const [filterQuery, setFilterQuery] = useState('');
  const [isPropsOpen, setIsPropsOpen] = useState(true);
  const [isMethodsOpen, setIsMethodsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  // Generate fallback text snippet for editing if rawSnippet is not passed
  const getInitialSnippet = () => {
    if (spec.rawSnippet) return spec.rawSnippet;
    const kindPrefix =
      spec.kind === 'abstract'
        ? 'abstract class'
        : spec.kind === 'interface'
          ? 'interface'
          : 'class';
    const extendsPart = spec.superClass ? ` extends ${spec.superClass}` : '';
    const implementsPart =
      spec.interfaces && spec.interfaces.length > 0
        ? ` implements ${spec.interfaces.join(', ')}`
        : '';
    const lines = [`${kindPrefix} ${spec.name}${extendsPart}${implementsPart}`];
    spec.properties?.forEach(p => {
      const vis =
        p.visibility === 'private'
          ? '-'
          : p.visibility === 'protected'
            ? '#'
            : '+';
      lines.push(`  ${vis} ${p.name}: ${p.type}`);
    });
    spec.methods?.forEach(m => {
      const vis =
        m.visibility === 'private'
          ? '-'
          : m.visibility === 'protected'
            ? '#'
            : '+';
      const callsStr =
        m.calls && m.calls.length > 0
          ? ` -> ${m.calls[0].targetClass}.${m.calls[0].targetMethod}`
          : '';
      lines.push(`  ${vis} ${m.name}(): ${m.returnType}${callsStr}`);
    });
    return lines.join('\n');
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditText(getInitialSnippet());
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (spec.onUpdateText) {
      spec.onUpdateText(spec.name, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditing(false);
  };

  const query = filterQuery.toLowerCase().trim();

  // Referenced items extracted for this class
  const referencedItems = React.useMemo(() => {
    const snippetToParse = spec.rawSnippet || getInitialSnippet();
    return extractReferencedItems(snippetToParse, spec.project);
  }, [spec.rawSnippet, spec.project]);

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
    <div
      onDoubleClick={!isEditing ? handleStartEdit : undefined}
      className={`relative min-w-[280px] max-w-[380px] rounded-lg border border-border bg-card text-card-foreground shadow-md transition-shadow hover:shadow-lg font-sans text-xs overflow-visible ${
        isEditing ? 'z-50 ring-2 ring-primary/40' : ''
      }`}
    >
      {/* Node-level Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !bg-primary/50 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !bg-primary/50 !border-2 !border-background"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-2 rounded-t-lg">
        <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
          <Box className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{spec.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              title="Edit outline text for this class"
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors nodrag"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSaveEdit}
                title="Save changes (Ctrl+Enter)"
                className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors nodrag"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                title="Cancel editing (Esc)"
                className="p-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors nodrag"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
              spec.kind === 'interface'
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                : spec.kind === 'abstract'
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  : 'bg-primary/10 text-primary'
            }`}
          >
            {spec.kind || 'class'}
          </span>
        </div>
      </div>

      {/* Polymorphism Subtitle / Badges */}
      {!isEditing &&
        (spec.superClass ||
          (spec.interfaces && spec.interfaces.length > 0)) && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-1 bg-muted/40 border-b border-border text-[10px] font-mono">
            {spec.superClass && (
              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                <span className="text-muted-foreground font-normal">
                  extends
                </span>
                <span>{spec.superClass}</span>
              </span>
            )}
            {spec.interfaces && spec.interfaces.length > 0 && (
              <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-medium">
                <span className="text-muted-foreground font-normal">
                  implements
                </span>
                <span>{spec.interfaces.join(', ')}</span>
              </span>
            )}
          </div>
        )}

      {/* Referenced Chips in Header if not editing */}
      {!isEditing && referencedItems.length > 0 && (
        <div className="px-2.5 py-1 border-b border-border/40 bg-muted/20">
          <ReferencedChips
            items={referencedItems}
            onSelectEntity={spec.onSelectEntity}
          />
        </div>
      )}

      {/* Inline Shared CodeEditor Mode */}
      {isEditing ? (
        <div
          onKeyDownCapture={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              handleSaveEdit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              handleCancelEdit();
            }
          }}
          className="p-2 bg-background font-mono text-[11px] space-y-1.5 nodrag overflow-visible relative"
        >
          <div className="border border-primary/40 rounded overflow-visible relative">
            <CodeEditor
              value={editText}
              onChange={setEditText}
              project={spec.project}
              showLineNumbers={false}
              showReferencedChips={false}
              showFooter={false}
              autoFocus={true}
              minRows={5}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              placeholder="class Name&#10;  + method(): void"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>Ctrl+Enter to save, Esc to cancel</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-2 py-0.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
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
                  Properties ({filteredProperties.length}/
                  {spec.properties.length})
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
                        className="relative group flex items-center justify-between text-muted-foreground font-mono py-0.5 px-1 rounded hover:bg-muted/30 transition-colors"
                      >
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={prop.name}
                          className="!h-2 !w-2 !bg-sky-500 !border-2 !border-background shadow-sm"
                          style={{left: -5}}
                          title={`Target: ${spec.name}.${prop.name}`}
                        />
                        <div className="flex items-center truncate mr-2">
                          {renderVisibilityIcon(prop.visibility)}
                          <span className="text-foreground truncate">
                            {prop.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground/80 shrink-0">
                          {prop.type}
                        </span>
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={prop.name}
                          className="!h-2 !w-2 !bg-sky-500 !border-2 !border-background shadow-sm"
                          style={{right: -5}}
                          title={`Source: ${spec.name}.${prop.name}`}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Methods Section */}
          {spec.methods && spec.methods.length > 0 && (
            <div className="px-3 py-1.5 bg-background/70 rounded-b-lg">
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
                        className="relative group flex items-center justify-between text-muted-foreground font-mono py-0.5 px-1 rounded hover:bg-muted/30 transition-colors"
                      >
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={meth.name}
                          className="!h-2 !w-2 !bg-sky-500 !border-2 !border-background shadow-sm"
                          style={{left: -5}}
                          title={`Target: ${spec.name}.${meth.name}()`}
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
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={meth.name}
                          className="!h-2 !w-2 !bg-sky-500 !border-2 !border-background shadow-sm"
                          style={{right: -5}}
                          title={`Source: ${spec.name}.${meth.name}()`}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

ClassNode.displayName = 'ClassNode';
