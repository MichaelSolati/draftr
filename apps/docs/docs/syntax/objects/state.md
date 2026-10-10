---
id: state
title: State Store
sidebar_position: 6
---

# State Store (`state`)

Use `state` to declare client-side reactive store slices.

## Syntax

```draftr
state CartStore
  items: CartItem[]
  total: number
  isSubmitting: boolean
  get itemCount(): number
  action addItem(item: CartItem)
```

## Supported Level 2 modifiers
- **Visibility:** `public` (default), `private`, `protected`, `readonly`
- **Modifiers:** `get` (computed properties), `action` (mutators). Omit modifiers for raw state properties.

## Supported Level 3 verbs
- Actions inside a state block can invoke the `call` verb to trigger backend logic.
- State stores are targeted by the `dispatch` verb from the UI.
