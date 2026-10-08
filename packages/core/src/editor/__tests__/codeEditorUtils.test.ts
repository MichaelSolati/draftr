import {describe, it, expect} from 'vitest';
import {
  computeEnterIndent,
  handleTabIndent,
  handleBracketPair,
  handleBackspaceBracket,
  toggleLineComment,
  getActiveTokenInfo,
  getAutocompleteSuggestions,
  extractReferencedItems,
  extractEntityRawSnippet,
} from '../codeEditorUtils';
import {type ArchitectureProject} from '../../types/spec';

describe('codeEditorUtils', () => {
  describe('computeEnterIndent', () => {
    it('indents after class declaration', () => {
      expect(computeEnterIndent('class AuthService')).toBe('\t');
    });

    it('indents after ui declaration', () => {
      expect(computeEnterIndent('\tui Header')).toBe('\t\t');
    });

    it('indents after arrow call if ends with arrow', () => {
      expect(computeEnterIndent('\t+ execute(): void ->')).toBe('\t\t');
    });

    it('preserves existing indent on normal member line', () => {
      expect(computeEnterIndent('\t+ login(creds: Credentials): Session')).toBe(
        '\t'
      );
    });

    it('preserves indent on sub-bullet invocation line', () => {
      expect(computeEnterIndent('\t\t-> TokenService.sign')).toBe('\t\t');
    });
  });

  describe('handleTabIndent', () => {
    it('inserts a tab on single line without selection', () => {
      const res = handleTabIndent('class Foo\n', 9, 9, false);
      expect(res.newValue).toBe('class Foo\t\n');
      expect(res.newStart).toBe(10);
    });

    it('indents multiple lines when selected', () => {
      const input = 'line1\nline2';
      const res = handleTabIndent(input, 0, 11, false);
      expect(res.newValue).toBe('\tline1\n\tline2');
    });

    it('outdents multiple lines with shift key', () => {
      const input = '\tline1\n\tline2';
      const res = handleTabIndent(input, 0, 13, true);
      expect(res.newValue).toBe('line1\nline2');
    });
  });

  describe('handleBracketPair', () => {
    it('auto-closes parentheses', () => {
      const res = handleBracketPair('(', 'hello', 5, 5);
      expect(res?.newValue).toBe('hello()');
      expect(res?.newStart).toBe(6);
    });

    it('wraps selected text in quotes', () => {
      const res = handleBracketPair('"', 'hello world', 0, 5);
      expect(res?.newValue).toBe('"hello" world');
    });

    it('steps over matching closing bracket', () => {
      const res = handleBracketPair(')', 'func()', 5, 5);
      expect(res?.newValue).toBe('func()');
      expect(res?.newStart).toBe(6);
    });
  });

  describe('handleBackspaceBracket', () => {
    it('deletes empty bracket pair', () => {
      const res = handleBackspaceBracket('foo()', 4, 4);
      expect(res?.newValue).toBe('foo');
      expect(res?.newCursor).toBe(3);
    });

    it('does nothing when characters do not match', () => {
      const res = handleBackspaceBracket('foo(a)', 4, 4);
      expect(res).toBeNull();
    });
  });

  describe('toggleLineComment', () => {
    it('comments an uncommented line', () => {
      const res = toggleLineComment('  foo()', 2, 2);
      expect(res.newValue).toBe('  // foo()');
    });

    it('uncomments a commented line', () => {
      const res = toggleLineComment('  // foo()', 5, 5);
      expect(res.newValue).toBe('  foo()');
    });
  });

  describe('autocomplete & reference extraction', () => {
    const mockProject: ArchitectureProject = {
      id: 'test',
      name: 'Test',
      rawOutlineText: '',
      classes: [
        {
          id: 'entity-AuthService',
          name: 'AuthService',
          kind: 'class',
          properties: [],
          methods: [
            {
              name: 'login',
              visibility: 'public',
              parameters: [],
              returnType: 'Session',
            },
          ],
        },
      ],
      uiComponents: [],
      tables: [{id: 'tbl-users', name: 'Users', columns: []}],
      apiRoutes: [],
      events: [],
      states: [],
      connections: [],
      updatedAt: 0,
      createdAt: 0,
    };

    it('provides autocomplete suggestions for dot-notation member calls', () => {
      const tokenInfo = getActiveTokenInfo('  -> AuthService.', 17);
      const suggestions = getAutocompleteSuggestions(tokenInfo, mockProject);
      expect(suggestions.some(s => s.label === 'login()')).toBe(true);
    });

    it('extracts referenced items for chips', () => {
      const snippet =
        'class OrderService\n  + checkout(): void\n    -> AuthService.login\n  emits OrderCreated';
      const mockProjectWithEvent = {
        ...mockProject,
        events: [
          {
            id: 'event-OrderCreated',
            name: 'OrderCreated',
            payloadType: 'void',
            targets: [],
          },
        ],
      };
      const refs = extractReferencedItems(snippet, mockProjectWithEvent);
      expect(refs.length).toBe(2);
      expect(refs[0].name).toBe('AuthService');
      expect(refs[0].member).toBe('login');
      expect(refs[0].kind).toBe('class');
      expect(refs[1].name).toBe('OrderCreated');
      expect(refs[1].kind).toBe('event');
    });

    it('extracts verbatim entity snippet from full text', () => {
      const fullText =
        '// Outline\nclass FooService\n  + doFoo(): void\n\nclass BarService\n  + doBar(): void\n';
      const snippet = extractEntityRawSnippet(fullText, 'FooService');
      expect(snippet).toBe('class FooService\n  + doFoo(): void');
    });

    it('provides type autocomplete after colon', () => {
      const tokenInfo = getActiveTokenInfo('  + id: str', 11);
      const suggestions = getAutocompleteSuggestions(tokenInfo, mockProject);
      expect(suggestions.some(s => s.label === 'string')).toBe(true);
    });
  });
});
