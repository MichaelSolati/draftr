---
id: ui
title: UI Component
sidebar_position: 4
---

# UI Component (`ui`)

Use `ui` to declare presentation layer views and component hierarchies.

## Syntax

```draftr
ui CheckoutPage
  prop orderId: string
  emit navigateToSuccess: void
  render ui.NavigationSidebar
  render ui.PaymentCardForm
```

## Supported Level 2 modifiers
- **Modifiers:** `prop` (incoming component properties), `emit` (component event outputs).

## Supported Level 3 verbs
- UI components can compose other components via the `render` verb.
- UI components can `dispatch` state store mutations.
- UI components can `emit` events.
