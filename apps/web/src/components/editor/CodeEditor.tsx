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
} from '@draftr/core';
import {ReferencedChips} from './ReferencedChips';
import {useTheme} from '../theme/ThemeProvider';
import {
  draftrStreamLanguage,
  getDraftrHighlightStyle,
  draftrIndentService,
  draftrShortcuts,
  getDraftrEditorTheme,
  createDraftrCompletions,
} from './draftrCodeMirror';

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
  showFooter?: boolean;
  autoFocus?: boolean;
  theme?: 'dark' | 'light';
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
  showReferencedChips = false,
  showFooter = false,
  autoFocus = false,
  theme: themeProp,
  onSave,
  onCancel,
  onSelectEntity,
  placeholder = 'class MainService\n  public start(): void\n',
  className = '',
}) => {
  const {resolvedTheme} = useTheme();
  const activeTheme = themeProp || resolvedTheme || 'dark';

  // Referenced items extracted from current text
  const referencedItems = useMemo(() => {
    return showReferencedChips ? extractReferencedItems(value, project) : [];
  }, [value, project, showReferencedChips]);

  // Extensions configuration for CodeMirror 6
  const extensions = useMemo(() => {
    const list = [
      draftrStreamLanguage,
      syntaxHighlighting(getDraftrHighlightStyle(activeTheme)),
      draftrIndentService,
      indentUnit.of('  '),
      EditorState.tabSize.of(2),
      draftrShortcuts,
      getDraftrEditorTheme(activeTheme),
      autocompletion({
        override: [createDraftrCompletions(project)],
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
          key: 'Ctrl-Enter',
          run: () => {
            if (onSave) {
              onSave();
              return true;
            }
            return false;
          },
        },
        {
          key: 'Cmd-Enter',
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
  }, [project, showLineNumbers, onSave, onCancel, activeTheme]);

  const lineCount = useMemo(() => value.split('\n').length, [value]);

  return (
    <div
      onKeyDownCapture={e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          if (onSave) {
            e.preventDefault();
            e.stopPropagation();
            onSave();
          }
        } else if (e.key === 'Escape') {
          if (onCancel) {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }
      }}
      className={`flex flex-col h-full bg-transparent overflow-hidden ${className}`}
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
      <div className="flex-1 relative overflow-hidden flex flex-col bg-transparent">
        <CodeMirror
          value={value}
          height="100%"
          theme="none"
          className="h-full flex-1 overflow-auto font-mono text-xs bg-transparent"
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

      {/* Optional Editor Footer Status Bar */}
      {showFooter && (
        <div className="flex items-center justify-between px-3 py-1 bg-muted/40 border-t border-border/40 text-[10px] text-muted-foreground select-none shrink-0 font-mono">
          <div>
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </div>
          <div className="flex items-center gap-3">
            <span>Tab: 2 Spaces</span>
            <span>draftr</span>
          </div>
        </div>
      )}
    </div>
  );
};
