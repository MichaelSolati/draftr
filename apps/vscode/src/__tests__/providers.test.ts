import {describe, expect, it, vi} from 'vitest';

vi.mock('vscode', () => {
  class Position {
    constructor(
      public line: number,
      public character: number
    ) {}
  }

  class Range {
    constructor(
      public start: Position,
      public end: Position
    ) {}
  }

  class Diagnostic {
    public source?: string;
    public code?: string;
    constructor(
      public range: Range,
      public message: string,
      public severity: number
    ) {}
  }

  class CompletionItem {
    public kind?: number;
    public insertText?: string;
    public detail?: string;
    public filterText?: string;
    public range?: Range | {inserting: Range; replacing: Range};
    constructor(public label: string) {}
  }

  class DocumentSymbol {
    public children: DocumentSymbol[] = [];
    constructor(
      public name: string,
      public detail: string,
      public kind: number,
      public range: Range,
      public selectionRange: Range
    ) {}
  }

  class Location {
    constructor(
      public uri: unknown,
      public range: Range
    ) {}
  }

  class Hover {
    constructor(public contents: unknown) {}
  }

  class MarkdownString {
    public value = '';
    appendCodeblock(code: string) {
      this.value += '\n' + code;
      return this;
    }
    appendMarkdown(text: string) {
      this.value += text;
      return this;
    }
  }

  class CodeAction {
    public diagnostics?: Diagnostic[];
    public isPreferred?: boolean;
    public edit?: unknown;
    constructor(
      public title: string,
      public kind?: unknown
    ) {}
  }

  class WorkspaceEdit {
    public edits: Array<{uri: unknown; range: Range; newText: string}> = [];
    replace(uri: unknown, range: Range, newText: string) {
      this.edits.push({uri, range, newText});
    }
  }

  const Uri = {
    file: (path: string) => ({fsPath: path, toString: () => `file://${path}`}),
  };

  return {
    Position,
    Range,
    Diagnostic,
    CompletionItem,
    DocumentSymbol,
    Location,
    Hover,
    MarkdownString,
    CodeAction,
    WorkspaceEdit,
    CodeActionKind: {
      QuickFix: 'quickfix',
    },
    Uri,
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3,
    },
    CompletionItemKind: {
      Class: 6,
      Method: 1,
      Struct: 21,
      TypeParameter: 24,
      Keyword: 13,
      Property: 9,
    },
    SymbolKind: {
      Class: 4,
      Interface: 10,
      Method: 5,
      Property: 6,
      Field: 7,
      Module: 1,
      Struct: 22,
      Operator: 24,
      Event: 23,
    },
    languages: {
      createDiagnosticCollection: vi.fn(() => ({
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        dispose: vi.fn(),
      })),
      registerCompletionItemProvider: vi.fn(() => ({dispose: vi.fn()})),
      registerDocumentSymbolProvider: vi.fn(() => ({dispose: vi.fn()})),
      registerDefinitionProvider: vi.fn(() => ({dispose: vi.fn()})),
      registerHoverProvider: vi.fn(() => ({dispose: vi.fn()})),
      registerCodeActionsProvider: vi.fn(() => ({dispose: vi.fn()})),
    },
    workspace: {
      onDidOpenTextDocument: vi.fn(() => ({dispose: vi.fn()})),
      onDidChangeTextDocument: vi.fn(() => ({dispose: vi.fn()})),
      onDidCloseTextDocument: vi.fn(() => ({dispose: vi.fn()})),
    },
    window: {
      activeTextEditor: undefined,
    },
  };
});

import * as vscode from 'vscode';

import {
  DraftrCodeActionProvider,
  registerCodeActions,
} from '../providers/codeActions';
import {
  DraftrCompletionItemProvider,
  registerCompletions,
} from '../providers/completions';
import {
  DraftrDefinitionProvider,
  registerDefinitions,
} from '../providers/definitions';
import {
  computeDiagnostics,
  registerDiagnostics,
} from '../providers/diagnostics';
import {DraftrHoverProvider, registerHover} from '../providers/hover';
import {
  DraftrDocumentSymbolProvider,
  registerSymbols,
} from '../providers/symbols';
import {createProjectFromText} from '../utils/project';

// Minimal mock of vscode.TextDocument for headless testing
function createMockDocument(
  content: string,
  languageId = 'draftr'
): vscode.TextDocument {
  const lines = content.split('\n');
  return {
    uri: vscode.Uri.file('/test/spec.draftr'),
    fileName: '/test/spec.draftr',
    languageId,
    lineCount: lines.length,
    getText: (range?: vscode.Range) => {
      if (!range) return content;
      const line = lines[range.start.line] ?? '';
      return line.slice(range.start.character, range.end.character);
    },
    lineAt: (lineIdx: number) => {
      const text = lines[lineIdx] ?? '';
      return {
        text,
        range: new vscode.Range(
          new vscode.Position(lineIdx, 0),
          new vscode.Position(lineIdx, text.length)
        ),
      } as vscode.TextLine;
    },
    getWordRangeAtPosition: (
      pos: vscode.Position,
      regex = /[A-Za-z0-9_$]+/
    ) => {
      const line = lines[pos.line] ?? '';
      let start = pos.character;
      while (start > 0 && regex.test(line[start - 1] ?? '')) {
        start--;
      }
      let end = pos.character;
      while (end < line.length && regex.test(line[end] ?? '')) {
        end++;
      }
      if (start === end) return undefined;
      return new vscode.Range(
        new vscode.Position(pos.line, start),
        new vscode.Position(pos.line, end)
      );
    },
  } as unknown as vscode.TextDocument;
}

describe('VS Code Language Providers', () => {
  describe('computeDiagnostics', () => {
    it('returns empty diagnostics for valid spec without issues', () => {
      const doc = createMockDocument(`
class OrderService
  + checkout(): void
`);
      const diags = computeDiagnostics(doc);
      expect(diags).toHaveLength(0);
    });

    it('flags architectural issues (e.g. UI calling DB directly)', () => {
      const doc = createMockDocument(`
db UsersTable
  + id: uuid pk

ui Dashboard
  binds UsersTable
`);
      const diags = computeDiagnostics(doc);
      expect(diags.length).toBeGreaterThan(0);
      expect(diags.some(d => d.message.includes('ui-db-leak'))).toBe(true);
    });

    it('ignores documents with non-draftr languages', () => {
      const doc = createMockDocument('class Foo', 'markdown');
      const diags = computeDiagnostics(doc);
      expect(diags).toHaveLength(0);
    });
  });

  describe('DraftrCompletionItemProvider', () => {
    it('provides suggestions for keywords at line start', () => {
      const provider = new DraftrCompletionItemProvider();
      const doc = createMockDocument('cla');
      const items = provider.provideCompletionItems(
        doc,
        new vscode.Position(0, 3)
      ) as vscode.CompletionItem[];

      expect(items.length).toBeGreaterThan(0);
      expect(items.some(i => i.label === 'class')).toBe(true);
    });

    it('suggests existing entities when typing after calls keyword', () => {
      const provider = new DraftrCompletionItemProvider();
      const doc = createMockDocument(`class PaymentService
  + charge(): boolean

class OrderService
  calls `);
      const items = provider.provideCompletionItems(
        doc,
        new vscode.Position(4, 8)
      ) as vscode.CompletionItem[];

      expect(items.length).toBeGreaterThan(0);
      expect(
        items.some(i => i.label.toString().includes('PaymentService'))
      ).toBe(true);
    });

    it('provides replacement range for modifier shortcuts like +', () => {
      const provider = new DraftrCompletionItemProvider();
      const doc = createMockDocument('class OrderService\n  +');
      const items = provider.provideCompletionItems(
        doc,
        new vscode.Position(1, 3)
      ) as vscode.CompletionItem[];

      const publicItem = items.find(i =>
        i.label.toString().includes('+ (public)')
      );
      expect(publicItem).toBeDefined();
      expect(publicItem?.insertText).toBe('public ');
      const range = publicItem?.range as {
        inserting: vscode.Range;
        replacing: vscode.Range;
      };
      expect(range).toBeDefined();
      expect(range.inserting.start.character).toBe(2);
      expect(range.inserting.end.character).toBe(3);
      expect(range.replacing.start.character).toBe(2);
      expect(range.replacing.end.character).toBe(3);
      expect(publicItem?.filterText).toBe('+');
    });
  });

  describe('DraftrDocumentSymbolProvider', () => {
    it('builds symbol tree containing classes and child methods', () => {
      const provider = new DraftrDocumentSymbolProvider();
      const doc = createMockDocument(`class OrderService
  + checkout(): boolean
  - secretKey: string

ui OrderCard
  binds OrderService

db OrdersTable
  + id: uuid pk
`);
      const symbols = provider.provideDocumentSymbols(
        doc
      ) as vscode.DocumentSymbol[];
      expect(symbols).toBeDefined();

      const orderClass = symbols.find(s => s.name === 'OrderService');
      expect(orderClass).toBeDefined();
      expect(orderClass?.children.length).toBe(2);

      const uiComp = symbols.find(s => s.name === 'OrderCard');
      expect(uiComp).toBeDefined();

      const table = symbols.find(s => s.name === 'OrdersTable');
      expect(table).toBeDefined();
      expect(table?.children.length).toBe(1);
    });
  });

  describe('createProjectFromText', () => {
    it('constructs an ArchitectureProject with metadata', () => {
      const proj = createProjectFromText('class User\n  + id: string');
      expect(proj.id).toBe('active-spec');
      expect(proj.classes).toHaveLength(1);
      expect(proj.classes[0].name).toBe('User');
    });
  });

  describe('DraftrDefinitionProvider', () => {
    it('navigates to class declaration when cursor is on class name', () => {
      const provider = new DraftrDefinitionProvider();
      const doc = createMockDocument(`class PaymentService
  + charge(): void

class OrderService
  calls PaymentService`);

      // Cursor at PaymentService reference in OrderService line 4, col 10
      const loc = provider.provideDefinition(
        doc,
        new vscode.Position(4, 10)
      ) as vscode.Location;

      expect(loc).toBeDefined();
      expect(loc.range.start.line).toBe(0);
    });

    it('navigates to db table declaration when cursor is on table name', () => {
      const provider = new DraftrDefinitionProvider();
      const doc = createMockDocument(`db UsersTable
  + id: uuid pk

ui Dashboard
  binds UsersTable`);

      const loc = provider.provideDefinition(
        doc,
        new vscode.Position(4, 10)
      ) as vscode.Location;

      expect(loc).toBeDefined();
      expect(loc.range.start.line).toBe(0);
    });

    it('navigates to ui declaration when cursor is on ui name', () => {
      const provider = new DraftrDefinitionProvider();
      const doc = createMockDocument(`ui HeaderCard
  renders title

ui Dashboard
  renders HeaderCard`);

      const loc = provider.provideDefinition(
        doc,
        new vscode.Position(4, 12)
      ) as vscode.Location;

      expect(loc).toBeDefined();
      expect(loc.range.start.line).toBe(0);
    });

    it('returns null for unknown symbol', () => {
      const provider = new DraftrDefinitionProvider();
      const doc = createMockDocument('class Foo\n');
      const loc = provider.provideDefinition(
        doc,
        new vscode.Position(0, 0)
      ) as vscode.Location;
      expect(loc).toBeNull();
    });
  });

  describe('DraftrHoverProvider', () => {
    it('provides markdown hover details for class entities', () => {
      const provider = new DraftrHoverProvider();
      const doc = createMockDocument(`class OrderService
  + checkout(): boolean
  - secret: string`);

      const hover = provider.provideHover(
        doc,
        new vscode.Position(0, 8)
      ) as vscode.Hover;

      expect(hover).toBeDefined();
      const md = hover.contents as unknown as vscode.MarkdownString;
      expect(md.value).toContain('class OrderService');
      expect(md.value).toContain('Methods');
    });

    it('provides hover details for db tables', () => {
      const provider = new DraftrHoverProvider();
      const doc = createMockDocument(`db OrdersTable
  + id: uuid pk
  + user_id: uuid fk(UsersTable.id)`);

      const hover = provider.provideHover(
        doc,
        new vscode.Position(0, 5)
      ) as vscode.Hover;

      expect(hover).toBeDefined();
      const md = hover.contents as unknown as vscode.MarkdownString;
      expect(md.value).toContain('db OrdersTable');
      expect(md.value).toContain('Columns');
    });

    it('provides hover details for ui components', () => {
      const provider = new DraftrHoverProvider();
      const doc = createMockDocument(`ui Dashboard
  binds UserService`);

      const hover = provider.provideHover(
        doc,
        new vscode.Position(0, 5)
      ) as vscode.Hover;

      expect(hover).toBeDefined();
      const md = hover.contents as unknown as vscode.MarkdownString;
      expect(md.value).toContain('ui Dashboard');
    });

    it('returns null for whitespace position', () => {
      const provider = new DraftrHoverProvider();
      const doc = createMockDocument('class OrderService\n   ');
      const hover = provider.provideHover(
        doc,
        new vscode.Position(1, 1)
      ) as vscode.Hover;
      expect(hover).toBeNull();
    });
  });

  describe('DraftrCodeActionProvider', () => {
    it('provides quick-fix action for ui-db-leak diagnostic', () => {
      const provider = new DraftrCodeActionProvider();
      const doc = createMockDocument(`db UsersTable
  + id: uuid pk

ui Dashboard
  binds UsersTable`);

      const diag = new vscode.Diagnostic(
        new vscode.Range(new vscode.Position(4, 2), new vscode.Position(4, 18)),
        'UI Component "Dashboard" binds directly to database table "UsersTable"',
        vscode.DiagnosticSeverity.Warning
      );
      diag.source = 'draftr';
      diag.code = 'ui-db-leak-Dashboard-UsersTable';

      const actions = provider.provideCodeActions(doc, diag.range, {
        diagnostics: [diag],
      } as unknown as vscode.CodeActionContext) as vscode.CodeAction[];

      expect(actions.length).toBe(1);
      expect(actions[0].title).toBe(
        'Insert intermediate service layer binding'
      );
      expect(actions[0].isPreferred).toBe(true);

      interface MockWorkspaceEdit {
        edits: Array<{uri: unknown; range: vscode.Range; newText: string}>;
      }
      const edit = actions[0]?.edit as unknown as MockWorkspaceEdit;
      expect(edit?.edits?.[0]?.newText).toContain('binds AppService');
    });
  });

  describe('Provider Registrations', () => {
    it('registers all language providers with context subscriptions', () => {
      const subscriptions: vscode.Disposable[] = [];
      const mockContext = {
        subscriptions,
      } as unknown as vscode.ExtensionContext;

      registerDiagnostics(mockContext);
      registerCompletions(mockContext);
      registerSymbols(mockContext);
      registerDefinitions(mockContext);
      registerHover(mockContext);
      registerCodeActions(mockContext);

      expect(subscriptions.length).toBeGreaterThanOrEqual(6);
    });
  });
});
