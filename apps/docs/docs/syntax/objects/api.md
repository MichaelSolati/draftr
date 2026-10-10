---
id: api
title: API Route
sidebar_position: 3
---

# API Route (`api`)

Use `api` to declare REST gateways and routing endpoints.

## Syntax

```draftr
api /api/v1/orders
  POST /create(CreateOrderDto): OrderResponse
    call OrderService.checkout(orderData)
  GET /:id(): OrderDetails
    call OrderService.getOrder(id)
```

## Supported Level 2 modifiers
- HTTP Verbs act as the modifiers: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.

## Supported Level 3 verbs
- API handlers can invoke the `call` verb to trigger backend service logic.
