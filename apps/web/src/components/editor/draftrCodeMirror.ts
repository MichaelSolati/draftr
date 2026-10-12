import {
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import {indentService} from '@codemirror/language';
import {type EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {type ArchitectureProject} from '@draftr/core';
import {
  draftrEditorTheme,
  draftrHighlightStyle,
  draftrLanguage,
  getDraftrEditorTheme,
  getDraftrHighlightStyle,
} from '@draftr/theme';

export {
  draftrEditorTheme,
  draftrHighlightStyle,
  draftrLanguage,
  getDraftrEditorTheme,
  getDraftrHighlightStyle,
};

export function computeDraftrIndent(prevLineText: string): number {
  const trimmed = prevLineText.trim();
  const currentIndent = (prevLineText.match(/^(\s*)/)?.[1] || '').length;

  if (!trimmed) {
    return currentIndent;
  }

  // After entity declaration: indent + 2
  if (
    /^(?:abstract\s+class|class|interface|type|ui|db|api|event|state)\s+/i.test(
      trimmed
    ) ||
    trimmed.endsWith(':') ||
    trimmed.endsWith('{')
  ) {
    return currentIndent + 2;
  }

  // After method declaration: indent + 2 (Level 3 for calls)
  if (
    /^(?:[+#\\-]|(?:public|private|protected|readonly|get|set|override)\b)?\s*[A-Za-z0-9_$]+\s*\(.*?\)/i.test(
      trimmed
    )
  ) {
    return currentIndent + 2;
  }

  // After a call statement: keep the same indent level (Level 3)
  if (/^(?:calls|invokes|->)\s+/i.test(trimmed)) {
    return currentIndent;
  }

  return currentIndent;
}

/**
 * Custom indentation logic for 3-tier hierarchy:
 * 1) Class -> 2 spaces
 * 2) Method/Property -> 4 spaces
 * 3) Call -> 4 spaces
 */
export const draftrIndentService = indentService.of((context, pos) => {
  const prevLine = context.lineAt(pos, -1);
  return computeDraftrIndent(prevLine.text);
});

/**
 * Detect enclosing entity block for context-sensitive shortcuts.
 * Returns 'ui' if the cursor is within a UI component declaration,
 * 'class' if within a class/interface, or 'root'.
 */
export function getDraftrContext(
  doc: {line: (n: number) => {text: string}},
  currentLineNumber: number
): 'ui' | 'class' | 'root' {
  for (let l = currentLineNumber - 1; l >= 1; l--) {
    const rawLine = doc.line(l).text;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    // Check top-level block declaration (starts with 0 leading spaces/tabs)
    if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t')) {
      if (/^ui\b/i.test(trimmed)) {
        return 'ui';
      }
      if (/^(?:abstract\s+class|class|interface)\b/i.test(trimmed)) {
        return 'class';
      }
      return 'root';
    }
  }
  return 'root';
}

/**
 * Shortcut handler: When typing a space (' ') at the end of a line-start symbol:
 * - '+' + space -> 'public '
 * - '-' + space -> 'private '
 * - '#' + space -> 'protected '
 * - '->' + space -> 'binds ' (under UI) or 'calls ' (under classes/methods)
 */
export function handleDraftrShortcut(
  view: {
    state: EditorState;
    dispatch: (tr: {
      changes: {from: number; to: number; insert: string};
      selection: {anchor: number};
    }) => void;
  },
  from: number,
  to: number,
  text: string
): boolean {
  if (text !== ' ' || from !== to) {
    return false;
  }

  const line = view.state.doc.lineAt(from);
  const prefix = view.state.doc.sliceString(line.from, from);
  const match = prefix.match(/^(\s*)([+\-#]|->)$/);

  if (!match) {
    return false;
  }

  const indent = match[1];
  const symbol = match[2];
  const symbolStart = line.from + indent.length;
  const symbolEnd = from;

  let expansion = '';
  if (symbol === '+') {
    expansion = 'public ';
  } else if (symbol === '-') {
    expansion = 'private ';
  } else if (symbol === '#') {
    expansion = 'protected ';
  } else if (symbol === '->') {
    const ctx = getDraftrContext(view.state.doc, line.number);
    expansion = ctx === 'ui' ? 'call ' : 'call ';
  }

  if (expansion) {
    view.dispatch({
      changes: {from: symbolStart, to: symbolEnd, insert: expansion},
      selection: {anchor: symbolStart + expansion.length},
    });
    return true;
  }

  return false;
}

/**
 * Shortcut: Space after '+', '-', '#', or '->' at line start expands to keyword
 */
export const draftrShortcuts = EditorView.inputHandler.of(
  (view, from, to, text) => handleDraftrShortcut(view, from, to, text)
);

/**
 * Autocompletion source with known keywords, types, and project entities
 */
export function createDraftrCompletions(project?: ArchitectureProject) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[A-Za-z0-9_$.+#-]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    const options = [
      // Block Declarations
      {label: 'class', type: 'keyword', info: 'Define a logic class / service'},
      {label: 'abstract', type: 'keyword', info: 'Define an abstract class'},
      {
        label: 'interface',
        type: 'keyword',
        info: 'Define a contract interface',
      },
      {label: 'ui', type: 'keyword', info: 'Define a UI component'},
      {label: 'db', type: 'keyword', info: 'Define a database table'},
      {label: 'api', type: 'keyword', info: 'Define an API route'},
      {label: 'event', type: 'keyword', info: 'Define a domain event'},
      {label: 'state', type: 'keyword', info: 'Define a state slice'},

      // Polymorphism
      {label: 'extends', type: 'keyword', info: 'Inherit from a superclass'},
      {
        label: 'implements',
        type: 'keyword',
        info: 'Implement interface contracts',
      },

      // Modifiers
      {label: 'public', type: 'keyword', info: 'Public visibility'},
      {label: 'private', type: 'keyword', info: 'Private visibility'},
      {label: 'protected', type: 'keyword', info: 'Protected visibility'},
      {label: 'readonly', type: 'keyword', info: 'Readonly property'},
      {label: 'override', type: 'keyword', info: 'Override base member'},

      // Invocations
      {label: 'calls', type: 'keyword', info: 'Call target method/class'},
      {label: 'binds', type: 'keyword', info: 'Bind logic service to UI'},
      {label: 'bind', type: 'keyword', info: 'Bind logic service to UI'},

      // HTTP Verbs
      {label: 'GET', type: 'keyword', info: 'HTTP GET endpoint'},
      {label: 'POST', type: 'keyword', info: 'HTTP POST endpoint'},
      {label: 'PUT', type: 'keyword', info: 'HTTP PUT endpoint'},
      {label: 'DELETE', type: 'keyword', info: 'HTTP DELETE endpoint'},
      {label: 'PATCH', type: 'keyword', info: 'HTTP PATCH endpoint'},

      // DB modifiers
      {label: 'pk', type: 'keyword', info: 'Primary Key'},
      {label: 'fk', type: 'keyword', info: 'Foreign Key'},
      {label: 'unique', type: 'keyword', info: 'Unique column constraint'},

      // Primitive types
      {label: 'string', type: 'type'},
      {label: 'number', type: 'type'},
      {label: 'boolean', type: 'type'},
      {label: 'void', type: 'type'},
      {label: 'any', type: 'type'},
      {label: 'uuid', type: 'type'},
      {label: 'timestamp', type: 'type'},
    ];

    // Add project entities
    if (project?.classes) {
      for (const cls of project.classes) {
        options.push({
          label: cls.name,
          type: 'class',
          info: `Class: ${cls.name}`,
        });
        if (cls.methods) {
          for (const m of cls.methods) {
            options.push({
              label: `${cls.name}.${m.name}()`,
              type: 'function',
              info: `Method on ${cls.name}`,
            });
          }
        }
        if (cls.properties) {
          for (const p of cls.properties) {
            options.push({
              label: `${cls.name}.${p.name}`,
              type: 'property',
              info: `Property on ${cls.name}`,
            });
          }
        }
      }
    }

    return {
      from: word.from,
      options,
      validFor: /^[A-Za-z0-9_$.+#-]*$/,
    };
  };
}
