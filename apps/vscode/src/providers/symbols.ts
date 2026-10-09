import {parseOutline} from '@draftr/core';
import * as vscode from 'vscode';

export class DraftrDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider
{
  provideDocumentSymbols(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const text = document.getText();
    const project = parseOutline(text);
    const symbols: vscode.DocumentSymbol[] = [];

    // Helper to find line range for an entity
    const findLineRange = (
      regex: RegExp
    ): {lineIdx: number; range: vscode.Range} => {
      for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text;
        if (regex.test(lineText)) {
          return {lineIdx: i, range: document.lineAt(i).range};
        }
      }
      return {lineIdx: 0, range: document.lineAt(0).range};
    };

    // 1. Classes & Interfaces
    for (const cls of project.classes) {
      const isInterface = cls.kind === 'interface';
      const isAbstract = cls.kind === 'abstract';
      const declRegex = new RegExp(
        `^\\s*(?:abstract\\s+class|interface|class)\\s+${cls.name}\\b`
      );
      const {range} = findLineRange(declRegex);

      const symbolKind = isInterface
        ? vscode.SymbolKind.Interface
        : isAbstract
          ? vscode.SymbolKind.Class
          : vscode.SymbolKind.Class;

      const detailParts: string[] = [];
      if (cls.superClass) detailParts.push(`extends ${cls.superClass}`);
      if (cls.interfaces?.length)
        detailParts.push(`implements ${cls.interfaces.join(', ')}`);

      const classSymbol = new vscode.DocumentSymbol(
        cls.name,
        detailParts.join(' ') || (isInterface ? 'interface' : 'class'),
        symbolKind,
        range,
        range
      );

      // Child methods
      for (const meth of cls.methods || []) {
        const methRegex = new RegExp(
          `^\\s*(?:[+\\-#]|(?:public|private|protected)\\b)?\\s*${meth.name}\\s*\\(`
        );
        const methRange = findLineRange(methRegex).range;
        const methSymbol = new vscode.DocumentSymbol(
          `${meth.name}()`,
          meth.returnType ? `: ${meth.returnType}` : '',
          vscode.SymbolKind.Method,
          methRange,
          methRange
        );
        classSymbol.children.push(methSymbol);
      }

      // Child properties
      for (const prop of cls.properties || []) {
        const propRegex = new RegExp(
          `^\\s*(?:[+\\-#]|(?:public|private|protected)\\b)?\\s*${prop.name}\\s*:`
        );
        const propRange = findLineRange(propRegex).range;
        const propSymbol = new vscode.DocumentSymbol(
          prop.name,
          `: ${prop.type}`,
          vscode.SymbolKind.Property,
          propRange,
          propRange
        );
        classSymbol.children.push(propSymbol);
      }

      symbols.push(classSymbol);
    }

    // 2. UI Components
    for (const ui of project.uiComponents) {
      const {range} = findLineRange(new RegExp(`^\\s*ui\\s+${ui.name}\\b`));
      const uiSymbol = new vscode.DocumentSymbol(
        ui.name,
        ui.boundLogicEntities?.length
          ? `binds ${ui.boundLogicEntities.join(', ')}`
          : 'UI Component',
        vscode.SymbolKind.Module,
        range,
        range
      );
      symbols.push(uiSymbol);
    }

    // 3. Database Tables
    for (const tbl of project.tables || []) {
      const {range} = findLineRange(new RegExp(`^\\s*db\\s+${tbl.name}\\b`));
      const tblSymbol = new vscode.DocumentSymbol(
        tbl.name,
        'Table',
        vscode.SymbolKind.Struct,
        range,
        range
      );

      for (const col of tbl.columns || []) {
        const colRegex = new RegExp(`^\\s*[+\\-#]?\\s*${col.name}\\s*:`);
        const colRange = findLineRange(colRegex).range;
        const colDetail = [
          col.type,
          col.isPrimary ? 'pk' : '',
          col.isForeignKey ? 'fk' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const colSymbol = new vscode.DocumentSymbol(
          col.name,
          `: ${colDetail}`,
          vscode.SymbolKind.Field,
          colRange,
          colRange
        );
        tblSymbol.children.push(colSymbol);
      }

      symbols.push(tblSymbol);
    }

    // 4. API Routes
    for (const api of project.apiRoutes || []) {
      const {range} = findLineRange(new RegExp(`^\\s*api\\s+${api.path}\\b`));
      const apiSymbol = new vscode.DocumentSymbol(
        api.path,
        'API Route',
        vscode.SymbolKind.Interface,
        range,
        range
      );

      for (const ep of api.endpoints || []) {
        const epRegex = new RegExp(`^\\s*[+\\-#]?\\s*${ep.method}\\s+`);
        const epRange = findLineRange(epRegex).range;
        const handlerStr = ep.targetHandler
          ? `-> ${ep.targetHandler.targetClass}.${ep.targetHandler.targetMethod}`
          : '';

        const epSymbol = new vscode.DocumentSymbol(
          `${ep.method} ${ep.name}`,
          handlerStr,
          vscode.SymbolKind.Operator,
          epRange,
          epRange
        );
        apiSymbol.children.push(epSymbol);
      }

      symbols.push(apiSymbol);
    }

    // 5. Events
    for (const ev of project.events || []) {
      const {range} = findLineRange(new RegExp(`^\\s*event\\s+${ev.name}\\b`));
      const evSymbol = new vscode.DocumentSymbol(
        ev.name,
        ev.payloadType ? `(${ev.payloadType})` : 'Event',
        vscode.SymbolKind.Event,
        range,
        range
      );
      symbols.push(evSymbol);
    }

    return symbols;
  }
}

export function registerSymbols(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const provider = new DraftrDocumentSymbolProvider();
  const disposable = vscode.languages.registerDocumentSymbolProvider(
    ['draftr', 'archspec'],
    provider
  );
  context.subscriptions.push(disposable);
  return disposable;
}
