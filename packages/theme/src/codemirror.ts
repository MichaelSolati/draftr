import {
  HighlightStyle,
  LanguageSupport,
  LRLanguage,
} from '@codemirror/language';
import {EditorView} from '@codemirror/view';
import {parser} from '@draftr/grammar';
import {styleTags, tags as t} from '@lezer/highlight';

import {draftrTokens} from './tokens';

/**
 * LRLanguage definition for draftr DSL
 */
export const draftrLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        // Block declaration keywords (Amber)
        'class interface type ui db api event state function': t.keyword,

        // Control / action verbs (Purple)
        'calls call invokes emit dispatch query mutate render action binds bind extends implements':
          t.controlKeyword,
        ActionVerb: t.controlKeyword,
        '->': t.controlKeyword,

        // Modifiers (Emerald)
        'Visibility HttpMethod': t.modifier,
        'public private protected readonly override abstract static async get set':
          t.modifier,
        'pk fk unique nullable index default': t.modifier,
        'ColumnModifier Modifier': t.modifier,
        '+ - #': t.modifier,

        // Entity / Class declarations (Amber)
        'ClassDeclaration/Identifier': t.definition(t.className),
        'UiDeclaration/Identifier': t.definition(t.className),
        'TableDeclaration/Identifier': t.definition(t.className),
        'ApiRouteDeclaration/Identifier': t.definition(t.className),
        'EventDeclaration/Identifier': t.definition(t.className),
        'StateDeclaration/Identifier': t.definition(t.className),

        // Method / Function names (Yellow)
        'MethodDeclaration/Identifier': t.function(t.variableName),
        'FunctionDeclaration/Identifier': t.function(t.variableName),
        'StateActionDeclaration/Identifier': t.function(t.variableName),

        // Property / Column names (Slate)
        'PropertyDeclaration/Identifier': t.propertyName,
        'ColumnDeclaration/Identifier': t.propertyName,
        'PropDeclaration/Identifier': t.propertyName,

        // Target Entity / Member (Teal)
        InvocationTarget: t.typeName,
        'InvocationTarget/Identifier': t.typeName,

        // Type names (Sky)
        'Type/Identifier': t.standard(t.typeName),
        'Type/TypeComponent/Identifier': t.standard(t.typeName),
        'Type/...': t.standard(t.typeName),

        // General fallbacks
        Identifier: t.variableName,
        RoutePath: t.string,
        String: t.string,
        Comment: t.lineComment,
        '( )': t.paren,
        '[ ]': t.squareBracket,
        ': , . ?': t.punctuation,
      }),
    ],
  }),
  languageData: {
    commentTokens: {line: '//'},
  },
});

export function draftr() {
  return new LanguageSupport(draftrLanguage);
}

/**
 * Dark theme token colors matching our design system
 */
export const draftrDarkHighlightStyle = HighlightStyle.define([
  {tag: t.keyword, color: draftrTokens.dark.object_type, fontWeight: 'bold'},
  {tag: t.controlKeyword, color: draftrTokens.dark.verb, fontWeight: 'bold'},
  {tag: t.modifier, color: draftrTokens.dark.modifier, fontWeight: 'bold'},
  {
    tag: t.definition(t.className),
    color: draftrTokens.dark.object_type,
    fontWeight: 'bold',
  },
  {tag: t.typeName, color: draftrTokens.dark.target, fontWeight: '600'},
  {
    tag: t.standard(t.typeName),
    color: draftrTokens.dark.type,
    fontWeight: '500',
  },
  {
    tag: t.function(t.variableName),
    color: draftrTokens.dark.name_fn,
    fontWeight: '600',
  },
  {tag: t.propertyName, color: draftrTokens.dark.name, fontWeight: '600'},
  {tag: t.lineComment, color: draftrTokens.dark.comment, fontStyle: 'italic'},
  {tag: t.string, color: draftrTokens.dark.string},
  {tag: t.punctuation, color: draftrTokens.dark.comment},
  {tag: t.variableName, color: draftrTokens.dark.name},
]);

/**
 * Light theme token colors with high contrast for white/light backgrounds
 */
export const draftrLightHighlightStyle = HighlightStyle.define([
  {tag: t.keyword, color: draftrTokens.light.object_type, fontWeight: 'bold'},
  {tag: t.controlKeyword, color: draftrTokens.light.verb, fontWeight: 'bold'},
  {tag: t.modifier, color: draftrTokens.light.modifier, fontWeight: 'bold'},
  {
    tag: t.definition(t.className),
    color: draftrTokens.light.object_type,
    fontWeight: 'bold',
  },
  {tag: t.typeName, color: draftrTokens.light.target, fontWeight: '600'},
  {
    tag: t.standard(t.typeName),
    color: draftrTokens.light.type,
    fontWeight: '500',
  },
  {
    tag: t.function(t.variableName),
    color: draftrTokens.light.name_fn,
    fontWeight: '600',
  },
  {tag: t.propertyName, color: draftrTokens.light.name, fontWeight: '600'},
  {tag: t.lineComment, color: draftrTokens.light.comment, fontStyle: 'italic'},
  {tag: t.string, color: draftrTokens.light.string},
  {tag: t.punctuation, color: draftrTokens.light.comment},
  {tag: t.variableName, color: draftrTokens.light.name},
]);

export const draftrHighlightStyle = draftrDarkHighlightStyle;

export function getDraftrHighlightStyle(mode: 'dark' | 'light' = 'dark') {
  return mode === 'light'
    ? draftrLightHighlightStyle
    : draftrDarkHighlightStyle;
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
