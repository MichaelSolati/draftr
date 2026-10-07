import {describe, it, expect} from 'vitest';
import {parseOutline} from '../parser';

describe('DSL Parser', () => {
  it('parses classes with properties and methods', () => {
    const text = `
class AuthService
  + token: string
  - secretKey: string
  + login(creds: Credentials): Session
  # validate(token: string): boolean
`;
    const result = parseOutline(text);
    expect(result.classes).toHaveLength(1);
    const auth = result.classes[0];
    expect(auth.name).toBe('AuthService');
    expect(auth.kind).toBe('class');
    expect(auth.properties).toHaveLength(2);
    expect(auth.properties[0]).toEqual({
      name: 'token',
      visibility: 'public',
      type: 'string',
    });
    expect(auth.properties[1]).toEqual({
      name: 'secretKey',
      visibility: 'private',
      type: 'string',
    });
    expect(auth.methods).toHaveLength(2);
    expect(auth.methods[0].name).toBe('login');
    expect(auth.methods[0].parameters).toEqual([
      {name: 'creds', type: 'Credentials'},
    ]);
    expect(auth.methods[0].returnType).toBe('Session');
  });

  it('parses inline call connections', () => {
    const text = `
class OrderService
  + submit(orderId: string): Receipt -> PaymentService.charge

class PaymentService
  + charge(): boolean
`;
    const result = parseOutline(text);
    expect(result.classes).toHaveLength(2);
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0]).toEqual({
      id: 'edge-entity-OrderService-submit->PaymentService.charge',
      sourceId: 'entity-OrderService',
      sourceMember: 'submit',
      targetId: 'entity-PaymentService',
      targetMember: 'charge',
      type: 'invokes',
    });
  });

  it('parses UI component hierarchy and logic bindings', () => {
    const text = `
class AuthService
  + logout(): void

ui App
  ui Header
    binds AuthService
  ui Dashboard
`;
    const result = parseOutline(text);
    expect(result.classes).toHaveLength(1);
    expect(result.uiComponents).toHaveLength(3);

    const app = result.uiComponents.find(u => u.name === 'App');
    const header = result.uiComponents.find(u => u.name === 'Header');
    const dashboard = result.uiComponents.find(u => u.name === 'Dashboard');

    expect(app?.children).toContain(header?.id);
    expect(app?.children).toContain(dashboard?.id);
    expect(header?.parentId).toBe(app?.id);
    expect(header?.boundLogicEntities).toContain('AuthService');

    const bindEdge = result.connections.find(c => c.type === 'binds');
    expect(bindEdge).toBeDefined();
    expect(bindEdge?.sourceId).toBe(header?.id);
    expect(bindEdge?.targetId).toBe('entity-AuthService');
  });

  it('produces non-blocking diagnostics for unrecognized syntax', () => {
    const text = `
class BrokenClass
  incomplete line without modifier
`;
    const result = parseOutline(text);
    expect(result.classes).toHaveLength(1);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
