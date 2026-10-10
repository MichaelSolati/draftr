---
id: blocks
title: "Level 1: Object declarations"
sidebar_position: 1
---

# Level 1: Object declarations

Level 1 objects are root entities that represent architectural components. You declare Level 1 objects at zero indentation using the following sequence:

```
[object_type] [name]
```

## Supported object types

Draftr supports 10 root object types:

| Object type | Category | Purpose | Canvas node style | Outbound relations |
| :--- | :--- | :--- | :--- | :--- |
| `class` | Domain logic | Concrete service, business logic manager, or model | Blue (`service`) | `call`, `extends`, `implements`, `emit` |
| `abstract class` | Polymorphism | Abstract base class with template methods | Navy (`service`) | `extends`, `implements`, `call` |
| `interface` | Contract | Structural contract defining required signatures | Amber (`interface`) | `extends` |
| `type` | Domain modeling | Data transfer object (DTO) or struct | Gray (`type`) | None |
| `db` | Persistence | Relational database table or collection | Green (`table`) | `references` (foreign keys) |
| `api` | Gateway | REST API route group | Purple (`api`) | `call` (handler method) |
| `ui` | Presentation | User interface component or screen | Rose (`ui`) | `emit`, `render` |
| `event` | Messaging | Asynchronous event or queue topic | Yellow (`event`) | `emit` (handler method) |
| `state` | Client store | Reactive frontend state slice | Teal (`state`) | None |
| `function` | Domain logic | Standalone utility function or procedure | Blue (`service`) | `call`, `emit` |

## Object declarations and examples

### Classes

Use `class` to define a concrete business service or domain entity. Classes support inheritance with `extends` and interface implementation with `implements`:

```draftr
class OrderService extends BaseService implements IOrderProcessor
  public orderCounter: number
  public process(orderId: string): boolean
    call PaymentGateway.charge(orderId)
```

### Abstract classes

Use `abstract class` to define an uninstantiable base service that child classes can inherit:

```draftr
abstract class BaseService
  protected logger: LoggerInstance
  public initialize()
```

### Interfaces

Use `interface` to define an architectural contract. Implementing classes must define all methods specified by the interface:

```draftr
interface PaymentGateway
  public authorize(token: string, amount: number): boolean
  public refund(transactionId: string): RefundReceipt
```

### Types

Use `type` to define a data transfer object (DTO) or typed struct:

```draftr
type OrderPayload
  orderId: string
  customerEmail: string
  items: OrderItem[]
  totalAmount: number
```

### Database tables

Use `db` to define a relational database table:

```draftr
db Users
  pk id: uuid
  unique email: string
  created_at: timestamp

db Orders
  pk id: uuid
  fk user_id: Users.id
  total_price: number
```

### API route groups

Use `api` followed by a base path to define REST gateway routes:

```draftr
api /api/v1/orders
  POST /create(CreateOrderDto): OrderResponse
    call OrderService.checkout(orderData)
  GET /:id(): OrderDetails
    call OrderService.getOrder(id)
```

### UI components

Use `ui` to declare user interface screens and component trees:

```draftr
ui CheckoutPage
  prop orderId: string
  render ui.NavigationSidebar
  render ui.PaymentCardForm
```

### Events

Use `event` to declare an asynchronous domain event or pub/sub message topic:

```draftr
event OrderPlaced(OrderPayload)
```

### State stores

Use `state` to declare a client-side reactive store slice:

```draftr
state CartStore
  items: CartItem[]
  total: number
  isSubmitting: boolean
  action addItem(item: CartItem)
```

### Standalone functions

Use `function` to define a standalone procedure or utility:

```draftr
function calculateTax(amount: number, rate: number): number
```
