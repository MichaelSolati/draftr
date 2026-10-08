import {
  StreamLanguage,
  HighlightStyle,
  indentService,
} from '@codemirror/language';
import {tags as t} from '@lezer/highlight';
import {EditorView} from '@codemirror/view';
import {
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import {type ArchitectureProject} from '@arch-spec/core';

/**
 * StreamLanguage definition for ArchSpec DSL
 */
export const archSpecStreamLanguage = StreamLanguage.define({
  tokenTable: {
    keyword: t.keyword,
    action: t.controlKeyword,
    modifier: t.modifier,
    type: t.typeName,
    primitive: t.standard(t.typeName),
    function: t.function(t.variableName),
    property: t.propertyName,
    comment: t.lineComment,
    string: t.string,
  },
  token(stream): string | null {
    if (stream.eatSpace()) return null;

    // 1. Comments
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }

    // 2. Control arrows
    if (stream.match('->')) {
      return 'action';
    }

    // 3. Strings
    if (stream.match(/^"[^"]*"/)) return 'string';
    if (stream.match(/^'[^']*'/)) return 'string';

    // 4. Modifiers at start of token (+, -, #)
    if (stream.match(/^[+#\\-](?=\s*[A-Za-z0-9_$])/)) {
      return 'modifier';
    }

    // 5. Words & Identifiers
    const word = stream.match(/^[A-Za-z0-9_$/]+/);
    if (word) {
      const str = Array.isArray(word) ? word[0] : String(word);

      // Top-level block declarations
      if (/^(class|interface|type|ui|db|api|event|state)$/i.test(str)) {
        return 'keyword';
      }

      // Actions / Invocations
      if (/^(binds|calls|invokes)$/i.test(str)) {
        return 'action';
      }

      // Modifiers
      if (/^(public|private|protected|readonly|get|set)$/i.test(str)) {
        return 'modifier';
      }

      // HTTP Verbs
      if (/^(GET|POST|PUT|DELETE|PATCH)$/i.test(str)) {
        return 'keyword';
      }

      // Database modifiers
      if (/^(pk|fk|unique)$/i.test(str)) {
        return 'modifier';
      }

      // Primitive types
      if (
        /^(string|number|boolean|any|void|never|unknown|uuid|text|int|serial|timestamp|jsonb)$/i.test(
          str
        )
      ) {
        return 'primitive';
      }

      // Method call or declaration: followed by '('
      if (stream.peek() === '(') {
        return 'function';
      }

      // Property declaration: followed by ':'
      if (stream.peek() === ':') {
        return 'property';
      }

      // Entity or Type name starting with capital letter
      if (/^[A-Z]/.test(str)) {
        return 'type';
      }

      return 'property';
    }

    // Punctuation
    stream.next();
    return null;
  },
});

/**
 * Token colors matching our design system
 */
export const archSpecHighlightStyle = HighlightStyle.define([
  {tag: t.keyword, color: '#f59e0b', fontWeight: 'bold'}, // Amber
  {tag: t.controlKeyword, color: '#a855f7', fontWeight: 'bold'}, // Purple
  {tag: t.modifier, color: '#10b981', fontWeight: 'bold'}, // Emerald
  {tag: t.typeName, color: '#c084fc', fontWeight: '600'}, // Light purple
  {tag: t.standard(t.typeName), color: '#38bdf8', fontWeight: '500'}, // Sky blue
  {tag: t.function(t.variableName), color: '#38bdf8', fontWeight: '600'}, // Sky blue
  {tag: t.propertyName, color: '#f1f5f9', fontWeight: '600'}, // Foreground
  {tag: t.lineComment, color: '#94a3b8', fontStyle: 'italic'}, // Slate
  {tag: t.string, color: '#fb7185'}, // Rose
  {tag: t.punctuation, color: '#64748b'},
  {tag: t.variableName, color: '#e2e8f0'},
]);

/**
 * Custom indentation logic for 3-tier hierarchy:
 * 1) Class -> 2 spaces
 * 2) Method/Property -> 4 spaces
 * 3) Call -> 4 spaces
 */
export const archSpecIndentService = indentService.of((context, pos) => {
  const prevLine = context.lineAt(pos, -1);
  const trimmed = prevLine.text.trim();
  const currentIndent = (prevLine.text.match(/^(\s*)/)?.[1] || '').length;

  if (!trimmed) {
    return currentIndent;
  }

  // After entity declaration: indent + 2
  if (
    /^(class|interface|type|ui|db|api|event|state)\s+/i.test(trimmed) ||
    trimmed.endsWith(':') ||
    trimmed.endsWith('{')
  ) {
    return currentIndent + 2;
  }

  // After method declaration: indent + 2 (Level 3 for calls)
  if (
    /^(?:[+#\\-]|(?:public|private|protected|readonly|get|set)\b)?\s*[A-Za-z0-9_$]+\s*\(.*?\)/i.test(
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
});

/**
 * Shortcut: Typing '+' at empty line expands to 'public ', '-' expands to 'private '
 */
export const archSpecShortcuts = EditorView.inputHandler.of(
  (view, from, to, text) => {
    if (text === '+' || text === '-') {
      const line = view.state.doc.lineAt(from);
      const prefix = view.state.doc.sliceString(line.from, from);
      if (prefix.trim() === '') {
        const expansion = text === '+' ? 'public ' : 'private ';
        view.dispatch({
          changes: {from, to, insert: expansion},
          selection: {anchor: from + expansion.length},
        });
        return true;
      }
    }
    return false;
  }
);

/**
 * Autocompletion source with known keywords, types, and project entities
 */
export function createArchSpecCompletions(project?: ArchitectureProject) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[A-Za-z0-9_$.+#-]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    const options = [
      // Block Declarations
      {label: 'class', type: 'keyword', info: 'Define a logic class / service'},
      {label: 'ui', type: 'keyword', info: 'Define a UI component'},
      {label: 'db', type: 'keyword', info: 'Define a database table'},
      {label: 'api', type: 'keyword', info: 'Define an API route'},
      {label: 'event', type: 'keyword', info: 'Define a domain event'},
      {label: 'state', type: 'keyword', info: 'Define a state slice'},

      // Modifiers
      {label: 'public', type: 'keyword', info: 'Public visibility'},
      {label: 'private', type: 'keyword', info: 'Private visibility'},
      {label: 'protected', type: 'keyword', info: 'Protected visibility'},
      {label: 'readonly', type: 'keyword', info: 'Readonly property'},

      // Invocations
      {label: 'calls', type: 'keyword', info: 'Call target method/class'},
      {label: 'binds', type: 'keyword', info: 'Bind logic service to UI'},

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

/**
 * Editor Theme
 */
export const archSpecEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '12px',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    backgroundColor: 'transparent',
    color: 'hsl(var(--foreground))',
  },
  '.cm-content': {
    caretColor: 'hsl(var(--foreground))',
    lineHeight: '20px',
    padding: '12px 8px',
  },
  '.cm-cursor': {
    borderLeftColor: 'hsl(var(--foreground))',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'hsl(var(--primary) / 0.25) !important',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--muted) / 0.2)',
    color: 'hsl(var(--muted-foreground) / 0.5)',
    borderRight: '1px solid hsl(var(--border) / 0.5)',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '11px',
    paddingLeft: '4px',
    paddingRight: '6px',
  },
  '.cm-activeLine': {
    backgroundColor: 'hsl(var(--muted) / 0.15)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'hsl(var(--muted) / 0.3)',
    color: 'hsl(var(--foreground))',
    fontWeight: 'bold',
  },
  '.cm-tooltip-autocomplete': {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    padding: '4px',
    color: 'hsl(var(--popover-foreground))',
  },
  '.cm-tooltip-autocomplete ul li': {
    borderRadius: '4px',
    padding: '3px 8px',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
  },
});
