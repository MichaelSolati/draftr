---
id: operators
title: "Operators: Optional and union types"
sidebar_position: 4
---

# Operators: Optional and union types

Draftr supports two type operators directly inside Level 2 member declarations: the optional operator (`?`) and the union operator (`|`).

## Optional fields (`?`)

To declare that a property, parameter, or member is not strictly required, append a question mark `?` directly to the member name.

Do not use an `optional` modifier keyword. The `?` symbol attaches directly to the name token:

```draftr
interface UserProfile
  public id: string
  public nickname?: string
  public avatarUrl?: string

ui UserAvatar
  prop size?: "small" | "large"
```

### Usage across object types

The optional operator applies universally across Level 2 objects:

* **UI props:** `prop avatarUrl?: string`
* **Class properties:** `public nickname?: string`
* **Function parameters:** `param age?: number`

## Union types (`|`)

To declare that a member or return type accepts one of several allowed types, place a pipe symbol `|` between each type in the `[type]` position.

Union types eliminate the need to create standalone type aliases for simple multi-type fields:

```draftr
type StatusPayload
  id: string | uuid
  status: "active" | "pending" | "archived"

function parseInput(raw: string | number): boolean | null
```

## Combining optional and union operators

You can combine optional and union operators within the standard `[visibility] [modifier] [name]: [type]` template:

```draftr
interface UserContact
  public id: string | number
  public email: string
  public phoneNumber?: string | number
```
