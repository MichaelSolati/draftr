---
id: polymorphism
title: Polymorphism and contracts
sidebar_position: 6
---

# Polymorphism and contracts

Draftr supports object-oriented inheritance and interface contracts with compile-time architectural linting.

## Keywords and usage

* **`abstract class <name>`:** Declares an uninstantiable base service.
* **`interface <name>`:** Declares a structural contract containing required method and property signatures.
* **`extends <super_class>`:** Establishes class inheritance between a child class and a base class.
* **`implements <interface_1>, <interface_2>`:** Establishes contract fulfillment between a class and one or more interfaces.

```draftr
interface Repository
  public findById(id: string): object
  public save(item: object): void

abstract class BaseService
  public log(msg: string): void

class SqlService extends BaseService implements Repository
  public findById(id: string): object
  public save(item: object): void
```

## Architectural linting

The Draftr linter validates inheritance hierarchies and contracts automatically:

1. **Circular inheritance (`circular-inheritance`):** Detects and prevents circular inheritance loops (for example, where `A extends B` and `B extends A`).
2. **Missing interface (`missing-interface`):** Flags an error if an `implements` clause references an undeclared interface.
3. **Unimplemented methods (`unimplemented-method`):** Flags an error if an implementing class omits any method required by an interface.
4. **Signature mismatch (`signature-mismatch`):** Warns if an implemented method declares a return type that conflicts with the interface definition.
