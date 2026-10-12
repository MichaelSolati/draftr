import {lintArchitecture, parseOutline} from '@draftr/core';
import * as vscode from 'vscode';

export function computeDiagnostics(
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  if (document.languageId !== 'draftr') {
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
      const declRegex = new RegExp(
        '^(?:abstract\\s+class|class|interface|type|ui|db|api|event|state)\\s+' +
          targetEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
          '\\b'
      );
      let foundDecl = false;
      for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text.trim();
        if (declRegex.test(lineText)) {
          lineIdx = i;
          foundDecl = true;
          break;
        }
      }
      if (!foundDecl) {
        for (let i = 0; i < document.lineCount; i++) {
          const lineText = document.lineAt(i).text;
          if (lineText.includes(targetEntity)) {
            lineIdx = i;
            break;
          }
        }
      }
    }

    // For circular dependencies or specific member references, pinpoint the offending statement
    if (issue.id.startsWith('cycle-')) {
      const parts = issue.id.split('-');
      // format: cycle-CurrentEntity-NeighborEntity
      const neighbor = parts.length >= 3 ? parts[2] : '';
      if (neighbor) {
        // Search inside targetEntity's block for the call to neighbor
        for (let i = lineIdx + 1; i < document.lineCount; i++) {
          const rawLine = document.lineAt(i).text;
          // Stop if another top-level declaration begins (starts at column 0)
          if (
            rawLine.trim() &&
            !rawLine.startsWith(' ') &&
            !rawLine.startsWith('\t')
          ) {
            break;
          }
          if (rawLine.includes(neighbor)) {
            lineIdx = i;
            break;
          }
        }
      }
    } else if (issue.id.startsWith('ui-db-leak-')) {
      const parts = issue.id.split('-');
      const bound = parts.length >= 4 ? parts[3] : '';
      if (bound) {
        for (let i = lineIdx + 1; i < document.lineCount; i++) {
          const rawLine = document.lineAt(i).text;
          if (
            rawLine.trim() &&
            !rawLine.startsWith(' ') &&
            !rawLine.startsWith('\t')
          ) {
            break;
          }
          if (rawLine.includes(bound)) {
            lineIdx = i;
            break;
          }
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
