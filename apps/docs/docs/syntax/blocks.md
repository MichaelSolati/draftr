---
id: blocks
title: Entity Declarations
sidebar_position: 1
---

# Entity Declarations (Objects)

Draftr specifications are built from top-level blocks known as **Entities** or **Objects**. Every object declaration starts at **Level 1** (0 indentation spaces).

---

## Entity Taxonomy Matrix

| Object Keyword | Semantic Category | Description | Allowed Children | Outbound Connections |
| :--- | :--- | :--- | :--- | :--- |
| `class` | Domain Logic | Concrete service or business model | Properties, Methods, Direct calls | `calls`, `extends`, `implements`, `emits` |
| `abstract class` | Polymorphism | Abstract base service with partial implementation | Properties, Methods | `extends`, `implements`, `calls` |
| `interface` | Contract | Structural contract defining required signatures | Methods, Properties | `extends` |
| `type` | Domain Modeling | Data transfer object (DTO) or struct | Properties / Fields | None |
| `db` | Persistence | Relational database table or collection | Columns (`pk`, `fk`, `unique`) | `references` (foreign key) |
| `api` | Gateway | REST API route group | Endpoints (`GET`, `POST`, etc.) | `routes_to` (service handler) |
| `ui` | Presentation | Frontend screen or component tree | Nested `ui`, `binds` | `binds` (service or state) |
| `event` | Messaging | Asynchronous event or queue topic | Payload type | `emits` (handler method) |
| `state` | Client Store | Frontend state slice (Zustand, Redux) | State fields | None |

---

## Detailed Object Specifications

### `class`
Represents a concrete domain service, manager, or business logic model.
```draftr
class OrderService extends BaseService implements IOrderProcessor
  public id: string
  private encryptionKey: string
  public checkout(cartId: string, amount: number): OrderConfirmation
    calls PaymentService.charge
    calls InventoryService.decrementStock
    emits OrderCompleted
```

### `abstract class`
Represents an inheritable base class that provides shared functionality or template methods.
```draftr
abstract class BaseService
  protected logger: LoggerInstance
  public initialize(): void
```

### `interface`
Defines an architectural contract. Implementing classes must satisfy all method signatures.
```draftr
interface PaymentGateway
  + authorize(token: string, amount: number): boolean
  + refund(transactionId: string): RefundReceipt
```

### `type`
Defines a data shape, transfer object, or payload.
```draftr
type OrderPayload
  + orderId: string
  + customerEmail: string
  + totalAmount: number
```

### `db`
Defines a relational database table with primary keys, unique constraints, and foreign keys.
```draftr
db Users
  + id: uuid pk
  + email: string unique

db Orders
  + id: uuid pk
  + user_id: uuid fk -> Users.id
  + total_price: number
```

### `api`
Defines HTTP REST gateway routing and endpoint-to-service links.
```draftr
api /api/v1/orders
  + POST /create(CreateOrderDto): OrderResponse -> OrderService.checkout
  + GET /:id(): OrderDetails -> OrderService.getOrder
  + DELETE /:id(): void -> OrderService.cancelOrder
```

### `ui`
Defines frontend component trees and binds them to backend services or state slices.
```draftr
ui CheckoutPage
  binds OrderService
  binds CartStore
  ui PaymentCardForm
    binds PaymentService
```

:::warning Architectural Guardrail
UI components cannot directly bind or call `db` tables (`binds UsersTable` triggers an architectural linter error). All database access must flow through a `class` service.
:::

### `event`
Defines an asynchronous message or event topic with an optional handler target.
```draftr
event OrderPlaced(OrderPayload) -> NotificationService.sendEmail
```

### `state`
Defines a client reactive store slice.
```draftr
state CartState
  + items: CartItem[]
  + subtotal: number
  + isSubmitting: boolean
```
