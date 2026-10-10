---
id: modifiers
title: Editor tooling macros
sidebar_position: 5
---

# Editor tooling macros

To accelerate writing Draftr specifications, official editor extensions support shorthand macros.

These macros are developer shortcuts, not official Draftr grammar. The strict Draftr parser expects normalized keywords (`public`, `private`, `protected`). Your editor extension automatically expands these macros into the official keywords as you type.

## Supported macros

| Macro | Expands to | Description |
| :--- | :--- | :--- |
| `+ ` | `public ` | Sets member visibility to public. |
| `- ` | `private ` | Sets member visibility to private. |
| `# ` | `protected ` | Sets member visibility to protected. |

## Tooling expansion behavior

When you type a shorthand symbol followed by a space at the start of a member line, the editor tooling replaces the symbol with the official visibility keyword.

### What you type:

```draftr
class OrderService
  + processCheckout(orderData: object): boolean
  - validateCart(): void
```

### What the extension saves (official syntax):

```draftr
class OrderService
  public processCheckout(orderData: object): boolean
  private validateCart(): void
```
