import React, {useMemo} from 'react';
import CodeMirror from '@uiw/react-codemirror';
import {syntaxHighlighting, indentUnit} from '@codemirror/language';
import {EditorState} from '@codemirror/state';
import {keymap, lineNumbers} from '@codemirror/view';
import {indentWithTab} from '@codemirror/commands';
import {autocompletion} from '@codemirror/autocomplete';
import {
  type ArchitectureProject,
  type ParserDiagnostic,
  extractReferencedItems,
} from '@arch-spec/core';
import {ReferencedChips} from './ReferencedChips';
import {
  archSpecStreamLanguage,
  archSpecHighlightStyle,
  archSpecIndentService,
  archSpecShortcuts,
  archSpecEditorTheme,
  createArchSpecCompletions,
} from './archSpecCodeMirror';

export interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  project?: ArchitectureProject;
  diagnostics?: ParserDiagnostic[];
  highlightedLines?: Set<number>;
  placeholder?: string;
  minRows?: number;
  showLineNumbers?: boolean;
  showReferencedChips?: boolean;
  autoFocus?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  onSelectEntity?: (entityId: string) => void;
  className?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  project,
  showLineNumbers = true,
  showReferencedChips = true,
  autoFocus = false,
  onSave,
  onCancel,
  onSelectEntity,
  placeholder = 'class MainService\n  public start(): void\n',
  className = '',
}) => {
  // Referenced items extracted from current text
  const referencedItems = useMemo(() => {
    return showReferencedChips ? extractReferencedItems(value, project) : [];
  }, [value, project, showReferencedChips]);

  // Extensions configuration for CodeMirror 6
  const extensions = useMemo(() => {
    const list = [
      archSpecStreamLanguage,
      syntaxHighlighting(archSpecHighlightStyle),
      archSpecIndentService,
      indentUnit.of('  '),
      EditorState.tabSize.of(2),
      archSpecShortcuts,
      archSpecEditorTheme,
      autocompletion({
        override: [createArchSpecCompletions(project)],
      }),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            if (onSave) {
              onSave();
              return true;
            }
            return false;
          },
        },
        {
          key: 'Escape',
          run: () => {
            if (onCancel) {
              onCancel();
              return true;
            }
            return false;
          },
        },
        indentWithTab,
      ]),
    ];

    if (showLineNumbers) {
      list.push(lineNumbers());
    }

    return list;
  }, [project, showLineNumbers, onSave, onCancel]);

  const lineCount = useMemo(() => value.split('\n').length, [value]);

  return (
    <div
      className={`flex flex-col h-full bg-card rounded-md border border-border overflow-hidden ${className}`}
    >
      {/* Referenced Chips Bar */}
      {showReferencedChips && referencedItems.length > 0 && (
        <div className="border-b border-border/60 bg-muted/20 px-3 py-1.5 shrink-0">
          <ReferencedChips
            items={referencedItems}
            onSelectEntity={onSelectEntity}
          />
        </div>
      )}

      {/* CodeMirror 6 Editor Container */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-background/50">
        <CodeMirror
          value={value}
          height="100%"
          className="h-full flex-1 overflow-auto font-mono text-xs"
          placeholder={placeholder}
          autoFocus={autoFocus}
          extensions={extensions}
          onChange={val => onChange(val)}
          basicSetup={{
            lineNumbers: false, // handled explicitly via extensions
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false, // handled explicitly with our custom completions
            rectangularSelection: true,
            crosshairCursor: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
          }}
        />
      </div>

      {/* Editor Footer Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-muted/40 border-t border-border/40 text-[10px] text-muted-foreground select-none shrink-0 font-mono">
        <div>
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </div>
        <div className="flex items-center gap-3">
          <span>Tab: 2 Spaces</span>
          <span>ArchSpec</span>
        </div>
      </div>
    </div>
  );
};
