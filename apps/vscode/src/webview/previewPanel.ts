import * as vscode from 'vscode';

import {createProjectFromText} from '../utils/project';

export class DraftrPreviewPanel {
  public static currentPanel: DraftrPreviewPanel | undefined;
  public static readonly viewType = 'draftrPreview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _document: vscode.TextDocument;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    const column = vscode.ViewColumn.Beside;

    if (DraftrPreviewPanel.currentPanel) {
      DraftrPreviewPanel.currentPanel._panel.reveal(column);
      DraftrPreviewPanel.currentPanel.setDocument(document);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      DraftrPreviewPanel.viewType,
      `Preview: ${vscode.workspace.asRelativePath(document.fileName)}`,
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
        retainContextWhenHidden: true,
      }
    );

    DraftrPreviewPanel.currentPanel = new DraftrPreviewPanel(
      panel,
      extensionUri,
      document
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._document = document;

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Sync when webview panel becomes visible
    this._panel.onDidChangeViewState(
      e => {
        if (e.webviewPanel.visible) {
          this.syncProject();
        }
      },
      null,
      this._disposables
    );

    // Listen for messages from webview
    this._panel.webview.onDidReceiveMessage(
      message => {
        if (message.type === 'ready') {
          this.syncProject();
        }
      },
      null,
      this._disposables
    );

    // Sync on document changes
    vscode.workspace.onDidChangeTextDocument(
      e => {
        if (e.document.uri.toString() === this._document.uri.toString()) {
          this.syncProject();
        }
      },
      null,
      this._disposables
    );

    // Initial sync
    setTimeout(() => this.syncProject(), 100);
  }

  public setDocument(doc: vscode.TextDocument) {
    this._document = doc;
    this._panel.title = `Preview: ${vscode.workspace.asRelativePath(doc.fileName)}`;
    this.syncProject();
  }

  public syncProject() {
    try {
      const project = createProjectFromText(
        this._document.getText(),
        this._document.fileName
      );
      this._panel.webview.postMessage({
        type: 'sync',
        project,
      });
    } catch (err) {
      console.error('[Draftr] Error syncing project to preview:', err);
    }
  }

  public dispose() {
    DraftrPreviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:;">
  <title>Draftr Architecture Preview</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function registerPreviewPanel(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const disposable = vscode.commands.registerCommand(
    'draftr.openPreview',
    async (uri?: vscode.Uri) => {
      let document: vscode.TextDocument | undefined;

      // 1. If invoked with a file URI (e.g. from editor title, explorer context, or command args)
      if (uri instanceof vscode.Uri) {
        try {
          document = await vscode.workspace.openTextDocument(uri);
        } catch {
          // Continue to fallback
        }
      }

      // 2. If active text editor is open
      if (!document && vscode.window.activeTextEditor) {
        document = vscode.window.activeTextEditor.document;
      }

      // 3. Fallback: check visible text editors for any .draftr file
      if (
        !document ||
        (document.languageId !== 'draftr' &&
          !document.fileName.endsWith('.draftr'))
      ) {
        const visibleDraftr = vscode.window.visibleTextEditors.find(
          e =>
            e.document.languageId === 'draftr' ||
            e.document.fileName.endsWith('.draftr')
        );
        if (visibleDraftr) {
          document = visibleDraftr.document;
        }
      }

      // 4. Fallback: find any .draftr file in the workspace (e.g. sample.draftr)
      if (
        !document ||
        (document.languageId !== 'draftr' &&
          !document.fileName.endsWith('.draftr'))
      ) {
        try {
          const files = await vscode.workspace.findFiles(
            '**/*.draftr',
            '**/node_modules/**',
            1
          );
          if (files.length > 0) {
            document = await vscode.workspace.openTextDocument(files[0]);
            await vscode.window.showTextDocument(
              document,
              vscode.ViewColumn.One
            );
          }
        } catch {
          // Ignore
        }
      }

      if (!document) {
        vscode.window.showInformationMessage(
          'Please open or create a Draftr (.draftr) file to view the architecture diagram.'
        );
        return;
      }

      DraftrPreviewPanel.createOrShow(context.extensionUri, document);
    }
  );
  context.subscriptions.push(disposable);
  return disposable;
}
