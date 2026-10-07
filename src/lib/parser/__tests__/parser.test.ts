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
    expect(auth.methods).toHaveLength(2);
  });

  it('parses database tables and foreign keys', () => {
    const text = `
db Users
  + id: uuid pk
  + email: string unique
  + teamId: uuid fk -> Teams.id

db Teams
  + id: uuid pk
  + name: string
`;
    const result = parseOutline(text);
    expect(result.tables).toHaveLength(2);
    const users = result.tables.find(t => t.name === 'Users');
    expect(users).toBeDefined();
    expect(users?.columns).toHaveLength(3);
    expect(users?.columns[0].isPrimary).toBe(true);
    expect(users?.columns[1].isUnique).toBe(true);
    expect(users?.columns[2].isForeignKey).toBe(true);
    expect(users?.columns[2].references).toEqual({
      table: 'Teams',
      column: 'id',
    });

    const fkEdge = result.connections.find(c => c.type === 'foreignKey');
    expect(fkEdge).toBeDefined();
    expect(fkEdge?.sourceId).toBe('table-Users');
    expect(fkEdge?.targetId).toBe('table-Teams');
  });

  it('parses API routes and endpoints', () => {
    const text = `
class AuthService
  + login(dto: LoginDTO): Token

api /api/v1/auth
  + POST /login(LoginDTO): Token -> AuthService.login
  + GET /verify(): boolean
`;
    const result = parseOutline(text);
    expect(result.apiRoutes).toHaveLength(1);
    const route = result.apiRoutes[0];
    expect(route.path).toBe('/api/v1/auth');
    expect(route.endpoints).toHaveLength(2);
    expect(route.endpoints[0].method).toBe('POST');
    expect(route.endpoints[0].targetHandler).toEqual({
      targetClass: 'AuthService',
      targetMethod: 'login',
    });

    const invokeEdge = result.connections.find(
      c => c.sourceId === 'api-_api_v1_auth'
    );
    expect(invokeEdge).toBeDefined();
    expect(invokeEdge?.targetId).toBe('entity-AuthService');
  });

  it('parses events and state slices', () => {
    const text = `
class OrderService
  + fulfill(): void

event OrderPaid(OrderDTO) -> OrderService.fulfill

state CartState
  + items: CartItem[]
  + total: number
`;
    const result = parseOutline(text);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe('OrderPaid');
    expect(result.events[0].payloadType).toBe('OrderDTO');

    expect(result.states).toHaveLength(1);
    expect(result.states[0].name).toBe('CartState');
    expect(result.states[0].fields).toHaveLength(2);

    const emitEdge = result.connections.find(c => c.type === 'emits');
    expect(emitEdge).toBeDefined();
    expect(emitEdge?.sourceId).toBe('event-OrderPaid');
    expect(emitEdge?.targetId).toBe('entity-OrderService');
  });
});
