import {draftrTokens} from './tokens';

/**
 * Prism language grammar for Draftr DSL.
 * This can be registered in Prism.languages.draftr = draftrPrismLanguage;
 */
export const draftrPrismLanguage = {
  comment: {
    pattern: /\/\/.*/,
    greedy: true,
  },
  string: {
    pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
  },
  verb: {
    pattern: /\b(?:call|emit|dispatch|query|mutate|render)\b|->/,
    alias: 'control-flow',
  },
  object_type:
    /\b(?:class|interface|type|ui|db|api|event|state|abstract|function|extends|implements)\b/,
  modifier: {
    pattern:
      /(^[ \t]*)[+\-#](?=\s)|(?:public|private|protected|readonly|get|set|override|static|async|prop|action|pk|fk|unique|nullable|index|default|GET|POST|PUT|DELETE|PATCH)\b/m,
    lookbehind: true,
    alias: 'symbol',
  },
  type: {
    pattern:
      /\b(?:string|number|boolean|any|void|never|unknown|uuid|text|int|serial|timestamp|jsonb)\b/,
    alias: 'builtin',
  },
  name_fn: {
    pattern: /[a-z0-9_]+(?=\()/i,
    inside: {
      punctuation: /\(/,
    },
  },
  name: {
    pattern: /[a-z0-9_]+(?=:)/i,
  },
  target: {
    pattern: /\b[A-Z][a-zA-Z0-9_]*\b/,
  },
  punctuation: /[{}( )[\].,:]/,
};

/**
 * Prism language grammar for Draftr Documentation Syntax.
 * This highlights literal bracketed placeholders like [object_type], [visibility], etc.
 */
export const draftrSyntaxPrismLanguage = {
  object_type: {
    pattern: /\[object_type\]/,
  },
  target: {
    pattern: /\[target\]/,
  },
  modifier: {
    pattern: /\[(?:visibility|modifier)\]/,
    alias: 'symbol',
  },
  name: {
    pattern: /\[name\]/,
  },
  type: {
    pattern: /\[type\]/,
    alias: 'builtin',
  },
  verb: {
    pattern: /\[verb\]/,
    alias: 'control-flow',
  },
  payload: {
    pattern: /\[payload\]/,
    alias: 'variable',
  },
  punctuation: /[{}( )[\].,:]/,
};

export interface DraftrPrismThemeStyle {
  types: string[];
  style: {
    color?: string;
    backgroundColor?: string;
    fontStyle?: 'normal' | 'italic';
    fontWeight?:
      | 'normal'
      | 'bold'
      | '100'
      | '200'
      | '300'
      | '400'
      | '500'
      | '600'
      | '700'
      | '800'
      | '900';
    opacity?: number;
    textDecorationLine?:
      | 'none'
      | 'underline'
      | 'line-through'
      | 'underline line-through';
  };
}

export interface DraftrPrismTheme {
  plain: {
    color: string;
    backgroundColor: string;
  };
  styles: DraftrPrismThemeStyle[];
}

/**
 * prism-react-renderer theme configuration using centralized Draftr tokens
 */
export function getDraftrPrismTheme(
  mode: 'dark' | 'light' = 'dark'
): DraftrPrismTheme {
  const isDark = mode === 'dark';
  const tokens = isDark ? draftrTokens.dark : draftrTokens.light;

  return {
    plain: {
      color: isDark ? '#f8fafc' : '#020617',
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
    },
    styles: [
      {
        types: ['comment'],
        style: {
          color: tokens.comment,
          fontStyle: 'italic',
        },
      },
      {
        types: ['string'],
        style: {
          color: tokens.string,
        },
      },
      {
        types: ['object_type'],
        style: {
          color: tokens.object_type,
          fontWeight: 'bold',
        },
      },
      {
        types: ['verb', 'control-flow'],
        style: {
          color: tokens.verb,
          fontWeight: 'bold',
        },
      },
      {
        types: ['modifier', 'symbol'],
        style: {
          color: tokens.modifier,
          fontWeight: 'bold',
        },
      },
      {
        types: ['type', 'builtin'],
        style: {
          color: tokens.type,
          fontWeight: '500',
        },
      },
      {
        types: ['name_fn'],
        style: {
          color: tokens.name_fn, // Yellow for functions
          fontWeight: '600',
        },
      },
      {
        types: ['name'],
        style: {
          color: tokens.name,
          fontWeight: '600',
        },
      },
      {
        types: ['target'],
        style: {
          color: tokens.target,
          fontWeight: '600',
        },
      },
      {
        types: ['punctuation'],
        style: {
          color: tokens.comment, // Soft color for punctuation
        },
      },
      {
        types: ['variable'],
        style: {
          color: tokens.name,
        },
      },
    ],
  };
}

export const draftrDarkPrismTheme = getDraftrPrismTheme('dark');
export const draftrLightPrismTheme = getDraftrPrismTheme('light');
