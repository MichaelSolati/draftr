---
id: intro
slug: /
title: Draftr overview
sidebar_position: 1
---

# Draftr overview

Draftr is an Architecture-as-Code (AaC) specification language. You use Draftr (`.draftr`) to define software architectures in a terse, indentation-delimited format that parses into interactive diagrams, architectural linting rules, and scaffolded source code.

## Three-tier architecture

Draftr organizes all declarations into three distinct structural tiers:

* **Level 1 (Object):** Root entities that define architectural components.
  * Sequence: `[object_type] [name]`
* **Level 2 (Member):** Properties, methods, columns, endpoints, and bindings nested within an object.
  * Sequence: `[visibility] [modifier] [name]: [type]`
* **Level 3 (Invocation):** Call, invoke, and emit statements nested within a member.
  * Sequence: `[verb] [target].[member]([payload])`

```draftr
// Level 1: Object declaration (0 spaces)
class OrderService extends BaseService implements IOrderProcessor

  // Level 2: Member declaration (2 spaces)
  public orderCounter: number
  private apiKey: string
  public process(orderId: string): boolean

    // Level 3: Invocation statement (4 spaces)
    call PaymentGateway.charge(orderId)
    call InventoryService.reserve(orderId)
    emit OrderProcessed(orderId)
```

## Indentation rules

Draftr enforces indentation to structure parent and child relationships:

* Use two spaces or one tab per indentation level.
* Place Level 1 root objects at zero indentation.
* Indent Level 2 members by two spaces under their parent object.
* Indent Level 3 invocations by four spaces under their parent member.

## Implicit defaults

To keep your specifications readable, the Draftr parser applies three defaults:

1. **Visibility defaults to `public`:** If you omit a visibility keyword on an object that supports access control (`class`, `interface`, `function`, `state`), Draftr treats the member as `public`.
2. **Return types default to `void`:** If you omit `: [type]` on a method, function, or action, Draftr assumes the return type is `void`.
3. **Standard members omit modifiers:** You only declare a modifier keyword when a member deviates from standard behavior (for example, `static`, `async`, `get`, or `set`).

## Shorthand macros

Editor extensions for Draftr support shorthand macros to accelerate typing. These macros are editor shortcuts, not official Draftr syntax:

| Macro | Expands to | Description |
| :--- | :--- | :--- |
| `+ ` | `public ` | Sets member visibility to public. |
| `- ` | `private ` | Sets member visibility to private. |
| `# ` | `protected ` | Sets member visibility to protected. |

Your editor extension intercepts these macros as you type and automatically expands them into official Draftr keywords.
