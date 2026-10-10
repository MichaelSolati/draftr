---
id: type
title: Type
sidebar_position: 8
---

# Type / Struct (`type`)

Use `type` to define a data transfer object (DTO) or typed struct.

## Syntax

```draftr
type OrderPayload
  orderId: string
  customerEmail: string
  items: OrderItem[]
  totalAmount: number
```

## Supported Level 2 modifiers
- Types define strict data structures and do not support visibility or access modifiers.

## Supported Level 3 verbs
- Types are pure data and cannot invoke verbs.
