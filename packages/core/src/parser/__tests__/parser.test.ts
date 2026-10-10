import {describe, expect, it} from 'vitest';

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

  it('parses word modifiers like public, private, protected, readonly, get, set', () => {
    const text = `
class ServiceWithModifiers
  public execute(): void
  private token: string
  protected helper(): boolean
  readonly version: string
  get status(): string
  set status(v: string): void
`;
    const result = parseOutline(text);
    const cls = result.classes.find(c => c.name === 'ServiceWithModifiers');
    expect(cls).toBeDefined();
    expect(cls?.methods).toHaveLength(4);
    expect(cls?.methods.find(m => m.name === 'execute')?.visibility).toBe(
      'public'
    );
    expect(cls?.methods.find(m => m.name === 'helper')?.visibility).toBe(
      'protected'
    );
    expect(cls?.properties).toHaveLength(2);
    expect(cls?.properties.find(p => p.name === 'token')?.visibility).toBe(
      'private'
    );
    expect(cls?.properties.find(p => p.name === 'version')?.visibility).toBe(
      'public'
    );
  });

  it('normalizes method call targets with parentheses, intra-class calls, and this/self', () => {
    const text = `
class Worker
  + doWork(): void
    -> Worker.helper()
    -> this.cleanup()
    -> notify()
  + helper(): void
  + cleanup(): void
  + notify(): void

api /api/v1/jobs
  + POST /trigger(): boolean -> Worker.doWork()

event JobFailed(Error) -> Worker.cleanup()
`;
    const result = parseOutline(text);
    const worker = result.classes.find(c => c.name === 'Worker');
    expect(worker).toBeDefined();

    const doWork = worker?.methods.find(m => m.name === 'doWork');
    expect(doWork?.calls).toEqual([
      {targetClass: 'Worker', targetMethod: 'helper'},
      {targetClass: 'Worker', targetMethod: 'cleanup'},
      {targetClass: 'Worker', targetMethod: 'notify'},
    ]);

    // Check connections generated for calls
    const workerCalls = result.connections.filter(
      c => c.sourceId === 'entity-Worker' && c.type === 'invokes'
    );
    expect(workerCalls).toHaveLength(3);
    expect(workerCalls[0].targetMember).toBe('helper');
    expect(workerCalls[1].targetMember).toBe('cleanup');
    expect(workerCalls[2].targetMember).toBe('notify');

    // Check API endpoint connection
    const apiConn = result.connections.find(
      c => c.sourceId === 'api-_api_v1_jobs'
    );
    expect(apiConn?.targetMember).toBe('doWork');

    // Check Event connection
    const eventConn = result.connections.find(
      c => c.sourceId === 'event-JobFailed'
    );
    expect(eventConn?.targetMember).toBe('cleanup');
  });

  it('links two classes when calling an external class with or without a method', () => {
    const text = `
class AuthService
  + login(): Session -> Database.query
  + logout(): void -> SessionStore
  + verify(): boolean
    calls SecurityService

class Database
  + query(): any

class SessionStore
  + clear(): void

class SecurityService
  + check(): boolean
`;
    const result = parseOutline(text);
    const authCalls = result.connections.filter(
      c => c.sourceId === 'entity-AuthService' && c.type === 'invokes'
    );
    expect(authCalls).toHaveLength(3);

    // 1. Method to method: AuthService.login -> Database.query
    expect(authCalls[0].targetId).toBe('entity-Database');
    expect(authCalls[0].sourceMember).toBe('login');
    expect(authCalls[0].targetMember).toBe('query');

    // 2. Inline class call: AuthService.logout -> SessionStore
    expect(authCalls[1].targetId).toBe('entity-SessionStore');
    expect(authCalls[1].sourceMember).toBe('logout');

    // 3. Nested class call: AuthService.verify calls SecurityService
    expect(authCalls[2].targetId).toBe('entity-SecurityService');
    expect(authCalls[2].sourceMember).toBe('verify');
  });

  it('supports direct calls and binds under classes like UI components', () => {
    const text = `
class OrderService
  calls PaymentService
  calls InventoryTable
  binds NotificationService

class PaymentService
  + charge(): boolean

db InventoryTable
  + id: uuid pk

class NotificationService
  + send(): void
`;
    const result = parseOutline(text);
    const orderCalls = result.connections.filter(
      c => c.sourceId === 'entity-OrderService'
    );
    expect(orderCalls).toHaveLength(3);

    // 1. calls PaymentService -> entity-PaymentService
    expect(orderCalls[0].targetId).toBe('entity-PaymentService');
    expect(orderCalls[0].type).toBe('invokes');

    // 2. calls InventoryTable -> table-InventoryTable
    expect(orderCalls[1].targetId).toBe('table-InventoryTable');
    expect(orderCalls[1].type).toBe('invokes');

    // 3. binds NotificationService -> entity-NotificationService
    expect(orderCalls[2].targetId).toBe('entity-NotificationService');
    expect(orderCalls[2].type).toBe('invokes');
  });

  it('supports bind as well as binds keyword under UI component', () => {
    const text = `
class AuthService
  + login(): boolean

ui LoginForm
  bind AuthService
`;
    const result = parseOutline(text);
    const uiBind = result.connections.find(c => c.sourceId === 'ui-LoginForm');
    expect(uiBind).toBeDefined();
    expect(uiBind?.targetId).toBe('entity-AuthService');
    expect(uiBind?.type).toBe('binds');
  });

  it('parses exact user schema with single-indent or nested calls, without phantom return type calls', () => {
    const text = `class MainService
  public start(): Pi.help
  public hi(): string
  calls Pi.helpc()

ui App
  binds MainService

class Pi
  public help: string
  public helpc(): Pi.help
  calls Pi.helpc()
`;
    const result = parseOutline(text);

    // 1. ui App -> MainService
    const appBind = result.connections.find(c => c.sourceId === 'ui-App');
    expect(appBind).toBeDefined();
    expect(appBind?.targetId).toBe('entity-MainService');
    expect(appBind?.type).toBe('binds');

    // 2. MainService.start has returnType Pi.help, but does NOT create a phantom call edge
    const mainService = result.classes.find(c => c.name === 'MainService');
    const startMethod = mainService?.methods.find(m => m.name === 'start');
    expect(startMethod?.returnType).toBe('Pi.help');
    const startConn = result.connections.find(
      c => c.sourceId === 'entity-MainService' && c.sourceMember === 'start'
    );
    expect(startConn).toBeUndefined();

    // 3. MainService.hi -> Pi.helpc (attached via single indent without needing double indent)
    const hiConn = result.connections.find(
      c => c.sourceId === 'entity-MainService' && c.sourceMember === 'hi'
    );
    expect(hiConn).toBeDefined();
    expect(hiConn?.targetId).toBe('entity-Pi');
    expect(hiConn?.targetMember).toBe('helpc');

    // Exactly 1 connection between MainService and Pi
    const mainToPiConns = result.connections.filter(
      c => c.sourceId === 'entity-MainService' && c.targetId === 'entity-Pi'
    );
    expect(mainToPiConns).toHaveLength(1);

    // 4. Pi.helpc -> Pi.helpc (self-invocation via single indent)
    const selfConn = result.connections.find(
      c => c.sourceId === 'entity-Pi' && c.sourceMember === 'helpc'
    );
    expect(selfConn).toBeDefined();
    expect(selfConn?.targetId).toBe('entity-Pi');
    expect(selfConn?.targetMember).toBe('helpc');
  });

  it('parses polymorphism with abstract class, interface, extends, and implements', () => {
    const text = `
interface PaymentGateway
  + charge(amount: number): Receipt
  + refund(id: string): boolean

abstract class BaseService
  # logger: string

class StripeGateway extends BaseService implements PaymentGateway, Auditable
  + charge(amount: number): Receipt
  + refund(id: string): boolean
`;
    const result = parseOutline(text);
    expect(result.classes).toHaveLength(3);

    const iface = result.classes.find(c => c.name === 'PaymentGateway');
    expect(iface?.kind).toBe('interface');
    expect(iface?.methods).toHaveLength(2);

    const base = result.classes.find(c => c.name === 'BaseService');
    expect(base?.kind).toBe('abstract');

    const stripe = result.classes.find(c => c.name === 'StripeGateway');
    expect(stripe?.kind).toBe('class');
    expect(stripe?.superClass).toBe('BaseService');
    expect(stripe?.interfaces).toEqual(['PaymentGateway', 'Auditable']);

    // Check inherits edge
    const inheritsEdge = result.connections.find(c => c.type === 'inherits');
    expect(inheritsEdge).toBeDefined();
    expect(inheritsEdge?.sourceId).toBe('entity-StripeGateway');
    expect(inheritsEdge?.targetId).toBe('entity-BaseService');

    // Check implements edges
    const implementsEdges = result.connections.filter(
      c => c.type === 'implements'
    );
    expect(implementsEdges).toHaveLength(2);
    expect(
      implementsEdges.some(e => e.targetId === 'entity-PaymentGateway')
    ).toBe(true);
    expect(implementsEdges.some(e => e.targetId === 'entity-Auditable')).toBe(
      true
    );
  });

  it('emits clear incomplete invocation diagnostics for standalone calls before binding', () => {
    const text = `
class Pi
  public pi: string

class Po
  public po: string
  private pi(): Pi.pi
    calls
`;
    const result = parseOutline(text);
    expect(result.classes).toHaveLength(2);
    expect(result.diagnostics).toEqual([
      {
        line: 8,
        message:
          'Incomplete invocation statement: expected target entity or method after "calls"',
        severity: 'info',
      },
    ]);
  });

  it('parses Three-Tier Architecture with implicit defaults, modifiers, and Level 3 verbs', () => {
    const text = `
class UserService
  getUser(id: string): User
  avatarUrl?: string
  status: "active" | "pending" | "archived"
  static defaultRole: string
  async authenticate(credentials: object): boolean
    call Database.findUser(credentials)
    dispatch UserStore.setUser(user)
    emit UserLoggedIn(user.id)
    query UsersTable.select(user.id)
    mutate UsersTable.update(user.id)

function calculateTax(subtotal: number, rate?: number): number
  call TaxService.getRate(rate)

ui UserProfileView
  prop user: User
  prop showDetails?: boolean
  emit onSave: User
  render ui.AvatarComponent
  binds UserService

db UsersTable
  id: uuid pk
  email: string unique
  nickname?: string nullable index
  created_at: timestamp default

state UserStore
  currentUser: User
  get isAuthenticated: boolean
  action setUser(user: User): void
`;
    const result = parseOutline(text);

    // 1. Classes & defaults
    const userService = result.classes.find(c => c.name === 'UserService');
    expect(userService).toBeDefined();
    expect(userService?.methods[0].name).toBe('getUser');
    expect(userService?.methods[0].visibility).toBe('public'); // Implicit public
    expect(userService?.properties[0].name).toBe('avatarUrl');
    expect(userService?.properties[0].isOptional).toBe(true);
    expect(userService?.properties[1].type).toBe(
      '"active" | "pending" | "archived"'
    );
    expect(userService?.properties[2].isStatic).toBe(true);

    const authMethod = userService?.methods.find(
      m => m.name === 'authenticate'
    );
    expect(authMethod?.isAsync).toBe(true);
    expect(authMethod?.calls).toHaveLength(5);
    expect(authMethod?.calls?.[0]).toEqual({
      targetClass: 'Database',
      targetMethod: 'findUser',
      verb: 'call',
      payload: 'credentials',
    });
    expect(authMethod?.calls?.[1]).toEqual({
      targetClass: 'UserStore',
      targetMethod: 'setUser',
      verb: 'dispatch',
      payload: 'user',
    });
    expect(authMethod?.calls?.[2]).toEqual({
      targetClass: 'UserLoggedIn',
      targetMethod: '',
      verb: 'emit',
      payload: 'user.id',
    });
    expect(authMethod?.calls?.[3]).toEqual({
      targetClass: 'UsersTable',
      targetMethod: 'select',
      verb: 'query',
      payload: 'user.id',
    });
    expect(authMethod?.calls?.[4]).toEqual({
      targetClass: 'UsersTable',
      targetMethod: 'update',
      verb: 'mutate',
      payload: 'user.id',
    });

    // 2. Standalone Functions
    expect(result.functions).toHaveLength(1);
    const taxFn = result.functions?.[0];
    expect(taxFn?.name).toBe('calculateTax');
    expect(taxFn?.parameters[1].isOptional).toBe(true);
    expect(taxFn?.calls).toHaveLength(1);
    expect(taxFn?.calls?.[0].verb).toBe('call');

    // 3. UI Components & Composition
    const profileUI = result.uiComponents.find(
      u => u.name === 'UserProfileView'
    );
    expect(profileUI).toBeDefined();
    expect(profileUI?.props?.[0].name).toBe('user');
    expect(profileUI?.props?.[1].isOptional).toBe(true);
    expect(profileUI?.emits?.[0].name).toBe('onSave');
    expect(profileUI?.renderedComponents).toContain('AvatarComponent');

    // 4. DB Constraints
    const db = result.tables.find(t => t.name === 'UsersTable');
    expect(db).toBeDefined();
    expect(db?.columns.find(c => c.name === 'nickname')?.isNullable).toBe(true);
    expect(db?.columns.find(c => c.name === 'nickname')?.isIndexed).toBe(true);
    expect(db?.columns.find(c => c.name === 'created_at')?.defaultValue).toBe(
      'default'
    );

    // 5. State Store
    const stateStore = result.states.find(s => s.name === 'UserStore');
    expect(stateStore).toBeDefined();
    expect(
      stateStore?.fields.find(f => f.name === 'isAuthenticated')?.modifier
    ).toBe('get');
    expect(stateStore?.fields.find(f => f.name === 'setUser')?.modifier).toBe(
      'action'
    );
  });
});
