---
id: relationships
title: Relationships and edge topology
sidebar_position: 7
---

# Relationships and edge topology

Draftr parses parent-child indentation and Level 3 invocations into directional relationship edges. These edges generate architecture graphs and enforce structural boundaries.

## Edge types

Draftr extracts seven primary relationship edge types:

| Edge type | Origin object | Target object | Syntax | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `call` | `class`, `api`, `function` | `class`, `api`, `function` | `call Target.method(payload)` | Direct procedural or service invocation |
| `emit` | `class`, `ui`, `event` | `event`, `class` | `emit EventName(payload)` | Asynchronous event publishing |
| `dispatch` | `class`, `ui` | `state` | `dispatch Store.action(payload)` | State store mutation or action |
| `query` / `mutate` | `class` | `db` | `query Table.find(args)` | Relational database read or write |
| `render` | `ui` | `ui` | `render ui.ChildComponent` | User interface component composition |
| `inherits` | `class` | `class`, `abstract class` | `extends TargetClass` | Object-oriented class inheritance |
| `implements` | `class` | `interface` | `implements TargetInterface` | Contract fulfillment |

## Structural boundaries

The Draftr linter validates relationships to prevent architectural drift:

* **UI to database boundary:** UI components must not query or mutate database tables directly. UI views must invoke actions through a service class or state slice.
* **Component composition:** When composing UI views using `render`, omit the argument payload. Prop data passing is resolved at implementation time.
