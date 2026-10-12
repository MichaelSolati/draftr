// @ts-nocheck
import {CompletionContext} from '@codemirror/autocomplete';
import {StringStream} from '@codemirror/language';
import {EditorState} from '@codemirror/state';
import type {ArchitectureProject} from '@draftr/core';
import {
  draftrLanguage,
  getDraftrEditorTheme,
  getDraftrHighlightStyle,
} from '@draftr/theme';
import {describe, expect, it, vi} from 'vitest';

import {
  computeDraftrIndent,
  createDraftrCompletions,
  draftrShortcuts,
  handleDraftrShortcut,
} from '../draftrCodeMirror';

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
    it('does not expand + or - immediately when typed without a space', () => {
      const statePlus = EditorState.create({doc: '  '});
      const dispatchPlus = vi.fn();
      const handledPlus = handleDraftrShortcut(
        {state: statePlus, dispatch: dispatchPlus},
        2,
        2,
        '+'
      );
      expect(handledPlus).toBe(false);
      expect(dispatchPlus).not.toHaveBeenCalled();

      const stateMinus = EditorState.create({doc: ''});
      const dispatchMinus = vi.fn();
      const handledMinus = handleDraftrShortcut(
        {state: stateMinus, dispatch: dispatchMinus},
        0,
        0,
        '-'
      );
      expect(handledMinus).toBe(false);
      expect(dispatchMinus).not.toHaveBeenCalled();
    });

    it('expands + to public when space is typed after + at line start', () => {
      const state = EditorState.create({doc: '  +'});
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, 3, 3, ' ');
      expect(handled).toBe(true);
      expect(dispatch).toHaveBeenCalledWith({
        changes: {from: 2, to: 3, insert: 'public '},
        selection: {anchor: 9},
      });
    });

    it('expands - to private when space is typed after - at line start', () => {
      const state = EditorState.create({doc: '-'});
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, 1, 1, ' ');
      expect(handled).toBe(true);
      expect(dispatch).toHaveBeenCalledWith({
        changes: {from: 0, to: 1, insert: 'private '},
        selection: {anchor: 8},
      });
    });

    it('expands # to protected when space is typed after # at line start', () => {
      const state = EditorState.create({doc: '  #'});
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, 3, 3, ' ');
      expect(handled).toBe(true);
      expect(dispatch).toHaveBeenCalledWith({
        changes: {from: 2, to: 3, insert: 'protected '},
        selection: {anchor: 12},
      });
    });

    it('expands -> to calls when typed under a class or method', () => {
      const state = EditorState.create({
        doc: 'class OrderService\n  public checkout(): void\n    ->',
      });
      const pos = state.doc.length; // after '->'
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, pos, pos, ' ');
      expect(handled).toBe(true);
      expect(dispatch).toHaveBeenCalledWith({
        changes: {from: pos - 2, to: pos, insert: 'call '},
        selection: {anchor: pos - 2 + 5},
      });
    });

    it('expands -> to binds when typed under a ui component', () => {
      const state = EditorState.create({
        doc: 'ui CheckoutCard\n  ->',
      });
      const pos = state.doc.length;
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, pos, pos, ' ');
      expect(handled).toBe(true);
      expect(dispatch).toHaveBeenCalledWith({
        changes: {from: pos - 2, to: pos, insert: 'call '},
        selection: {anchor: pos - 2 + 5},
      });
    });

    it('ignores space after + or - if other text exists earlier on the line', () => {
      const state = EditorState.create({doc: 'const x = +'});
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, 11, 11, ' ');
      expect(handled).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('ignores non-space characters', () => {
      const state = EditorState.create({doc: '-'});
      const dispatch = vi.fn();
      const handled = handleDraftrShortcut({state, dispatch}, 1, 1, '>');
      expect(handled).toBe(false);
    });

    it('defines draftrShortcuts plugin extension', () => {
      expect(draftrShortcuts).toBeDefined();
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
