---
id: relationships
title: Relationships & Edge Topology
sidebar_position: 2
---

# Relationships & Edge Topology

Draftr extracts directional relationships between objects to generate interactive architecture diagrams and enforce structural constraints.

---

## The 7 Relationship Edge Types

| Edge Type | Origin Entity | Target Entity | Syntax | Description |
| :--- | :--- | :--- | :--- | :--- |
| `invokes` | `class`, `method` | `class`, `method`, `db` | `calls Target.method`, `-> Target.method` | Execution dependency or method call |
| `binds` | `ui` | `class`, `state` | `binds TargetEntity` | Frontend component wired to service or store |
| `references`| `db` column | `db` column | `fk -> OtherTable.col` | Relational foreign key constraint |
| `inherits` | `class` | `class`, `abstract class` | `extends TargetClass` | Object-oriented class inheritance |
| `implements`| `class` | `interface` | `implements TargetInterface` | Contract satisfaction |
| `emits` | `class`, `event` | `event`, `class` | `emits EventName`, `event E -> Handler.method`| Event publishing or dispatching |
| `routes_to` | `api` endpoint | `class` method | `+ GET /path: Type -> Service.method` | HTTP gateway route pointing to handler |

---

## 3-Tier Invocation Hierarchy

Calls and invocations follow a clean 3-level indentation model:

```draftr
// Level 1: Root class (0 spaces)
class OrderService
  // Level 2: Method signature (2 spaces)
  public checkout(cart: Cart): Order
    // Level 3: Invocations & calls (4 spaces)
    calls PaymentService.charge
    calls InventoryService.reserve
    emits OrderPlaced
```
