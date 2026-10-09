# Draftr Repository Agent Guidelines

## 1. Core Library & Documentation Synchronization
Any autonomous agent modifying or extending the Draftr specification language in `packages/core` (**@draftr/core**) MUST synchronize the documentation located in `apps/docs/docs/` in the same change or task:

- **Entity Declarations & Keywords**: If adding, removing, or changing block keywords (`class`, `abstract class`, `interface`, `ui`, `db`, `api`, `event`, `state`), update [`apps/docs/docs/syntax/blocks.md`](file:///home/michaelsolati/workspace/arch-spec-builder/apps/docs/docs/syntax/blocks.md).
- **Invocations & Connectors**: If changing arrow syntax (`->`), calls, binds, or emit behaviors, update [`apps/docs/docs/syntax/relationships.md`](file:///home/michaelsolati/workspace/arch-spec-builder/apps/docs/docs/syntax/relationships.md).
- **Visibility & Modifiers**: If modifying visibility (`public`, `private`, `protected`, `readonly`, `+`, `-`, `#`) or DB keys (`pk`, `fk`, `unique`), update [`apps/docs/docs/syntax/modifiers.md`](file:///home/michaelsolati/workspace/arch-spec-builder/apps/docs/docs/syntax/modifiers.md).
- **Polymorphism & Contracts**: If modifying `extends`, `implements`, or contract checking, update [`apps/docs/docs/syntax/polymorphism.md`](file:///home/michaelsolati/workspace/arch-spec-builder/apps/docs/docs/syntax/polymorphism.md).
- **Grammar & Linter Rules**: If updating parser AST structure or adding linter diagnostic codes, update [`apps/docs/docs/reference/grammar.md`](file:///home/michaelsolati/workspace/arch-spec-builder/apps/docs/docs/reference/grammar.md) and [`apps/docs/docs/reference/linter-rules.md`](file:///home/michaelsolati/workspace/arch-spec-builder/apps/docs/docs/reference/linter-rules.md).

Never leave `@draftr/core` code changes undocumented when shipping features or syntax updates.

---

## 2. Monorepo Quality Gates & Verification
Before committing or marking tasks complete, all agents must verify that the monorepo quality gates pass:

1. **Type Checking**: `npm run lint:typescript` must pass across all packages (`@draftr/core`, `@draftr/web`, `draftr-vscode`, `@draftr/docs`).
2. **Linting & Code Style**: `npm run lint:gts` and `npm run lint` must report 0 errors and 0 warnings.
3. **Duplicate Code Scan**: `npm run dupes` (`jscpd`) must report 0 duplicate clones above threshold.
4. **Test Suite & Coverage**: `npm test` and `npm run coverage` must pass with line coverage $\ge 80\%$.
5. **Production Builds**: `npm run build` must succeed without compilation errors.
6. **Commit Format**: All commit messages must strictly follow the Conventional Commits specification (`feat: ...`, `fix: ...`, `chore: ...`).

---

## 3. Knowledge Graph (`graphify`)
This project maintains a codebase knowledge graph at `graphify-out/` with node clusters, community structure, and cross-file relationships:

- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists.
- Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
