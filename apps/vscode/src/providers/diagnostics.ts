import {lintArchitecture, parseOutline} from '@draftr/core';
import * as vscode from 'vscode';

export function computeDiagnostics(
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  if (document.languageId !== 'draftr' && document.languageId !== 'archspec') {
    return [];
  }

  const text = document.getText();
  const parseResult = parseOutline(text);
  const issues = lintArchitecture({
    id: 'active-spec',
    name: document.fileName,
    rawOutlineText: text,
    classes: parseResult.classes,
    uiComponents: parseResult.uiComponents,
    tables: parseResult.tables,
    apiRoutes: parseResult.apiRoutes,
    events: parseResult.events,
    states: parseResult.states,
    connections: parseResult.connections,
    updatedAt: Date.now(),
    createdAt: Date.now(),
  });

  const diagnostics: vscode.Diagnostic[] = [];

  // 1. Parser syntax diagnostics
  for (const diag of parseResult.diagnostics) {
    const lineIdx = Math.min(
      Math.max(0, diag.line - 1),
      document.lineCount - 1
    );
    const line = document.lineAt(lineIdx);
    const range = line.range;
    const severity =
      diag.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : diag.severity === 'warning'
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;

    const d = new vscode.Diagnostic(
      range,
      `[syntax] ${diag.message}`,
      severity
    );
    d.source = 'draftr';
    diagnostics.push(d);
  }

  // 2. Architectural linter issues
  for (const issue of issues) {
    const targetEntity = issue.affectedEntityId
      ? issue.affectedEntityId.replace(
          /^(entity-|ui-|table-|api-|event-|state-)/,
          ''
        )
      : '';

    let lineIdx = 0;
    if (targetEntity) {
      for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text;
        if (lineText.includes(targetEntity)) {
          lineIdx = i;
          break;
        }
      }
    }

    const range = document.lineAt(lineIdx).range;
    const severity =
      issue.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : issue.severity === 'warning'
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;

    const d = new vscode.Diagnostic(
      range,
      `[${issue.id}] ${issue.title}: ${issue.description}`,
      severity
    );
    d.source = 'draftr';
    d.code = issue.id;
    diagnostics.push(d);
  }

  return diagnostics;
}

export function registerDiagnostics(
  context: vscode.ExtensionContext
): vscode.DiagnosticCollection {
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection('draftr');
  context.subscriptions.push(diagnosticCollection);

  const validate = (doc: vscode.TextDocument) => {
    diagnosticCollection.set(doc.uri, computeDiagnostics(doc));
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(validate),
    vscode.workspace.onDidChangeTextDocument(event => validate(event.document)),
    vscode.workspace.onDidCloseTextDocument(doc =>
      diagnosticCollection.delete(doc.uri)
    )
  );

  if (vscode.window.activeTextEditor) {
    validate(vscode.window.activeTextEditor.document);
  }

  return diagnosticCollection;
}
