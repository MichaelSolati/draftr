import {type AutocompleteItem, suggestCompletions} from '@draftr/core';
import * as vscode from 'vscode';

import {createProjectFromText} from '../utils/project';

export class DraftrCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const line = document.lineAt(position.line).text;
    const cursorOffset = position.character;

    // Find the prefix/token being completed before the cursor to define the replacement range
    const linePrefix = line.slice(0, cursorOffset);
    const match = linePrefix.match(/([-+#A-Za-z0-9_$.]+)$/);
    const prefixLength = match ? match[1].length : 0;
    const range = new vscode.Range(
      new vscode.Position(position.line, cursorOffset - prefixLength),
      position
    );

    // Parse the full document to pass existing project entities into suggestCompletions
    const project = createProjectFromText(
      document.getText(),
      document.fileName
    );
    const rawSuggestions = suggestCompletions(line, cursorOffset, project);

    return rawSuggestions.map((s: AutocompleteItem) => {
      const item = new vscode.CompletionItem(s.label);
      item.range = range;

      switch (s.kind) {
        case 'class':
          item.kind = vscode.CompletionItemKind.Class;
          break;
        case 'method':
          item.kind = vscode.CompletionItemKind.Method;
          break;
        case 'table':
          item.kind = vscode.CompletionItemKind.Struct;
          break;
        case 'type':
          item.kind = vscode.CompletionItemKind.TypeParameter;
          break;
        case 'keyword':
        default:
          item.kind = vscode.CompletionItemKind.Keyword;
          break;
      }

      item.insertText = s.insertText;
      if (s.detail) {
        item.detail = s.detail;
      }

      return item;
    });
  }
}

export function registerCompletions(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const provider = new DraftrCompletionItemProvider();
  const disposable = vscode.languages.registerCompletionItemProvider(
    'draftr',
    provider,
    '.',
    ':',
    ' ',
    '+',
    '-',
    '#',
    '>'
  );
  context.subscriptions.push(disposable);
  return disposable;
}
