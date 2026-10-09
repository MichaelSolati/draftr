import {parseOutline} from '@draftr/core';
import * as vscode from 'vscode';

export class DraftrDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition> {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[A-Za-z0-9_$]+/
    );
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const lineText = document.lineAt(position.line).text;
    const project = parseOutline(document.getText());

    // 1. Check if word is a class or interface name
    const targetClass = project.classes.find(c => c.name === word);
    if (targetClass) {
      const declRegex = new RegExp(
        `^\\s*(?:abstract\\s+class|interface|class)\\s+${targetClass.name}\\b`
      );
      for (let i = 0; i < document.lineCount; i++) {
        if (declRegex.test(document.lineAt(i).text)) {
          return new vscode.Location(document.uri, document.lineAt(i).range);
        }
      }
    }

    // 2. Check if word is a database table name
    const targetTable = project.tables.find(t => t.name === word);
    if (targetTable) {
      const declRegex = new RegExp(`^\\s*db\\s+${targetTable.name}\\b`);
      for (let i = 0; i < document.lineCount; i++) {
        if (declRegex.test(document.lineAt(i).text)) {
          return new vscode.Location(document.uri, document.lineAt(i).range);
        }
      }
    }

    // 3. Check if word is a UI component name
    const targetUI = project.uiComponents.find(u => u.name === word);
    if (targetUI) {
      const declRegex = new RegExp(`^\\s*ui\\s+${targetUI.name}\\b`);
      for (let i = 0; i < document.lineCount; i++) {
        if (declRegex.test(document.lineAt(i).text)) {
          return new vscode.Location(document.uri, document.lineAt(i).range);
        }
      }
    }

    // 4. Check if word is a method reference (e.g. calls Service.method)
    if (lineText.includes('.')) {
      const dotIdx = lineText.indexOf(`.${word}`);
      if (dotIdx !== -1) {
        // Find method declaration across classes
        const methRegex = new RegExp(
          `^\\s*(?:[+\\-#]|(?:public|private|protected)\\b)?\\s*${word}\\s*\\(`
        );
        for (let i = 0; i < document.lineCount; i++) {
          if (methRegex.test(document.lineAt(i).text)) {
            return new vscode.Location(document.uri, document.lineAt(i).range);
          }
        }
      }
    }

    return null;
  }
}

export function registerDefinitions(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const provider = new DraftrDefinitionProvider();
  const disposable = vscode.languages.registerDefinitionProvider(
    'draftr',
    provider
  );
  context.subscriptions.push(disposable);
  return disposable;
}
