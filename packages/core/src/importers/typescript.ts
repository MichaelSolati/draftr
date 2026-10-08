/**
 * Lightweight deterministic TypeScript AST & Regex extractor
 * Converts raw TypeScript code into Indentation DSL quick-text outline.
 */

export function importTypeScriptToDSL(tsCode: string): string {
  const lines = tsCode.split('\n');
  const dslChunks: string[] = [];

  let currentEntity: {
    name: string;
    kind: 'class' | 'type' | 'interface';
  } | null = null;
  const currentMembers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      continue;
    }

    // Check entity declaration: export class Foo, class Foo, interface Bar, type Baz = ...
    const entityMatch = trimmed.match(
      /^(?:export\s+)?(class|interface|type)\s+([A-Za-z0-9_$]+)/
    );
    if (entityMatch) {
      if (currentEntity) {
        dslChunks.push(
          `${currentEntity.kind} ${currentEntity.name}\n${currentMembers.join('\n')}`
        );
        currentMembers.length = 0;
      }
      currentEntity = {
        kind: entityMatch[1] as 'class' | 'type' | 'interface',
        name: entityMatch[2],
      };
      continue;
    }

    // If inside an entity, parse members
    if (currentEntity) {
      if (trimmed === '}' || trimmed === '};') {
        dslChunks.push(
          `${currentEntity.kind} ${currentEntity.name}\n${currentMembers.join('\n')}`
        );
        currentEntity = null;
        currentMembers.length = 0;
        continue;
      }

      // Check method: [public|private|protected] [async] methodName(params): ReturnType
      const methodMatch = trimmed.match(
        /^(public|private|protected)?\s*(?:async\s+)?([A-Za-z0-9_$]+)\s*\((.*?)\)\s*(?::\s*([^;{]+))?/
      );
      if (methodMatch) {
        const visMod = methodMatch[1];
        const name = methodMatch[2];
        const params = methodMatch[3]?.trim() || '';
        const retType = methodMatch[4]?.trim() || 'void';

        if (name !== 'constructor') {
          const visSymbol =
            visMod === 'private' ? '-' : visMod === 'protected' ? '#' : '+';
          currentMembers.push(`  ${visSymbol} ${name}(${params}): ${retType}`);
          continue;
        }
      }

      // Check property: [public|private|protected] propName: type
      const propMatch = trimmed.match(
        /^(public|private|protected)?\s*(?:readonly\s+)?([A-Za-z0-9_$]+)\s*:\s*([^;=]+)/
      );
      if (propMatch) {
        const visMod = propMatch[1];
        const name = propMatch[2];
        const type = propMatch[3]?.trim() || 'any';
        const visSymbol =
          visMod === 'private' ? '-' : visMod === 'protected' ? '#' : '+';
        currentMembers.push(`  ${visSymbol} ${name}: ${type}`);
        continue;
      }
    }
  }

  if (currentEntity && currentMembers.length > 0) {
    dslChunks.push(
      `${currentEntity.kind} ${currentEntity.name}\n${currentMembers.join('\n')}`
    );
  }

  return dslChunks.join('\n\n');
}
