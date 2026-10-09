# @draftr/docs Agent Guidelines

This package provides the official documentation site for Draftr, built with Docusaurus 3.10.

- **Structure**:
  - `docs/syntax/`: Language syntax and specification pages.
  - `docs/tooling/`: Editor and agent integrations (Web App, VS Code, Agent Skills).
  - `docs/reference/`: Formal grammar specifications and linter rule catalogs.
- **Rules**:
  - Always keep syntax documentation updated whenever changes or additions occur in `@draftr/core`.
  - Ensure documentation builds without errors using `npm run build --workspace=@draftr/docs`.
  - Maintain clean frontmatter and sidebar positions.
