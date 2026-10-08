import {
  StreamLanguage,
  HighlightStyle,
  indentService,
  StringStream,
} from '@codemirror/language';
import {tags as t} from '@lezer/highlight';
import {EditorView} from '@codemirror/view';
import {type EditorState} from '@codemirror/state';
import {
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import {type ArchitectureProject} from '@draftr/core';

/**
 * StreamLanguage definition for draftr DSL
 */
export const draftrStreamParser = {
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
  token(stream: StringStream): string | null {
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
      if (
        /^(class|interface|type|ui|db|api|event|state|abstract)$/i.test(str)
      ) {
        return 'keyword';
      }

      // Polymorphism inheritance & interface implementation
      if (/^(extends|implements)$/i.test(str)) {
        return 'keyword';
      }

      // Actions / Invocations
      if (/^(binds|calls|invokes)$/i.test(str)) {
        return 'action';
      }

      // HTTP Verbs
      if (/^(GET|POST|PUT|DELETE|PATCH)$/i.test(str)) {
        return 'keyword';
      }

      // Modifiers
      if (/^(public|private|protected|readonly|get|set|override)$/i.test(str)) {
        return 'modifier';
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
};

export const draftrStreamLanguage = StreamLanguage.define(draftrStreamParser);

/**
 * Dark theme token colors matching our design system
 */
export const draftrDarkHighlightStyle = HighlightStyle.define([
  {tag: t.keyword, color: '#f59e0b', fontWeight: 'bold'}, // Amber
  {tag: t.controlKeyword, color: '#c084fc', fontWeight: 'bold'}, // Light purple
  {tag: t.modifier, color: '#34d399', fontWeight: 'bold'}, // Emerald
  {tag: t.typeName, color: '#a78bfa', fontWeight: '600'}, // Violet
  {tag: t.standard(t.typeName), color: '#38bdf8', fontWeight: '500'}, // Sky blue
  {tag: t.function(t.variableName), color: '#38bdf8', fontWeight: '600'}, // Sky blue
  {tag: t.propertyName, color: '#f1f5f9', fontWeight: '600'}, // Slate 100
  {tag: t.lineComment, color: '#94a3b8', fontStyle: 'italic'}, // Slate 400
  {tag: t.string, color: '#fb7185'}, // Rose 400
  {tag: t.punctuation, color: '#94a3b8'},
  {tag: t.variableName, color: '#e2e8f0'}, // Slate 200
]);

/**
 * Light theme token colors with high contrast for white/light backgrounds
 */
export const draftrLightHighlightStyle = HighlightStyle.define([
  {tag: t.keyword, color: '#b45309', fontWeight: 'bold'}, // Amber 700
  {tag: t.controlKeyword, color: '#7e22ce', fontWeight: 'bold'}, // Purple 700
  {tag: t.modifier, color: '#047857', fontWeight: 'bold'}, // Emerald 700
  {tag: t.typeName, color: '#6d28d9', fontWeight: '600'}, // Violet 700
  {tag: t.standard(t.typeName), color: '#0284c7', fontWeight: '500'}, // Sky 700
  {tag: t.function(t.variableName), color: '#0369a1', fontWeight: '600'}, // Sky 800
  {tag: t.propertyName, color: '#0f172a', fontWeight: '600'}, // Slate 900 (dark text)
  {tag: t.lineComment, color: '#64748b', fontStyle: 'italic'}, // Slate 500
  {tag: t.string, color: '#be123c'}, // Rose 700
  {tag: t.punctuation, color: '#64748b'},
  {tag: t.variableName, color: '#334155'}, // Slate 700 (dark text)
]);

export const draftrHighlightStyle = draftrDarkHighlightStyle;

export function getDraftrHighlightStyle(mode: 'dark' | 'light' = 'dark') {
  return mode === 'light'
    ? draftrLightHighlightStyle
    : draftrDarkHighlightStyle;
}

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

/**
 * Shortcut: Typing '+' at empty line expands to 'public ', '-' expands to 'private '
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
 * Editor Theme generator supporting light and dark modes
 */
export function getDraftrEditorTheme(mode: 'dark' | 'light' = 'dark') {
  const isDark = mode === 'dark';
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        fontSize: '12px',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        backgroundColor: 'transparent !important',
        color: isDark ? '#f8fafc' : '#020617',
      },
      '.cm-scroller': {
        backgroundColor: 'transparent !important',
        fontFamily: 'inherit',
      },
      '.cm-content': {
        caretColor: isDark ? '#f8fafc' : '#020617',
        lineHeight: '20px',
        padding: '12px 8px',
      },
      '.cm-cursor': {
        borderLeftColor: isDark ? '#f8fafc' : '#020617',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: isDark
          ? 'rgba(168, 85, 247, 0.25) !important'
          : 'rgba(59, 130, 246, 0.2) !important',
      },
      '.cm-gutters': {
        backgroundColor: 'transparent !important',
        color: isDark ? '#94a3b8' : '#64748b',
        borderRight: isDark
          ? '1px solid rgba(255, 255, 255, 0.08)'
          : '1px solid rgba(0, 0, 0, 0.08)',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '11px',
        paddingLeft: '4px',
        paddingRight: '6px',
      },
      '.cm-activeLine': {
        backgroundColor: isDark
          ? 'rgba(255, 255, 255, 0.04)'
          : 'rgba(0, 0, 0, 0.03)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDark
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(0, 0, 0, 0.05)',
        color: isDark ? '#f8fafc' : '#020617',
        fontWeight: 'bold',
      },
      '.cm-tooltip-autocomplete': {
        backgroundColor: isDark ? '#020817' : '#ffffff',
        border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        padding: '4px',
        color: isDark ? '#f8fafc' : '#020617',
      },
      '.cm-tooltip-autocomplete ul li': {
        borderRadius: '4px',
        padding: '3px 8px',
      },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        backgroundColor: isDark
          ? 'rgba(168, 85, 247, 0.25)'
          : 'rgba(59, 130, 246, 0.15)',
        color: isDark ? '#ffffff' : '#020617',
      },
    },
    {dark: isDark}
  );
}

export const draftrEditorTheme = getDraftrEditorTheme('dark');

// Backward compatibility aliases
export const archSpecStreamParser = draftrStreamParser;
export const archSpecStreamLanguage = draftrStreamLanguage;
export const archSpecDarkHighlightStyle = draftrDarkHighlightStyle;
export const archSpecLightHighlightStyle = draftrLightHighlightStyle;
export const archSpecHighlightStyle = draftrHighlightStyle;
export const getArchSpecHighlightStyle = getDraftrHighlightStyle;
export const computeArchSpecIndent = computeDraftrIndent;
export const archSpecIndentService = draftrIndentService;
export const handleArchSpecShortcut = handleDraftrShortcut;
export const archSpecShortcuts = draftrShortcuts;
export const createArchSpecCompletions = createDraftrCompletions;
export const getArchSpecEditorTheme = getDraftrEditorTheme;
export const archSpecEditorTheme = draftrEditorTheme;
