import {describe, it, expect} from 'vitest';
import {
  exportToMermaidClassDiagram,
  exportToMermaidERDiagram,
  exportToMermaidFlowchart,
} from '../mermaid';
import {parseOutline} from '../../parser/parser';

describe('Mermaid Exporter', () => {
  it('exports valid class diagram syntax', () => {
    const text = `
class UserService
  + name: string
  + login(): boolean -> AuthService.verify

class AuthService
  + verify(): boolean
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj-1',
      name: 'Test Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      tables: parsed.tables,
      apiRoutes: parsed.apiRoutes,
      events: parsed.events,
      states: parsed.states,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    const mermaid = exportToMermaidClassDiagram(project);
    expect(mermaid).toContain('classDiagram');
    expect(mermaid).toContain('class UserService {');
    expect(mermaid).toContain('+string name');
    expect(mermaid).toContain('UserService ..> AuthService');
  });

  it('exports valid ER diagram syntax for database tables', () => {
    const text = `
db Users
  + id: uuid pk
  + teamId: uuid fk -> Teams.id

db Teams
  + id: uuid pk
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj-db',
      name: 'DB Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      tables: parsed.tables,
      apiRoutes: parsed.apiRoutes,
      events: parsed.events,
      states: parsed.states,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    const erDiagram = exportToMermaidERDiagram(project);
    expect(erDiagram).toContain('erDiagram');
    expect(erDiagram).toContain('Users {');
    expect(erDiagram).toContain('Teams ||--o{ Users : "references"');
  });

  it('exports valid flowchart syntax across all domains', () => {
    const text = `
class Service
  + run(): void

ui App
  ui Child
    binds Service

api /api/v1
db Database
event UserCreated
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj-2',
      name: 'Test Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      tables: parsed.tables,
      apiRoutes: parsed.apiRoutes,
      events: parsed.events,
      states: parsed.states,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    const flowchart = exportToMermaidFlowchart(project);
    expect(flowchart).toContain('flowchart TD');
    expect(flowchart).toContain('subgraph UI_Hierarchy');
    expect(flowchart).toContain('subgraph API_Routes');
    expect(flowchart).toContain('subgraph Database');
    expect(flowchart).toContain('subgraph Events');
  });
});
