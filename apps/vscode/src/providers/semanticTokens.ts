import {
  getSemanticTokens,
  SEMANTIC_TOKEN_TYPES,
} from '@draftr/language-service';
import * as vscode from 'vscode';

const tokenModifiers = ['declaration', 'readonly', 'static'];
const legend = new vscode.SemanticTokensLegend(
  SEMANTIC_TOKEN_TYPES,
  tokenModifiers
);

export function registerSemanticTokens(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerDocumentSemanticTokensProvider(
    {language: 'draftr'},
    {
      provideDocumentSemanticTokens(document: vscode.TextDocument) {
        const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
        const text = document.getText();

        const semanticTokens = getSemanticTokens(text);
        for (const token of semanticTokens) {
          tokensBuilder.push(
            token.line,
            token.startChar,
            token.length,
            token.tokenType,
            token.tokenModifiers || 0
          );
        }

        return tokensBuilder.build();
      },
    },
    legend
  );
  context.subscriptions.push(provider);
}
