import {describe, expect, it} from 'vitest';

import {importSqlOrPrismaToDSL} from '../sql';
import {importTypeScriptToDSL} from '../typescript';

describe('Codebase Importers', () => {
  it('imports TypeScript classes and interfaces into DSL', () => {
    const tsCode = `
export class OrderService {
  private apiKey: string;
  public async submitOrder(orderId: string): Promise<Receipt> {
    return null;
  }
}

export interface UserDTO {
  id: string;
  name: string;
}
`;
    const dsl = importTypeScriptToDSL(tsCode);
    expect(dsl).toContain('class OrderService');
    expect(dsl).toContain('- apiKey: string');
    expect(dsl).toContain('+ submitOrder(orderId: string): Promise<Receipt>');
    expect(dsl).toContain('interface UserDTO');
    expect(dsl).toContain('+ id: string');
  });

  it('imports SQL DDL into db <Table> DSL', () => {
    const sql = `
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  team_id UUID REFERENCES teams(id)
);
`;
    const dsl = importSqlOrPrismaToDSL(sql);
    expect(dsl).toContain('db users');
    expect(dsl).toContain('+ id: uuid pk');
    expect(dsl).toContain('+ email: varchar(255) unique');
    expect(dsl).toContain('+ team_id: uuid fk -> teams.id');
  });

  it('imports Prisma schema models into db <Table> DSL', () => {
    const prisma = `
model Profile {
  id String @id
  bio String?
  userId String @unique
}
`;
    const dsl = importSqlOrPrismaToDSL(prisma);
    expect(dsl).toContain('db Profile');
    expect(dsl).toContain('+ id: String pk');
    expect(dsl).toContain('+ userId: String unique');
  });
});
