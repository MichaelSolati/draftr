---
id: invocations
title: "Level 3: Invocations and relations"
sidebar_position: 3
---

# Level 3: Invocations and relations

Level 3 statements define interactions, data access, event emissions, and UI composition. You indent Level 3 invocations by four spaces under a Level 2 member.

## Invocation sequence

Every Level 3 invocation follows this sequence:

```
[verb] [target].[member]([payload])
```

## Verb matrix by target object

Draftr pairs specific verbs with specific target object types:

| Target object | Verb | Target and member structure | Payload and arguments | Example syntax |
| :--- | :--- | :--- | :--- | :--- |
| **`class`**, **`api`**, **`function`** | `call` | Supported | Supported | `call UserService.authenticateUser(credentials)` |
| **`event`**, **`ui`** | `emit` | Supported | Supported | `emit OrderPlaced(orderData)` |
| **`state`** | `dispatch` | Supported | Supported | `dispatch CartStore.addItem(item)` |
| **`db`** | `query`, `mutate` | Supported | Supported | `query Users.findById(userId)` |
| **`ui` (composition)** | `render` | Supported | *Not supported* | `render ui.NavigationSidebar` |

## Verb descriptions and examples

### Service and API calls (`call`)

Use `call` when a method executes a procedure on a class, API endpoint, or standalone function:

```draftr
class CheckoutService
  public executeOrder(cartId: string): OrderConfirmation
    call CartService.validateCart(cartId)
    call PaymentGateway.charge(cartId)
```

### Event emission (`emit`)

Use `emit` to publish an asynchronous domain event:

```draftr
class OrderService
  public completeOrder(orderId: string)
    emit OrderPlaced(orderId)
```

### State mutations (`dispatch`)

Use `dispatch` when a method or handler triggers an action on a client state store:

```draftr
ui AddToCartButton
  public handleClick(item: CartItem)
    dispatch CartStore.addItem(item)
```

### Database operations (`query` and `mutate`)

Use `query` to read data from a table and `mutate` to insert, update, or delete records:

```draftr
class UserRepository
  public getUserProfile(userId: string): UserProfile
    query Users.findById(userId)

  public updateEmail(userId: string, newEmail: string)
    mutate Users.updateEmail(userId, newEmail)
```

:::warning Architectural Guardrail
UI components must not invoke `query` or `mutate` directly against a database table. Database operations must be called from within a `class` service.
:::

### UI component composition (`render`)

Use `render` to compose child UI components into a parent view. Omit the payload block `([payload])` for `render` statements; prop data flow is handled in code implementation:

```draftr
ui DashboardPage
  // Valid UI composition
  render ui.NavigationSidebar
  render ui.MetricsGrid
```
