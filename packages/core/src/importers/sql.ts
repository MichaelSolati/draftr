/**
 * Ingests SQL DDL or Prisma Schemas and converts them to db <Table> DSL outline.
 */

export function importSqlOrPrismaToDSL(code: string): string {
  const isPrisma = /\bmodel\s+[A-Za-z0-9_$]+\s*\{/i.test(code);

  if (isPrisma) {
    return parsePrismaSchema(code);
  }
  return parseSqlDDL(code);
}

function parseSqlDDL(sql: string): string {
  const dslTables: string[] = [];
  // Match CREATE TABLE [IF NOT EXISTS] tableName (...)
  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["`]?\w+["`]?\.)?["`]?([A-Za-z0-9_$]+)["`]?\s*\(([\s\S]*?)\);/gi;

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns: string[] = [];

    const lines = body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim().replace(/,$/, '');
      if (!line || line.startsWith('--')) continue;

      // Ignore table-level constraints for now unless primary key
      if (
        /^(PRIMARY\s+KEY|FOREIGN\s+KEY|CONSTRAINT|INDEX|UNIQUE)/i.test(line)
      ) {
        continue;
      }

      const colMatch = line.match(
        /^["`]?([A-Za-z0-9_$]+)["`]?\s+([A-Za-z0-9_()]+)(.*)/i
      );
      if (colMatch) {
        const colName = colMatch[1];
        const colType = colMatch[2].toLowerCase();
        const modifiers = colMatch[3] || '';

        const isPk = /PRIMARY\s+KEY/i.test(modifiers);
        const isUnique = /UNIQUE/i.test(modifiers);

        let colLine = `  + ${colName}: ${colType}`;
        if (isPk) colLine += ' pk';
        if (isUnique && !isPk) colLine += ' unique';

        // Check inline REFERENCES
        const fkMatch = modifiers.match(
          /REFERENCES\s+["`]?([A-Za-z0-9_$]+)["`]?\s*\(\s*["`]?([A-Za-z0-9_$]+)["`]?\s*\)/i
        );
        if (fkMatch) {
          colLine += ` fk -> ${fkMatch[1]}.${fkMatch[2]}`;
        }

        columns.push(colLine);
      }
    }

    if (columns.length > 0) {
      dslTables.push(`db ${tableName}\n${columns.join('\n')}`);
    }
  }

  return dslTables.join('\n\n');
}

function parsePrismaSchema(prisma: string): string {
  const dslTables: string[] = [];
  const modelRegex = /model\s+([A-Za-z0-9_$]+)\s*\{([\s\S]*?)\}/gi;

  let match: RegExpExecArray | null;
  while ((match = modelRegex.exec(prisma)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const columns: string[] = [];

    const lines = body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue;

      const fieldMatch = line.match(
        /^([A-Za-z0-9_$]+)\s+([A-Za-z0-9_?[\]]+)(.*)/
      );
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        const attributes = fieldMatch[3] || '';

        const isId = /@id/i.test(attributes);
        const isUnique = /@unique/i.test(attributes);

        let colLine = `  + ${fieldName}: ${fieldType}`;
        if (isId) colLine += ' pk';
        if (isUnique && !isId) colLine += ' unique';

        columns.push(colLine);
      }
    }

    if (columns.length > 0) {
      dslTables.push(`db ${modelName}\n${columns.join('\n')}`);
    }
  }

  return dslTables.join('\n\n');
}
