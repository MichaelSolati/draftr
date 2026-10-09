---
id: modifiers
title: Modifiers & Typing Shortcuts
sidebar_position: 3
---

# Modifiers & Typing Shortcuts

Draftr provides both natural English keywords and high-speed single-character typing shortcuts for declaring members.

---

## Member Modifiers

| Keyword | Single-Character Shortcut | Semantic Scope | Example |
| :--- | :--- | :--- | :--- |
| `public` | `+` | Accessible anywhere | `+ id: string` or `public id: string` |
| `private` | `-` | Restricted to containing entity | `- secret: string` or `private secret: string` |
| `protected`| `#` | Accessible to self and subclasses | `# logger: Logger` or `protected logger: Logger` |
| `readonly` | — | Immutable property | `readonly createdAt: timestamp` |
| `override` | — | Overrides base class member | `override run(): void` |

---

## Fast Typing Shortcuts

In the Web Editor and VS Code Extension:

* Type `+ ` at line start $\rightarrow$ Expands to `public `
* Type `- ` at line start $\rightarrow$ Expands to `private `
* Type `# ` at line start $\rightarrow$ Expands to `protected `
* Type `-> ` at line start (under class) $\rightarrow$ Expands to `calls `
* Type `-> ` at line start (under ui) $\rightarrow$ Expands to `binds `
