---
id: class
title: Class, Abstract, Interface
sidebar_position: 1
---

# Class, Abstract Class, and Interface

These objects represent your domain logic, contracts, and core services. 

## Syntax

```draftr
interface PaymentGateway
  public charge(amount: number): boolean

abstract class BaseService
  protected logger: Logger
  public init()

class OrderService extends BaseService implements PaymentGateway
  public charge(amount: number): boolean
    call Logger.log(amount)
```

## Supported Level 2 modifiers
- **Visibility:** `public` (default), `private`, `protected`, `readonly`
- **Modifiers:** `get`, `set`, `static`, `async`

## Supported Level 3 verbs
- Classes can invoke the following verbs: `call`, `query`, `mutate`, `emit`, `dispatch`.
