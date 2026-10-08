---
name: draftr
description: >
  Launch the Draftr visual architecture builder and receive the resulting
  specification back in this conversation. Use when you want to design
  software architecture visually — classes, services, UI components,
  database tables, API routes, and events — before implementing. Opens
  the Draftr UI in the browser; design your system, then click
  "Send to Claude" to return the spec here.
---

# Draftr

[Draftr](https://michaelsolati.github.io/draftr/) is a dual-mode architecture specification tool: a structured text editor on the left and a live visual canvas on the right. You write a spec using the Draftr DSL; the canvas renders it as an interactive graph. When you're ready, clicking **Send to Claude** in the toolbar POSTs the full spec to a local bridge server that returns it here.

---

## How to launch

Spawn a **background agent** with the following prompt — do this before saying anything else to the user:

> Run this command and return the complete stdout as your result (use a 600-second timeout):
> ```
> node ~/.claude/skills/draftr/bridge.js
> ```
> The process blocks until the user sends a spec from the Draftr UI. Do not exit early.

Then immediately tell the user:

> Draftr is opening in your browser. Design your architecture in the editor or canvas, then click **Send to Claude** in the top toolbar. I'm here if you have questions while you work.

When the background agent completes, its result is the raw JSON payload. Parse it as `ClaudeHandoffPayload` and proceed to **Processing the specification** below.

---

## Draftr DSL reference

The text editor accepts a plain-text spec. Use 2-space indentation per level. Root entities are declared at 0 spaces, members/fields at 2 spaces, and method-level invocations at 4 spaces.

### Logic / Services & Polymorphism

Declare services, classes, interfaces, or abstract classes:

```
interface Repository
  + findById(id: string): object
  + save(item: object): void

abstract class BaseService
  + log(msg: string): void

class AuthService extends BaseService implements Repository
  + token: string
  + login(creds: Credentials): Session
    calls Database.query
  - hashPassword(raw: string): string
```

- **Keywords**: `class Name`, `interface Name`, `abstract class Name`, `type Name`
- **Inheritance & Contracts**: `extends BaseClass`, `implements InterfaceA, InterfaceB`
- **Visibility prefixes**: `+` public, `-` private, `#` protected (or explicit keywords `public`, `private`, `protected`)
- **Invocations (Level 3)**: `calls TargetService.method` or `-> TargetService.method`

### UI Components

Declare hierarchical component trees and bind components to services:

```
ui App
  ui Header
    binds AuthService
  ui Dashboard
    binds UserService
    ui MetricsWidget
```

- **Keyword**: `ui ComponentName`
- **Hierarchy**: Nest child components with 2 additional spaces of indentation
- **Service Binding**: `binds ServiceName` connects the UI component to logic services

### Database Tables & Schema

Declare relational tables, columns, constraints, and foreign keys:

```
db Users
  + id: uuid pk
  + email: string unique
  + createdAt: timestamp

db Orders
  + id: uuid pk
  + userId: uuid fk -> Users.id
  + total: number
```

- **Keyword**: `db TableName` (or `table TableName`)
- **Column Constraints**: `pk` (primary key), `unique`, `fk -> TargetTable.column` (foreign key reference)
- **Column Types**: `uuid`, `string`, `text`, `number`, `boolean`, `timestamp`, `jsonb`, etc.

### REST API Routes

Declare REST route groups and HTTP endpoints bound to backend handlers:

```
api /api/v1/auth
  + POST /login(LoginDTO): Session -> AuthService.login

api /api/v1/orders
  + GET /list(): Order[]
  + POST /create(OrderPayload): OrderResponse -> OrderService.checkout
```

- **Keyword**: `api /path/prefix`
- **Endpoints**: `+ VERB /subpath(RequestDTO): ResponseType -> Service.method`
- **HTTP Verbs**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`

### Event Pub/Sub & Messaging

Declare event streams, payloads, and target handlers:

```
event UserRegistered(UserEvent) -> UserService.sendWelcome

class UserService
  + register(user: User): void
    emits UserRegistered
```

- **Keyword**: `event EventName(PayloadType) -> TargetService.handlerMethod`
- **Emission (Level 3)**: Inside a service method, `emits EventName` links the method to the event

### Client State Slices

Declare client frontend state models and stores:

```
state AuthState
  + userId: string
  + isAuthenticated: boolean
  + token: string
```

- **Keyword**: `state StateName`
- **Properties**: `+ propertyName: type`

---

## Processing the specification

Once the background agent returns, parse its stdout as JSON — this is the `ClaudeHandoffPayload`:

```json
{
  "projectId": "...",
  "projectName": "...",
  "rawOutlineText": "...",
  "classes": [...],
  "uiComponents": [...],
  "connections": [...],
  "mermaidClassDiagram": "...",
  "mermaidFlowchart": "...",
  "updatedAt": 1234567890
}
```

Key fields:
- `rawOutlineText` — the original Draftr DSL text; treat this as the authoritative source
- `classes` — parsed class/service definitions with methods, properties, visibility, `superClass`, and `interfaces`
- `uiComponents` — component hierarchy with parent/child relationships and bound services
- `connections` — graph edges (`invokes`, `binds`, `inherits`, `implements`, `foreignKey`, `emits`)
- `mermaidClassDiagram` / `mermaidFlowchart` — pre-generated Mermaid diagrams for documentation

After parsing:
1. Confirm the architecture with the user — ask about anything ambiguous
2. Ask about implementation preferences: language, framework, testing strategy, folder structure
3. Implement the system following the class definitions, method signatures, UI hierarchy, and connection wiring
