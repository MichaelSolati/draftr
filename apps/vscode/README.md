# draftr VS Code Extension

Visual and textual architecture specification modeling inside VS Code.

## Features

- **Syntax Highlighting**: Highlighting for `.draftr` architecture specification files.
- **Live Diagnostics & Linter**: Real-time validation of architectural hierarchy, layer boundaries, circular dependencies, and entity contracts.
- **Snippets & Shortcuts**: Automatic indentation and expansion for classes, tables, APIs, and relationships.

## Usage

Create or open any file with `.draftr` extension:

```draftr
class AuthService
  + login(creds: Credentials): Session -> Database.query

db Users
  + id: uuid pk
  + email: string unique
```
