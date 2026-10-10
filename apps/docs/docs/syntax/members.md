---
id: members
title: "Level 2: Member definitions"
sidebar_position: 2
---

# Level 2: Member definitions

Level 2 members represent properties, methods, columns, endpoints, and attributes defined inside a Level 1 object. You indent Level 2 members by two spaces under their parent object.

## Declaration sequence

Every Level 2 member follows this declaration sequence:

```
[visibility] [modifier] [name]: [type]
```

## Member matrix by object type

The following table lists the supported visibilities, modifiers, and typing rules across each object type:

| Object type | Visibility | Modifier | Name | Typing (type / return) |
| :--- | :--- | :--- | :--- | :--- |
| **`class`** | `public`, `private`, `protected`, `readonly`<br/>*(Defaults to `public`)* | `get`, `set`, `static`, `async`<br/>*(Omit for standard members)* | Supported | Supported<br/>*(Defaults to `void`)* |
| **`db`** | *Not supported* | `pk`, `fk`, `unique`, `nullable`, `index`, `default`<br/>*(Omit for standard columns)* | Supported | Supported |
| **`event`** | *Not supported* | *Not supported* | Supported | Supported |
| **`function`** | `public`, `private`, `protected`<br/>*(Defaults to `public`)* | `param`, `return` | Supported | Supported |
| **`interface`** | `public`, `private`, `protected`, `readonly`<br/>*(Defaults to `public`)* | `get`, `set`<br/>*(Omit for standard members)* | Supported | Supported<br/>*(Defaults to `void`)* |
| **`state`** | `public`, `private`, `protected`, `readonly`<br/>*(Defaults to `public`)* | `get`, `set`, `action`<br/>*(Omit for raw state)* | Supported | Supported<br/>*(Defaults to `void`)* |
| **`type`** | *Not supported* | *Not supported* | Supported | Supported |
| **`ui`** | *Not supported* | `prop`, `emit` | Supported | Supported |

## Visibility rules

Four visibility keywords control member access:

* **`public`**: Accessible from any object or layer.
* **`private`**: Restricted strictly to the declaring object.
* **`protected`**: Accessible only within the declaring object and its subclasses.
* **`readonly`**: Value cannot be reassigned after initialization.

If you omit the visibility keyword on a `class`, `interface`, `function`, or `state` member, Draftr defaults the visibility to `public`:

```draftr
class UserService
  // Verbose declaration
  public getUser(id: string): User

  // Implicit declaration (defaults to public)
  getUser(id: string): User
```

## Modifier rules

You only include a modifier when a member deviates from standard behavior:

* **Classes and interfaces:** Declare `async`, `static`, `get`, or `set` only when required. The presence of parentheses `()` distinguishes a method from a property:
  ```draftr
  class AnalyticsService
    public static instance: AnalyticsService
    public async fetchMetrics(): MetricsReport
    public get currentStatus(): string
  ```
* **Database tables:** Declare constraints such as `pk`, `fk`, `unique`, `nullable`, `index`, or `default` only when needed:
  ```draftr
  db Users
    pk id: uuid
    unique email: string
    nullable bio: text
    default created_at: timestamp
  ```
* **UI components:** Use `prop` for incoming component properties and `emit` for component event outputs:
  ```draftr
  ui UserAvatar
    prop avatarUrl?: string
    prop size: "small" | "medium" | "large"
    emit select: UserId
  ```
* **State stores:** Standard variables represent raw state. Use `action` for state mutations and `get` for computed selectors:
  ```draftr
  state CartStore
    items: CartItem[]
    get itemCount(): number
    action addItem(item: CartItem)
  ```

## Return type defaults

If you declare a method, function, or action without a return type annotation `: [type]`, Draftr assumes the return type is `void`:

```draftr
class PaymentProcessor
  // Verbose declaration
  public processRefund(transactionId: string): void

  // Implicit declaration (defaults to void)
  public processRefund(transactionId: string)
```
