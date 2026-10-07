import React, {useRef, useEffect} from 'react';
import {AlertCircle, CheckCircle2, Code2} from 'lucide-react';
import {type ParserDiagnostic} from '../../types/spec';

interface QuickTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  diagnostics: ParserDiagnostic[];
  entityCount: {classes: number; ui: number; connections: number};
}

export const QuickTextEditor: React.FC<QuickTextEditorProps> = ({
  value,
  onChange,
  diagnostics,
  entityCount,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');

  // Handle Tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Sync scrolling between line numbers and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  useEffect(() => {
    handleScroll();
  }, [value]);

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
        </div>
      </div>

      {/* Editor Main Surface */}
      <div className="flex-1 relative flex overflow-hidden font-mono text-xs">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          className="w-10 bg-muted/20 border-r border-border/50 text-muted-foreground/60 select-none py-3 text-right pr-2 overflow-hidden leading-5 font-mono"
        >
          {lines.map((_, i) => {
            const lineNum = i + 1;
            const hasDiag = diagnostics.some(d => d.line === lineNum);
            return (
              <div
                key={lineNum}
                className={hasDiag ? 'text-amber-500 font-bold' : ''}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          className="flex-1 resize-none bg-transparent text-foreground p-3 focus:outline-none leading-5 selection:bg-primary/20 overflow-y-auto whitespace-pre font-mono"
          placeholder="class AuthService&#10;  + login(creds: Credentials): Session&#10;&#10;ui App&#10;  ui Header&#10;    binds AuthService"
        />
      </div>

      {/* Inline Diagnostics Drawer (if any) */}
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

      {/* Status Bar Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/40 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{lines.length} lines</span>
          <span>{entityCount.classes} classes</span>
          <span>{entityCount.ui} UI nodes</span>
          <span>{entityCount.connections} wires</span>
        </div>
        <div className="text-[10px]">Indentation: 2 spaces</div>
      </div>
    </div>
  );
};
