import {describe, it, expect} from 'vitest';
import {
  exportToMermaidClassDiagram,
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

  it('exports valid flowchart syntax', () => {
    const text = `
class Service
ui App
  ui Child
    binds Service
`;
    const parsed = parseOutline(text);
    const project = {
      id: 'proj-2',
      name: 'Test Project',
      rawOutlineText: text,
      classes: parsed.classes,
      uiComponents: parsed.uiComponents,
      connections: parsed.connections,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    const flowchart = exportToMermaidFlowchart(project);
    expect(flowchart).toContain('flowchart TD');
    expect(flowchart).toContain('subgraph UI_Hierarchy');
    expect(flowchart).toContain('ui-App --> ui-Child');
  });
});
