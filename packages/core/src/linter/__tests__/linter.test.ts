import {describe, expect, it} from 'vitest';

import {parseOutline} from '../../parser/parser';
import {lintArchitecture} from '../rules';

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
  pk id: uuid
  fk user_id: MissingUsers.id

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

  it('detects unresolved superclass and interface targets', () => {
    const text = `
class Dog extends MissingAnimal implements MissingPet, IWalker
  + bark(): void

interface IWalker
  + walk(): void
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj',
      name: 'Polymorphism Target Check',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    const issues = lintArchitecture(project);
    expect(
      issues.some(
        i =>
          i.title === 'Unresolved Inheritance Target' &&
          i.description.includes('MissingAnimal')
      )
    ).toBe(true);
    expect(
      issues.some(
        i =>
          i.title === 'Unresolved Interface Target' &&
          i.description.includes('MissingPet')
      )
    ).toBe(true);
    expect(
      issues.some(
        i =>
          i.title === 'Unresolved Interface Target' &&
          i.description.includes('IWalker')
      )
    ).toBe(false);
  });

  it('detects circular inheritance chains', () => {
    const text = `
class NodeA extends NodeB
  + val: string

class NodeB extends NodeC
  + val: string

class NodeC extends NodeA
  + val: string
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj',
      name: 'Circular Inheritance Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    const issues = lintArchitecture(project);
    expect(issues.some(i => i.title === 'Circular Inheritance Chain')).toBe(
      true
    );
  });

  it('detects interface contract violations and verifies compliance when satisfied', () => {
    const incompleteText = `
interface Repository
  + findById(id: string): object
  + save(item: object): void

class SqlRepository implements Repository
  + findById(id: string): object
`;
    const parsedIncomplete = parseOutline(incompleteText);
    const incompleteProject = {
      id: 'proj',
      name: 'Contract Test',
      rawOutlineText: incompleteText,
      classes: parsedIncomplete.classes,
      uiComponents: parsedIncomplete.uiComponents,
      connections: parsedIncomplete.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    const issuesIncomplete = lintArchitecture(incompleteProject);
    const contractViolation = issuesIncomplete.find(
      i => i.title === 'Interface Contract Violation'
    );
    expect(contractViolation).toBeDefined();
    expect(contractViolation?.description).toContain('save()');

    const completeText = `
interface Repository
  + findById(id: string): object
  + save(item: object): void

class SqlRepository implements Repository
  + findById(id: string): object
  + save(item: object): void
`;
    const parsedComplete = parseOutline(completeText);
    const completeProject = {
      id: 'proj',
      name: 'Contract Test Satisfied',
      rawOutlineText: completeText,
      classes: parsedComplete.classes,
      uiComponents: parsedComplete.uiComponents,
      connections: parsedComplete.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    const issuesComplete = lintArchitecture(completeProject);
    expect(
      issuesComplete.some(i => i.title === 'Interface Contract Violation')
    ).toBe(false);
  });
});
