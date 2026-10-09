import {importSqlOrPrismaToDSL, importTypeScriptToDSL} from '@draftr/core';
import * as vscode from 'vscode';

export function registerImportCommands(
  context: vscode.ExtensionContext
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // 1. Import SQL Command
  disposables.push(
    vscode.commands.registerCommand('draftr.importSql', async () => {
      const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {'SQL Schema': ['sql', 'ddl', 'prisma']},
        openLabel: 'Import SQL / Prisma Schema',
      });

      if (!fileUris || fileUris.length === 0) return;

      const fileData = await vscode.workspace.fs.readFile(fileUris[0]);
      const sqlContent = Buffer.from(fileData).toString('utf-8');
      const draftrSpec = importSqlOrPrismaToDSL(sqlContent);

      const doc = await vscode.workspace.openTextDocument({
        language: 'draftr',
        content: draftrSpec,
      });
      await vscode.window.showTextDocument(doc);
    })
  );

  // 2. Import TypeScript Command
  disposables.push(
    vscode.commands.registerCommand('draftr.importTypeScript', async () => {
      const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: true,
        filters: {'TypeScript Files': ['ts', 'tsx']},
        openLabel: 'Import TypeScript Code',
      });

      if (!fileUris || fileUris.length === 0) return;

      let combinedTs = '';
      for (const uri of fileUris) {
        const fileData = await vscode.workspace.fs.readFile(uri);
        combinedTs += Buffer.from(fileData).toString('utf-8') + '\n\n';
      }

      const draftrSpec = importTypeScriptToDSL(combinedTs);
      const doc = await vscode.workspace.openTextDocument({
        language: 'draftr',
        content: draftrSpec,
      });
      await vscode.window.showTextDocument(doc);
    })
  );

  disposables.forEach(d => context.subscriptions.push(d));
  return disposables;
}
