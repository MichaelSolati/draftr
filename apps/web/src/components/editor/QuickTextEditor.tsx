import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Box,
  Database,
  Globe,
  Zap,
  Layout,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {type ArchitectureProject, type ParserDiagnostic} from '@arch-spec/core';
import {CodeEditor} from './CodeEditor';

interface QuickTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  project?: ArchitectureProject;
  diagnostics: ParserDiagnostic[];
  entityCount: {classes: number; ui: number; connections: number};
  onInsertSnippet?: (snippet: string) => void;
  highlightedEntity?: string | null;
  onSelectEntity?: (entityId: string) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const QuickTextEditor: React.FC<QuickTextEditorProps> = ({
  value,
  onChange,
  project,
  diagnostics,
  entityCount,
  onInsertSnippet,
  highlightedEntity,
  onSelectEntity,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const lines = value.split('\n');

  // Compute lines related to highlighted entity
  const highlightedLines = React.useMemo(() => {
    if (!highlightedEntity) return new Set<number>();
    const cleanId = highlightedEntity.replace(
      /^(entity-|ui-|table-|api-|event-|state-)/,
      ''
    );
    const lineIndices = new Set<number>();
    let matching = false;
    let baseIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.search(/\S/);

      // Check if this line starts the entity
      const declMatch = trimmed.match(
        /^(class|type|interface|ui|db|api|event|state)\s+([A-Za-z0-9_$/]+)/
      );
      if (declMatch) {
        const entityName = declMatch[2];
        if (entityName === cleanId) {
          matching = true;
          baseIndent = indent;
          lineIndices.add(i + 1);
          continue;
        } else if (matching && indent <= baseIndent) {
          matching = false;
        }
      }

      if (matching) {
        if (indent > baseIndent || trimmed === '') {
          lineIndices.add(i + 1);
        } else {
          matching = false;
        }
      }
    }
    return lineIndices;
  }, [value, highlightedEntity, lines]);

  return (
    <div className="h-full flex flex-col bg-card border-r border-border overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Code2 className="h-3.5 w-3.5 text-primary" />
          <span>Quick-Text Outline</span>
        </div>
        <div className="flex items-center gap-2">
          {diagnostics.length === 0 ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Valid Syntax
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
              <AlertCircle className="h-3 w-3" />
              {diagnostics.length} diagnostic{diagnostics.length > 1 ? 's' : ''}
            </span>
          )}
          {onToggleMinimize && (
            <button
              type="button"
              onClick={onToggleMinimize}
              title={
                isMinimized ? 'Expand Text Editor' : 'Minimize Text Editor'
              }
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
            >
              {isMinimized ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Snippet Quick Insertion Bar */}
      {onInsertSnippet && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/15 text-[11px] overflow-x-auto select-none">
          <span className="text-muted-foreground mr-1">Insert:</span>
          <button
            type="button"
            onClick={() =>
              onInsertSnippet('\nclass NewService\n  + execute(): void\n')
            }
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
          >
            <Box className="h-3 w-3 text-purple-500" />
            <span>Class</span>
          </button>
          <button
            type="button"
            onClick={() => onInsertSnippet('\ndb NewTable\n  + id: uuid pk\n')}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
          >
            <Database className="h-3 w-3 text-emerald-500" />
            <span>DB Table</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onInsertSnippet(
                '\napi /api/v1/resource\n  + GET /list(): Item[]\n'
              )
            }
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
          >
            <Globe className="h-3 w-3 text-amber-500" />
            <span>API</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onInsertSnippet('\nevent ResourceCreated(EventPayload)\n')
            }
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
          >
            <Zap className="h-3 w-3 text-violet-500" />
            <span>Event</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onInsertSnippet('\nui NewView\n  ui ChildComponent\n')
            }
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
          >
            <Layout className="h-3 w-3 text-sky-500" />
            <span>UI</span>
          </button>
        </div>
      )}

      {/* Unified Code Editor Surface */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        <CodeEditor
          value={value}
          onChange={onChange}
          project={project}
          diagnostics={diagnostics}
          highlightedLines={highlightedLines}
          showLineNumbers={true}
          showReferencedChips={true}
          onSelectEntity={onSelectEntity}
          placeholder="class AuthService&#10;  + login(creds: Credentials): Session&#10;&#10;ui App&#10;  ui Header&#10;    binds AuthService"
        />
      </div>

      {/* Inline Diagnostics Console */}
      {diagnostics.length > 0 && (
        <div className="max-h-28 overflow-y-auto border-t border-border bg-amber-500/10 p-2 text-[11px] space-y-1">
          {diagnostics.map((diag, idx) => (
            <div
              key={`diag-${idx}`}
              className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400"
            >
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                <strong>Line {diag.line}:</strong> {diag.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/40 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{lines.length} lines</span>
          <span>{entityCount.classes} classes</span>
          <span>{entityCount.ui} UI nodes</span>
          <span>{entityCount.connections} wires</span>
        </div>
        <div className="text-[10px] font-medium text-primary">
          Indentation: Tabs
        </div>
      </div>
    </div>
  );
};
