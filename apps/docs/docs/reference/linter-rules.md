---
id: linter-rules
title: Linter diagnostics and rules
sidebar_position: 2
---

# Linter diagnostics and rules

The Draftr architectural linter analyzes the structural graph and warns you about boundary leaks, invalid verb targets, and missing contracts.

## Rules index

| Rule code | Severity | Description | Fix |
| :--- | :--- | :--- | :--- |
| `ui-db-leak` | **Error** | A UI component directly accesses, queries, or mutates a database table. | Route data access through a service class or state slice. |
| `circular-inheritance` | **Error** | An inheritance loop exists in an `extends` hierarchy. | Break the circular inheritance loop. |
| `missing-interface` | **Error** | A class specifies an `implements` interface that does not exist in the project. | Declare the missing interface or correct the name. |
| `unimplemented-method` | **Error** | A class claims to implement an interface but omits one or more required methods. | Add the missing method signature to the class. |
| `signature-mismatch` | **Warning** | An implemented method defines a return type that conflicts with the interface definition. | Harmonize the return type with the interface contract. |
| `missing-call-target` | **Warning** | An invocation points to an entity or method that does not exist. | Declare the target entity or correct the target name. |
| `missing-foreign-key-target` | **Warning** | A foreign key references a non-existent table or column (`fk -> Table.col`). | Declare the target table or column. |
| `orphan-entity` | **Info** | An entity has zero incoming or outgoing relationship connections. | Connect the entity to the application graph or remove it if unused. |
