import {describe, it, expect, vi} from 'vitest';
import {EditorState} from '@codemirror/state';
import {CompletionContext} from '@codemirror/autocomplete';
import {StringStream} from '@codemirror/language';
import {
  computeDraftrIndent,
  createDraftrCompletions,
  draftrStreamLanguage,
  draftrStreamParser,
  handleDraftrShortcut,
  draftrShortcuts,
  getDraftrHighlightStyle,
  getDraftrEditorTheme,
} from '../draftrCodeMirror';
import type {ArchitectureProject} from '@draftr/core';

describe('draftrCodeMirror extensions', () => {
  describe('indentation computation', () => {
    it('indents 2 spaces after class definition', () => {
      const indent = computeDraftrIndent('class AuthService');
      expect(indent).toBe(2);
    });

    it('indents 2 spaces after abstract class definition', () => {
      const indent = computeDraftrIndent('abstract class BaseService');
      expect(indent).toBe(2);
    });

    it('indents 2 spaces after ui block', () => {
      const indent = computeDraftrIndent('ui Dashboard');
      expect(indent).toBe(2);
    });

    it('indents 4 spaces after a method definition (for calls)', () => {
      const indent = computeDraftrIndent('  public login(): string');
      expect(indent).toBe(4);
    });

    it('preserves 4 spaces after a calls line', () => {
      const indent = computeDraftrIndent('    calls UserRepo');
      expect(indent).toBe(4);
    });

    it('uses 0 spaces at root level on empty line', () => {
      const indent = computeDraftrIndent('');
      expect(indent).toBe(0);
    });
  });

  describe('completions', () => {
    const mockProject: ArchitectureProject = {
      id: 'proj-1',
      name: 'Demo',
      rawOutlineText: '',
      classes: [
        {
          id: 'c-1',
          name: 'UserService',
          kind: 'class',
          methods: [],
          properties: [],
        },
      ],
      uiComponents: [],
      connections: [],
      createdAt: 0,
      updatedAt: 0,
    };

    it('returns keywords and entity completions', () => {
      const completionSource = createDraftrCompletions(mockProject);
      const state = EditorState.create({
        doc: 'User',
      });
      const context = new CompletionContext(state, 4, true);
      const result = completionSource(context);

      expect(result).not.toBeNull();
      const labels = result?.options.map(o => o.label);
      expect(labels).toContain('UserService');
      expect(labels).toContain('class');
      expect(labels).toContain('abstract');
      expect(labels).toContain('extends');
      expect(labels).toContain('implements');
      expect(labels).toContain('override');
      expect(labels).toContain('calls');
    });

    it('returns null when not explicit and no word match', () => {
      const completionSource = createDraftrCompletions(mockProject);
      const state = EditorState.create({
        doc: '',
      });
      const context = new CompletionContext(state, 0, false);
      const result = completionSource(context);
      expect(result).toBeNull();
    });
  });

  describe('shortcuts', () => {
    it('expands + to public when typed at empty line start', () => {
      const state = EditorState.create({doc: '  '});
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, 2, 2, '+');
      expect(handled).toBe(true);
      expect(dispatch).toHaveBeenCalledWith({
        changes: {from: 2, to: 2, insert: 'public '},
        selection: {anchor: 9},
      });
    });

    it('expands - to private when typed at empty line start', () => {
      const state = EditorState.create({doc: ''});
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, 0, 0, '-');
      expect(handled).toBe(true);
      expect(dispatch).toHaveBeenCalledWith({
        changes: {from: 0, to: 0, insert: 'private '},
        selection: {anchor: 8},
      });
    });

    it('ignores + or - if text exists earlier on the line', () => {
      const state = EditorState.create({doc: 'const x = '});
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, 10, 10, '+');
      expect(handled).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('ignores other characters', () => {
      const state = EditorState.create({doc: ''});
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, 0, 0, 'a');
      expect(handled).toBe(false);
    });

    it('defines draftrShortcuts plugin extension', () => {
      expect(draftrShortcuts).toBeDefined();
    });
  });

  describe('stream language & tokenizer', () => {
    function tokenizeLine(line: string) {
      const stream = new StringStream(line, 2, 2);
      const tokens: Array<{token: string | null; text: string}> = [];
      while (!stream.eol()) {
        const start = stream.pos;
        const token = draftrStreamParser.token(stream);
        tokens.push({token, text: stream.string.slice(start, stream.pos)});
      }
      return tokens;
    }

    it('defines StreamLanguage extension correctly', () => {
      expect(draftrStreamLanguage).toBeDefined();
    });

    it('tokenizes comments and arrows', () => {
      const tokens = tokenizeLine('// this is a comment');
      expect(tokens[0].token).toBe('comment');

      const arrowTokens = tokenizeLine('-> Target');
      expect(arrowTokens[0].token).toBe('action');
    });

    it('tokenizes strings', () => {
      const dQuote = tokenizeLine('"hello world"');
      expect(dQuote[0].token).toBe('string');

      const sQuote = tokenizeLine("'single quoted'");
      expect(sQuote[0].token).toBe('string');
    });

    it('tokenizes modifiers (+, -, public, private, pk)', () => {
      const plusMod = tokenizeLine('+ id');
      expect(plusMod[0].token).toBe('modifier');

      const pubMod = tokenizeLine('public run');
      expect(pubMod[0].token).toBe('modifier');

      const overrideMod = tokenizeLine('override run');
      expect(overrideMod[0].token).toBe('modifier');

      const pkMod = tokenizeLine('pk id');
      expect(pkMod[0].token).toBe('modifier');
    });

    it('tokenizes keywords, verbs, primitives, and types', () => {
      const kw = tokenizeLine('class ui db api abstract extends implements');
      expect(kw.filter(t => t.token === 'keyword').length).toBe(7);

      const verb = tokenizeLine('GET POST');
      expect(verb.filter(t => t.token === 'keyword').length).toBe(2);

      const prim = tokenizeLine('string number boolean');
      expect(prim.filter(t => t.token === 'primitive').length).toBe(3);

      const action = tokenizeLine('calls binds');
      expect(action.filter(t => t.token === 'action').length).toBe(2);

      const type = tokenizeLine('UserService');
      expect(type[0].token).toBe('type');
    });

    it('tokenizes function calls and properties', () => {
      const fn = tokenizeLine('execute()');
      expect(fn[0].token).toBe('function');

      const prop = tokenizeLine('title:');
      expect(prop[0].token).toBe('property');
    });
  });

  describe('themes and highlight styles', () => {
    it('provides distinct highlight styles for dark and light mode', () => {
      const darkStyle = getDraftrHighlightStyle('dark');
      const lightStyle = getDraftrHighlightStyle('light');
      expect(darkStyle).toBeDefined();
      expect(lightStyle).toBeDefined();
      expect(darkStyle).not.toBe(lightStyle);
    });

    it('generates editor themes for dark and light mode', () => {
      const darkTheme = getDraftrEditorTheme('dark');
      const lightTheme = getDraftrEditorTheme('light');
      expect(darkTheme).toBeDefined();
      expect(lightTheme).toBeDefined();
    });
  });
});
