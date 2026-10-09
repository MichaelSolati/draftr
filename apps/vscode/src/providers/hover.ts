import {parseOutline} from '@draftr/core';
import * as vscode from 'vscode';

export class DraftrHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[A-Za-z0-9_$]+/
    );
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const project = parseOutline(document.getText());

    // 1. Check Class / Interface Hover
    const matchedClass = project.classes.find(c => c.name === word);
    if (matchedClass) {
      const typeLabel =
        matchedClass.kind === 'interface'
          ? 'interface'
          : matchedClass.kind === 'abstract'
            ? 'abstract class'
            : 'class';

      const md = new vscode.MarkdownString();
      md.appendCodeblock(`${typeLabel} ${matchedClass.name}`, 'typescript');

      const details: string[] = [];
      if (matchedClass.superClass) {
        details.push(`- **Extends**: \`${matchedClass.superClass}\``);
      }
      if (matchedClass.interfaces?.length) {
        details.push(
          `- **Implements**: ${matchedClass.interfaces.map(i => `\`${i}\``).join(', ')}`
        );
      }
      if (matchedClass.methods?.length) {
        details.push(`- **Methods**: ${matchedClass.methods.length}`);
      }
      if (matchedClass.properties?.length) {
        details.push(`- **Properties**: ${matchedClass.properties.length}`);
      }

      if (details.length > 0) {
        md.appendMarkdown('\n' + details.join('\n'));
      }

      return new vscode.Hover(md, wordRange);
    }

    // 2. Check Database Table Hover
    const matchedTable = (project.tables || []).find(t => t.name === word);
    if (matchedTable) {
      const md = new vscode.MarkdownString();
      md.appendCodeblock(`db ${matchedTable.name}`, 'sql');
      const cols = matchedTable.columns
        .map(
          c =>
            `- \`${c.name}: ${c.type}\`${c.isPrimary ? ' *(PK)*' : ''}${c.isForeignKey ? ' *(FK)*' : ''}`
        )
        .join('\n');
      md.appendMarkdown(
        `\n**Columns (${matchedTable.columns.length}):**\n${cols}`
      );
      return new vscode.Hover(md, wordRange);
    }

    // 3. Check UI Component Hover
    const matchedUI = project.uiComponents.find(u => u.name === word);
    if (matchedUI) {
      const md = new vscode.MarkdownString();
      md.appendCodeblock(`ui ${matchedUI.name}`, 'typescript');
      if (matchedUI.boundLogicEntities?.length) {
        md.appendMarkdown(
          `\n**Bound Services:** ${matchedUI.boundLogicEntities.map(s => `\`${s}\``).join(', ')}`
        );
      }
      return new vscode.Hover(md, wordRange);
    }

    return null;
  }
}

export function registerHover(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const provider = new DraftrHoverProvider();
  const disposable = vscode.languages.registerHoverProvider('draftr', provider);
  context.subscriptions.push(disposable);
  return disposable;
}
