---
id: vscode
title: VS Code Extension
sidebar_position: 2
---

# Draftr VS Code Extension

The **Draftr VS Code Extension** (`draftr-vscode`) provides first-class language tooling, architectural validation, code scaffolding, and interactive diagram visualization for Draftr architecture specification files (`.draftr`, `.archspec`, `.arch`).

## Features

### 1. Interactive Architecture Preview
- **Live Diagram Sync**: Visualizes entities, services, databases, and UI components using a React Flow diagram synced in real time with the active editor.
- **Auto-Layout**: Organizes entities automatically via Dagre graph layout.
- **Diagram Controls**: Includes interactive zoom, pan, fit-to-view, and an interactive minimap.
- **Access**: Open via the editor title-bar button or the `Draftr: Open Architecture Diagram Preview` command.

### 2. Language Intelligence & Navigation
- **Syntax & Architectural Diagnostics**: Surface parsing errors and architectural violations (e.g. layer boundary bypasses, cycles, missing targets) directly in the problems panel and editor margins.
- **Quick Fixes (Lightbulb Actions)**: Apply automated fixes, such as inserting intermediate service bindings for direct UI-to-database leaks.
- **IntelliSense Completions**: Autocomplete keywords, classes, tables, UI components, and method invocation targets.
- **Document Symbols & Outline**: View the structured hierarchy of classes, methods, fields, tables, and UI cards in the VS Code Outline tree.
- **Go to Definition**: Jump directly (`F12` or `Cmd+Click`) from entity references to their declarations.
- **Contextual Hover**: Inspect entity details, extended classes, implemented interfaces, and schema columns.

### 3. Code Generation & Importers
- **TypeScript Project Scaffolding**: Generate starter TypeScript interfaces and class stubs from your architecture spec via `Draftr: Scaffold TypeScript Project`.
- **SQL / Prisma Import**: Convert existing SQL table definitions or Prisma schemas into Draftr DSL specifications via `Draftr: Import from SQL Schema`.
- **TypeScript Reverse Engineering**: Parse existing TypeScript source files and import their types and classes into Draftr DSL via `Draftr: Import from TypeScript Code`.

## Commands

| Command | Identifier | Description |
| :--- | :--- | :--- |
| `Draftr: Open Architecture Diagram Preview` | `draftr.openPreview` | Opens the live React Flow diagram preview side-by-side with your `.draftr` document. |
| `Draftr: Scaffold TypeScript Project` | `draftr.scaffold` | Generates TypeScript code files corresponding to the active architecture spec. |
| `Draftr: Import from SQL Schema` | `draftr.importSql` | Prompts for SQL DDL input and appends translated Draftr entities to the document. |
| `Draftr: Import from TypeScript Code` | `draftr.importTypeScript` | Prompts for TypeScript code input and appends translated Draftr entities to the document. |
