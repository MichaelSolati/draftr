import * as vscode from 'vscode';

export class DraftrCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'draftr') continue;

      // Quick fix for UI direct DB bypass
      if (
        diagnostic.code === 'ui-direct-db' ||
        (typeof diagnostic.code === 'string' &&
          diagnostic.code.startsWith('ui-db-leak'))
      ) {
        const action = new vscode.CodeAction(
          'Insert intermediate service layer binding',
          vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        const line = document.lineAt(diagnostic.range.start.line);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          line.range,
          line.text.replace(/binds\s+([A-Za-z0-9_$]+)/, 'binds AppService')
        );
        action.edit = edit;
        actions.push(action);
      }
    }

    return actions;
  }
}

export function registerCodeActions(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const provider = new DraftrCodeActionProvider();
  const disposable = vscode.languages.registerCodeActionsProvider(
    ['draftr', 'archspec'],
    provider,
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }
  );
  context.subscriptions.push(disposable);
  return disposable;
}
