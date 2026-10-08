import {describe, it, expect} from 'vitest';
import {generateProjectFiles} from '../scaffolder';
import {parseOutline} from '../../parser/parser';

describe('Codebase Scaffolder', () => {
  it('generates services, UI components, and Prisma schemas', () => {
    const text = `
class AuthService
  + login(creds: string): boolean

ui Header
  binds AuthService

db Users
  + id: uuid pk
  + email: string unique
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj',
      name: 'Scaffold Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      tables: parsed.tables,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    const files = generateProjectFiles(project);
    expect(files.some(f => f.path === 'src/services/AuthService.ts')).toBe(
      true
    );
    expect(files.some(f => f.path === 'src/components/Header.tsx')).toBe(true);
    expect(files.some(f => f.path === 'prisma/schema.prisma')).toBe(true);

    const serviceFile = files.find(
      f => f.path === 'src/services/AuthService.ts'
    );
    expect(serviceFile?.content).toContain('class AuthService');
    expect(serviceFile?.content).toContain('login(creds: string): boolean');
  });

  it('generates abstract classes, interfaces, and inheritance signatures', () => {
    const text = `
abstract class BaseService
  + log(msg: string): void

interface IAuth
  + login(): boolean

class CustomAuthService extends BaseService implements IAuth
  + login(): boolean
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj',
      name: 'Scaffold Poly Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      tables: parsed.tables,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    const files = generateProjectFiles(project);
    const baseServiceFile = files.find(
      f => f.path === 'src/services/BaseService.ts'
    );
    const iAuthFile = files.find(f => f.path === 'src/services/IAuth.ts');
    const customAuthFile = files.find(
      f => f.path === 'src/services/CustomAuthService.ts'
    );

    expect(baseServiceFile?.content).toContain(
      'export abstract class BaseService'
    );
    expect(iAuthFile?.content).toContain('export interface IAuth');
    expect(customAuthFile?.content).toContain(
      'export class CustomAuthService extends BaseService implements IAuth'
    );
  });

  it('generates API routes and various column types', () => {
    const text = `
api /users
  + GET /:id -> UserService.getUser
  + POST / -> UserService.createUser

db Users
  + id: int pk
  + active: boolean
  + created_at: timestamp
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj',
      name: 'API Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      tables: parsed.tables,
      apiRoutes: parsed.apiRoutes,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    const files = generateProjectFiles(project);
    expect(files.some(f => f.path === 'src/routes/api.ts')).toBe(true);
    const apiFile = files.find(f => f.path === 'src/routes/api.ts');
    expect(apiFile?.content).toContain('apiRouter.get');
    expect(apiFile?.content).toContain('UserService.getUser');

    const prismaFile = files.find(f => f.path === 'prisma/schema.prisma');
    expect(prismaFile?.content).toContain('Int @id');
    expect(prismaFile?.content).toContain('Boolean');
    expect(prismaFile?.content).toContain('DateTime @default(now())');
  });
});
