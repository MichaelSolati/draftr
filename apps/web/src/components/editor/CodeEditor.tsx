import React, {useRef, useState, useEffect, useCallback, useMemo} from 'react';
import {
  computeEnterIndent,
  handleTabIndent,
  handleBracketPair,
  handleBackspaceBracket,
  toggleLineComment,
  getActiveTokenInfo,
  getAutocompleteSuggestions,
  extractReferencedItems,
  type AutocompleteItem,
} from '@arch-spec/core';
import {ReferencedChips} from './ReferencedChips';
import {SyntaxHighlightOverlay} from './SyntaxHighlightOverlay';
import {type ArchitectureProject, type ParserDiagnostic} from '@arch-spec/core';
import {Box, Database, Globe, Zap, Layers, Terminal} from 'lucide-react';

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
  diagnostics = [],
  highlightedLines = new Set<number>(),
  placeholder,
  minRows = 6,
  showLineNumbers = true,
  showReferencedChips = true,
  autoFocus = false,
  onSave,
  onCancel,
  onSelectEntity,
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [cursorCoords, setCursorCoords] = useState<{top: number; left: number}>(
    {
      top: 0,
      left: 0,
    }
  );

  const lines = useMemo(() => value.split('\n'), [value]);

  // Referenced entities extracted from current text
  const referencedItems = useMemo(() => {
    return showReferencedChips ? extractReferencedItems(value, project) : [];
  }, [value, project, showReferencedChips]);

  // Sync line numbers and syntax overlay scrolling
  const handleScroll = () => {
    if (textareaRef.current) {
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
      if (overlayRef.current) {
        overlayRef.current.scrollTop = textareaRef.current.scrollTop;
        overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    }
  };

  useEffect(() => {
    handleScroll();
  }, [value]);

  // Update autocomplete suggestions on cursor / text changes
  const updateSuggestions = useCallback(
    (currentVal: string, cursor: number) => {
      const tokenInfo = getActiveTokenInfo(currentVal, cursor);
      const isIndentedLine =
        tokenInfo.isLineStart &&
        tokenInfo.line.trim() === '' &&
        tokenInfo.line.length > 0;

      if (
        !tokenInfo.prefix &&
        !tokenInfo.isAfterArrowOrCall &&
        !tokenInfo.isAfterColon &&
        !isIndentedLine
      ) {
        setShowAutocomplete(false);
        return;
      }

      const items = getAutocompleteSuggestions(tokenInfo, project);
      if (items.length > 0) {
        setSuggestions(items);
        setActiveSuggestionIdx(0);
        setShowAutocomplete(true);

        // Approximate cursor coordinates inside textarea
        if (textareaRef.current) {
          const linesBeforeCursor = currentVal.slice(0, cursor).split('\n');
          const lineIndex = linesBeforeCursor.length - 1;
          const colIndex = linesBeforeCursor[lineIndex].length;
          const lineHeight = 20; // 20px leading-5
          const charWidth = 7.2; // approx monospace char width at 12px

          const scrollTop = textareaRef.current.scrollTop;
          const scrollLeft = textareaRef.current.scrollLeft;

          const top = Math.max(0, (lineIndex + 1) * lineHeight - scrollTop + 8);
          const left = Math.min(
            350,
            Math.max(10, colIndex * charWidth - scrollLeft + 10)
          );

          setCursorCoords({top, left});
        }
      } else {
        setShowAutocomplete(false);
      }
    },
    [project]
  );

  // Apply selected autocomplete item
  const applySuggestion = (item: AutocompleteItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const tokenInfo = getActiveTokenInfo(value, cursor);
    const prefix = tokenInfo.prefix;

    // Replace prefix with item.insertText
    const startPos = cursor - prefix.length;
    const endPos = cursor;

    const newValue =
      value.substring(0, startPos) + item.insertText + value.substring(endPos);

    onChange(newValue);
    setShowAutocomplete(false);

    const newCursor = startPos + item.insertText.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
          newCursor;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Keyboard navigation & smart typing handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 1. Autocomplete navigation
    if (showAutocomplete && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIdx(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIdx(
          prev => (prev - 1 + suggestions.length) % suggestions.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[activeSuggestionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        return;
      }
    }

    // 2. Save / Cancel Shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSave?.();
      return;
    }
    if (e.key === 'Escape') {
      if (onCancel) {
        e.preventDefault();
        onCancel();
        return;
      }
    }

    // 3. Comment Toggling: Ctrl+/ or Cmd+/
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const res = toggleLineComment(value, start, end);
      onChange(res.newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = res.newStart;
          textareaRef.current.selectionEnd = res.newEnd;
        }
      }, 0);
      return;
    }

    // 4. Tab / Shift+Tab Indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const res = handleTabIndent(value, start, end, e.shiftKey);
      onChange(res.newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = res.newStart;
          textareaRef.current.selectionEnd = res.newEnd;
        }
      }, 0);
      return;
    }

    // 4b. Space Key: Only convert to a tab if user is indenting at the start of a line (empty prefix)
    // Between words, spaces are preserved normally!
    if (e.key === ' ') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const linePrefix = value.substring(lineStart, start);
      if (linePrefix.trim() === '') {
        // At the start of a line (indentation area): insert 1 tab character
        e.preventDefault();
        const newValue =
          value.substring(0, start) + '\t' + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart =
              textareaRef.current.selectionEnd = start + 1;
            updateSuggestions(newValue, start + 1);
          }
        }, 0);
        return;
      }
      // Otherwise, let default space behavior work smoothly between words!
    }

    // 4c. +/- Shortcuts for public/private when starting a member definition
    if (e.key === '+' || e.key === '-') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const linePrefix = value.substring(lineStart, start);
      // If the line only has whitespace (indentation) so far, typing + expands to "public " and - expands to "private "
      if (linePrefix.trim() === '') {
        e.preventDefault();
        const expandedText = e.key === '+' ? 'public ' : 'private ';
        const newValue =
          value.substring(0, start) + expandedText + value.substring(end);
        onChange(newValue);
        const newCursor = start + expandedText.length;
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart =
              textareaRef.current.selectionEnd = newCursor;
            updateSuggestions(newValue, newCursor);
          }
        }, 0);
        return;
      }
    }

    // 5. Enter Key: Smart Indentation
    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);
      const indent = computeEnterIndent(currentLine);

      const insertion = '\n' + indent;
      const newValue =
        value.substring(0, start) + insertion + value.substring(end);
      onChange(newValue);

      const newPos = start + insertion.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart =
            textareaRef.current.selectionEnd = newPos;
        }
      }, 0);
      return;
    }

    // 6. Backspace: Delete matching empty bracket pair
    if (e.key === 'Backspace') {
      const res = handleBackspaceBracket(value, start, end);
      if (res) {
        e.preventDefault();
        onChange(res.newValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart =
              textareaRef.current.selectionEnd = res.newCursor;
          }
        }, 0);
        return;
      }
    }

    // 7. Bracket / Quote auto-closing pairs
    if (['(', '[', '{', '"', "'", '`', ')', ']', '}'].includes(e.key)) {
      const res = handleBracketPair(e.key, value, start, end);
      if (res) {
        e.preventDefault();
        onChange(res.newValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = res.newStart;
            textareaRef.current.selectionEnd = res.newEnd;
            updateSuggestions(res.newValue, res.newStart);
          }
        }, 0);
        return;
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Avoid re-triggering autocomplete on nav keys handled in onKeyDown
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      return;
    }
    if (textareaRef.current) {
      updateSuggestions(value, textareaRef.current.selectionStart);
    }
  };

  const handleClick = () => {
    if (textareaRef.current) {
      updateSuggestions(value, textareaRef.current.selectionStart);
    }
  };

  const getSuggestionIcon = (kind: AutocompleteItem['kind']) => {
    switch (kind) {
      case 'method':
        return <Terminal className="h-3 w-3 text-primary" />;
      case 'table':
        return <Database className="h-3 w-3 text-emerald-500" />;
      case 'api':
        return <Globe className="h-3 w-3 text-amber-500" />;
      case 'event':
        return <Zap className="h-3 w-3 text-violet-500" />;
      case 'type':
        return <Layers className="h-3 w-3 text-cyan-500" />;
      case 'class':
      default:
        return <Box className="h-3 w-3 text-purple-500" />;
    }
  };

  return (
    <div
      className={`relative flex flex-col h-full bg-card font-mono text-xs ${className}`}
    >
      {/* Referenced Chips Bar */}
      {showReferencedChips && referencedItems.length > 0 && (
        <div className="px-3 py-1 bg-muted/20 border-b border-border/50">
          <ReferencedChips
            items={referencedItems}
            onSelectEntity={onSelectEntity}
          />
        </div>
      )}

      {/* Main Editing Surface */}
      <div
        className={`flex-1 relative flex ${
          showLineNumbers ? 'overflow-hidden' : 'overflow-visible'
        }`}
      >
        {/* Line Numbers Gutter */}
        {showLineNumbers && (
          <div
            ref={lineNumbersRef}
            className="w-10 bg-muted/20 border-r border-border/50 text-muted-foreground/60 select-none py-3 text-right pr-2 overflow-hidden leading-5 font-mono"
          >
            {lines.map((_, i) => {
              const lineNum = i + 1;
              const hasDiag = diagnostics.some(d => d.line === lineNum);
              const isHighlighted = highlightedLines.has(lineNum);
              return (
                <div
                  key={lineNum}
                  className={
                    hasDiag
                      ? 'text-amber-500 font-bold'
                      : isHighlighted
                        ? 'text-primary font-bold bg-primary/10'
                        : ''
                  }
                >
                  {lineNum}
                </div>
              );
            })}
          </div>
        )}

        {/* Text Area & Syntax Highlight Overlay Container */}
        <div className="flex-1 relative overflow-hidden flex">
          <div
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none select-none overflow-hidden"
          >
            <SyntaxHighlightOverlay text={value} />
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => {
              onChange(e.target.value);
              updateSuggestions(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onClick={handleClick}
            onScroll={handleScroll}
            autoFocus={autoFocus}
            rows={minRows}
            spellCheck={false}
            className="flex-1 resize-none bg-transparent text-transparent caret-foreground p-3 focus:outline-none leading-5 selection:bg-primary/25 overflow-y-auto whitespace-pre font-mono z-10"
            placeholder={placeholder}
          />
        </div>

        {/* Autocomplete Popup */}
        {showAutocomplete && suggestions.length > 0 && (
          <div
            style={{
              top: `${cursorCoords.top}px`,
              left: `${(showLineNumbers ? 40 : 0) + cursorCoords.left}px`,
            }}
            className="absolute z-50 w-64 max-h-56 overflow-y-auto rounded-md border border-border bg-popover/95 backdrop-blur-sm p-1 shadow-lg text-popover-foreground text-xs font-mono animate-in fade-in-50"
          >
            <div className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground font-sans font-semibold border-b border-border/50 mb-1">
              Suggestions ({suggestions.length})
            </div>
            {suggestions.map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                onMouseDown={e => {
                  e.preventDefault();
                  applySuggestion(item);
                }}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                  idx === activeSuggestionIdx
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {getSuggestionIcon(item.kind)}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.detail && (
                  <span
                    className={`text-[10px] ml-1 truncate ${
                      idx === activeSuggestionIdx
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.detail}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
