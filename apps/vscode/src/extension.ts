import * as vscode from 'vscode';

import {registerImportCommands} from './commands/importCommands';
import {registerScaffoldCommand} from './commands/scaffoldCommand';
import {registerCodeActions} from './providers/codeActions';
import {registerCompletions} from './providers/completions';
import {registerDefinitions} from './providers/definitions';
import {registerDiagnostics} from './providers/diagnostics';
import {registerHover} from './providers/hover';
import {registerSymbols} from './providers/symbols';
import {registerPreviewPanel} from './webview/previewPanel';

export function activate(context: vscode.ExtensionContext) {
  // 1. Register Language Features
  registerDiagnostics(context);
  registerCompletions(context);
  registerSymbols(context);
  registerDefinitions(context);
  registerHover(context);
  registerCodeActions(context);

  // 2. Register Workspace Commands
  registerScaffoldCommand(context);
  registerImportCommands(context);

  // 3. Register Live Diagram Preview Webview
  registerPreviewPanel(context);
}

export function deactivate() {}
