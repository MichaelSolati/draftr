---
id: function
title: Function
sidebar_position: 7
---

# Standalone Function (`function`)

Use `function` to define a standalone utility procedure.

## Syntax

```draftr
function calculateTax(amount: number, rate: number): number
```

## Supported Level 2 modifiers
- Standalone functions can use `param` or `return` documentation notes.
- **Visibility:** `public` (default), `private`, `protected`.

## Supported Level 3 verbs
- Functions can invoke `call` and `emit`.
