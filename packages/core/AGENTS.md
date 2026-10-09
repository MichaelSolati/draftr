# @draftr/core Agent Guidelines

> **ATTENTION AGENTS**:
> Any modifications, extensions, or bug fixes made to the Draftr specification language in this package directly impact language users and tooling.
>
> Whenever you modify:
> - Syntax keywords, parsing logic, or tokenization in `src/parser/`
> - Semantic/architectural rules in `src/linter/`
> - Export generation in `src/export/` or `src/generator/`
> - Importers in `src/importers/`
> - Type definitions in `src/types/`
>
> You **MUST** update the documentation files under `apps/docs/docs/` in the same task to ensure documentation remains 100% in sync with core library capabilities.
>
> See the root [AGENTS.md](../../AGENTS.md) for full monorepo guidelines, quality gates, and testing requirements.
