---
id: overview
title: Syntax flow overview
sidebar_position: 1
---

# Syntax flow overview

Draftr uses a strict, indentation-based 3-level hierarchy to map architectural components, their structural definitions, and their interactions.

## The 3-level hierarchy

1. **Level 1 (0 spaces): Object declarations**
   Declare the root architectural component (such as a class, database table, or UI component).
   *Syntax:* `[object_type] [name]`
   *Example:* `class OrderService`

2. **Level 2 (2 spaces): Member definitions**
   Define the properties, methods, columns, or routes belonging to the object.
   *Syntax:* `[visibility] [modifier] [name]: [type]`
   *Example:* `public checkout(cartId: string): boolean`

3. **Level 3 (4 spaces): Invocations and relations**
   Define interactions, such as calling other services, querying databases, emitting events, or composing UI.
   *Syntax:* `[verb] [Target].[member]([payload])`
   *Example:* `call PaymentGateway.charge(cartId)`

## Putting it together

When combined, these three levels form a complete architectural flow:

```draftr
class OrderService
  public checkout(cartId: string): boolean
    query Carts.findById(cartId)
    call PaymentGateway.charge(cartId)
    mutate Orders.insert(cartId)
    emit OrderPlaced(cartId)
```

## Next steps

Explore the dedicated pages for each object type to learn their specific modifiers, allowed verbs, and best practices.
