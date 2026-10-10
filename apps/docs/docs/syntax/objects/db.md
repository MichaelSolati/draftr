---
id: db
title: Database Table
sidebar_position: 2
---

# Database Table (`db`)

Use `db` to define relational tables and persistence layers.

## Syntax

```draftr
db Users
  pk id: uuid
  unique email: string
  created_at: timestamp

db Orders
  pk id: uuid
  fk user_id: Users.id
  total_price: number
```

## Supported Level 2 modifiers
- **Constraints:** `pk`, `fk`, `unique`, `nullable`, `index`, `default`
- **Visibility:** Not supported.
- **Foreign Keys:** Use direct references for types: `fk column_name: TargetTable.columnName`

## Supported Level 3 verbs
- Database tables are passive entities. They do not invoke verbs. They are targeted by `query` and `mutate`.
