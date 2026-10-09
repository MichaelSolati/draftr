---
id: linter-rules
title: Linter Diagnostics & Rules
sidebar_position: 2
---

# Linter Diagnostics & Rules

The Draftr architectural linter analyzes the structural graph and warns about architectural boundary leaks and missing targets.

---

## Rules Index

| Rule Code | Severity | Description | Fix |
| :--- | :--- | :--- | :--- |
| `ui-db-leak` | **Error** | A UI component directly accesses or binds a database table. | Route data access through a service class or state slice. |
| `circular-inheritance` | **Error** | Inheritance loop detected in `extends` hierarchy. | Break circular dependency chain. |
| `missing-interface` | **Error** | A class specifies an `implements` interface that does not exist. | Declare the missing interface or correct typo. |
| `unimplemented-method` | **Error** | Class claims to implement an interface but is missing one or more methods. | Add required method signatures. |
| `signature-mismatch` | **Warning** | Implemented method has a different return type than the interface. | Harmonize return type with contract. |
| `missing-call-target` | **Warning** | Method invocation points to a non-existent entity or method. | Declare target entity or correct name. |
| `missing-foreign-key-target` | **Warning** | Foreign key references a non-existent table or column. | Declare target table or column. |
| `orphan-entity` | **Info** | Entity is isolated with zero incoming or outgoing connections. | Wire entity into the application graph. |
