import {type ArchitectureProject, type ParserDiagnostic} from '@draftr/core';
import {
  Activity,
  AlertCircle,
  Box,
  CheckCircle2,
  ChevronDown,
  Code2,
  Database,
  Globe,
  Layout,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Zap,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

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
  isMinimized = false,
  onToggleMinimize,
}) => {
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const insertDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        insertDropdownRef.current &&
        !insertDropdownRef.current.contains(e.target as Node)
      ) {
        setIsInsertOpen(false);
      }
    };
    if (isInsertOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInsertOpen]);

  const lines = value.split('\n');

  // Compute lines related to highlighted entity
  const highlightedLines = useMemo(() => {
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Code2 className="h-3.5 w-3.5 text-primary" />
            <span>Quick-Text Outline</span>
          </div>

          {/* Insert Entity Dropdown */}
          {onInsertSnippet && (
            <div className="relative" ref={insertDropdownRef}>
              <button
                type="button"
                onClick={() => setIsInsertOpen(prev => !prev)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-sm ml-1"
              >
                <Plus className="h-3 w-3 text-primary" />
                <span>Insert Entity</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {isInsertOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 rounded-lg border border-border bg-popover/95 backdrop-blur-md p-1.5 shadow-xl text-popover-foreground text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-1">
                    Insert Entity
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const name = `Service_${Date.now().toString().slice(-4)}`;
                      onInsertSnippet(`\nclass ${name}\n  + execute(): void\n`);
                      setIsInsertOpen(false);
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
                      onInsertSnippet(
                        `\ndb ${name}\n  + id: uuid pk\n  + name: string\n`
                      );
                      setIsInsertOpen(false);
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
                      onInsertSnippet(
                        `\napi /api/v1${route}\n  + GET /list(): Item[]\n`
                      );
                      setIsInsertOpen(false);
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
                      onInsertSnippet(`\nui ${name}\n  ui Content\n`);
                      setIsInsertOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
                  >
                    <Layout className="h-3.5 w-3.5 text-sky-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">UI Component</span>
                      <span className="text-[10px] text-muted-foreground">
                        View & structure
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const name = `Event_${Date.now().toString().slice(-4)}`;
                      onInsertSnippet(`\nevent ${name}(Payload)\n`);
                      setIsInsertOpen(false);
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
                      onInsertSnippet(
                        `\nstate ${name}\n  [initial] StateA -> StateB: transition\n`
                      );
                      setIsInsertOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
                  >
                    <Activity className="h-3.5 w-3.5 text-rose-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">State Machine</span>
                      <span className="text-[10px] text-muted-foreground">
                        States & transitions
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
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

      {/* Unified Code Editor Surface */}
      <div className="flex-1 relative flex flex-col overflow-hidden bg-card">
        <CodeEditor
          value={value}
          onChange={onChange}
          project={project}
          diagnostics={diagnostics}
          highlightedLines={highlightedLines}
          showLineNumbers={true}
          showReferencedChips={false}
          showFooter={false}
          className="border-0 rounded-none bg-transparent"
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
