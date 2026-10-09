---
id: polymorphism
title: Polymorphism & Contracts
sidebar_position: 4
---

# Polymorphism & Contracts

Draftr supports object-oriented inheritance and interface contracts with compile-time architectural linting.

---

## Keywords & Syntax

* `abstract class <Name>`: Declares an uninstantiable base class.
* `interface <Name>`: Declares a contract of method and property signatures.
* `extends <SuperClass>`: Establishes an `inherits` relationship edge.
* `implements <Interface1>, <Interface2>`: Establishes `implements` relationship edges.

```draftr
interface Repository
  + findById(id: string): object
  + save(item: object): void

abstract class BaseService
  + log(msg: string): void

class SqlService extends BaseService implements Repository
  + findById(id: string): object
  + save(item: object): void
```

---

## Linter Validation

The Draftr linter automatically checks:
1. **`circular-inheritance`**: Prevents circular dependency cycles (e.g. `A extends B` and `B extends A`).
2. **`missing-interface`**: Warns if an `implements` clause names an undeclared interface.
3. **`unimplemented-method`**: Flags classes that claim to implement an interface but omit required methods.
4. **`signature-mismatch`**: Flags methods whose return types conflict with the interface definition.
