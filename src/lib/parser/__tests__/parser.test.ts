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

  it('parses member dot path return types like Pi.help', () => {
    const text = `
class MainService
  + start(): Pi.help
  + hi(a: string): string

ui App
  binds MainService

class Pi
  + help: string
`;
    const result = parseOutline(text);
    const main = result.classes.find(c => c.name === 'MainService');
    expect(main).toBeDefined();
    const startMethod = main?.methods.find(m => m.name === 'start');
    expect(startMethod?.returnType).toBe('Pi.help');
  });

  it('parses sub-bullet method invocations cleanly separated from return values', () => {
    const text = `
class MainService
  + start(): Pi.help
    -> Pi.help
    calls OtherService.run
  + process(): boolean
    - Logger.log

class Pi
  + help: string

class OtherService
  + run(): void

class Logger
  + log(): void
`;
    const result = parseOutline(text);
    const main = result.classes.find(c => c.name === 'MainService');
    expect(main).toBeDefined();
    const start = main?.methods.find(m => m.name === 'start');
    expect(start?.returnType).toBe('Pi.help');
    expect(start?.calls).toHaveLength(2);
    expect(start?.calls?.[0]).toEqual({
      targetClass: 'Pi',
      targetMethod: 'help',
    });
    expect(start?.calls?.[1]).toEqual({
      targetClass: 'OtherService',
      targetMethod: 'run',
    });

    const processMethod = main?.methods.find(m => m.name === 'process');
    expect(processMethod?.calls).toHaveLength(1);
    expect(processMethod?.calls?.[0]).toEqual({
      targetClass: 'Logger',
      targetMethod: 'log',
    });

    expect(result.connections.some(c => c.targetId === 'entity-Pi')).toBe(true);
    expect(
      result.connections.some(c => c.targetId === 'entity-OtherService')
    ).toBe(true);
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
