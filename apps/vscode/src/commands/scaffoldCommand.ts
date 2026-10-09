import {generateProjectFiles} from '@draftr/core';
import * as path from 'path';
import * as vscode from 'vscode';

import {createProjectFromText} from '../utils/project';

export function registerScaffoldCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const disposable = vscode.commands.registerCommand(
    'draftr.scaffold',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          'Please open a Draftr (.draftr) file to scaffold code.'
        );
        return;
      }

      const text = editor.document.getText();
      const project = createProjectFromText(text, editor.document.fileName);
      const generatedFiles = generateProjectFiles(project);

      if (generatedFiles.length === 0) {
        vscode.window.showInformationMessage(
          'No entities found in active Draftr document to scaffold.'
        );
        return;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      const defaultUri = workspaceFolders?.[0]?.uri;
      const targetFolderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Output Directory for Scaffolding',
        defaultUri,
      });

      if (!targetFolderUri || targetFolderUri.length === 0) {
        return;
      }

      const baseDir = targetFolderUri[0].fsPath;
      let filesCreated = 0;

      for (const file of generatedFiles) {
        const fullPath = path.join(baseDir, file.path);
        const fileUri = vscode.Uri.file(fullPath);
        await vscode.workspace.fs.writeFile(
          fileUri,
          Buffer.from(file.content, 'utf-8')
        );
        filesCreated++;
      }

      vscode.window.showInformationMessage(
        `Draftr successfully scaffolded ${filesCreated} TypeScript file(s) into ${path.basename(baseDir)}!`
      );
    }
  );

  context.subscriptions.push(disposable);
  return disposable;
}
