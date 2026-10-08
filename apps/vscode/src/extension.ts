import * as vscode from 'vscode';
import {parseOutline, lintArchitecture} from '@arch-spec/core';

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection('archspec');
  context.subscriptions.push(diagnosticCollection);

  const validateDocument = (document: vscode.TextDocument) => {
    if (document.languageId !== 'archspec') return;

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
      const lineIdx = Math.max(0, diag.line - 1);
      const line = document.lineAt(lineIdx);
      const range = line.range;
      const severity =
        diag.severity === 'error'
          ? vscode.DiagnosticSeverity.Error
          : diag.severity === 'warning'
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information;

      diagnostics.push(new vscode.Diagnostic(range, diag.message, severity));
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

      diagnostics.push(
        new vscode.Diagnostic(
          range,
          `[ArchSpec] ${issue.title}: ${issue.description}`,
          severity
        )
      );
    }

    diagnosticCollection.set(document.uri, diagnostics);
  };

  // Validate on open, change, and save
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(validateDocument),
    vscode.workspace.onDidChangeTextDocument(event =>
      validateDocument(event.document)
    ),
    vscode.workspace.onDidCloseTextDocument(doc =>
      diagnosticCollection.delete(doc.uri)
    )
  );

  if (vscode.window.activeTextEditor) {
    validateDocument(vscode.window.activeTextEditor.document);
  }
}

export function deactivate() {}
