---
id: event
title: Event
sidebar_position: 5
---

# Event (`event`)

Use `event` to declare an asynchronous domain event or pub/sub messaging topic.

## Syntax

```draftr
event OrderPlaced(OrderPayload)
```

## Supported Level 2 modifiers
- Events do not support Level 2 members.

## Supported Level 3 verbs
- Events are targeted by the `emit` verb. They do not trigger verbs themselves.
