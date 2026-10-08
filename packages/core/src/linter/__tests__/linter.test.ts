import {describe, it, expect} from 'vitest';
import {lintArchitecture} from '../rules';
import {parseOutline} from '../../parser/parser';

describe('Architecture Linter', () => {
  it('detects unresolved method targets', () => {
    const text = `
class ServiceA
  + run(): void -> NonExistentService.action
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj',
      name: 'Test',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    const issues = lintArchitecture(project);
    expect(issues.some(i => i.id.includes('missing-target'))).toBe(true);
  });

  it('detects circular dependencies', () => {
    const text = `
class ServiceA
  + callB(): void -> ServiceB.action

class ServiceB
  + callA(): void -> ServiceA.action
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj',
      name: 'Cycle Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    const issues = lintArchitecture(project);
    expect(issues.some(i => i.title === 'Circular Dependency Detected')).toBe(
      true
    );
  });

  it('detects unreferenced foreign key table and UI db boundary leaks', () => {
    const text = `
class ServiceA
  + doWork(): void

class ServiceB
  + doOther(): void -> ServiceA.doWork

db Orders
  + id: uuid pk
  + user_id: uuid -> MissingUsers.id

ui OrderView
  binds Orders
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj',
      name: 'Violation Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      tables: parsed.tables,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    const issues = lintArchitecture(project);
    expect(issues.some(i => i.title === 'Unresolved Foreign Key Table')).toBe(
      true
    );
    expect(
      issues.some(i => i.title === 'Architectural Layer Boundary Violation')
    ).toBe(true);
  });

  it('allows root orchestrators and entrypoint services without noisy unreferenced warnings', () => {
    const text = `
class MainService
  + start(): Pi.help
  + hi(): string

class Pi
  + help: string
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj',
      name: 'Referenced Type Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    const issues = lintArchitecture(project);
    expect(issues.some(i => i.title === 'Unreferenced Entity')).toBe(false);
  });
});
