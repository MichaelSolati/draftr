# Walkthrough: draftr — Visual & Textual Architecture Spec Builder

We have built, verified, and committed **Phase 1 (Core Dual-Engine Architecture)** and **Phase 2 (Expanded Multi-Domain Modeling)** in `draftr`, adhering strictly to the PRD specifications, the ERD data model, and the **Repo Standards Stack**.

---

## 🛠️ Phase 2 Implementations: Multi-Domain Architecture

### 1. Database & Relational Schema Modeling (`db <Table>`)
- **Syntax**:
  ```
  db Users
    + id: uuid pk
    + email: string unique
    + teamId: uuid fk -> Teams.id
    + createdAt: timestamp
  ```
- **Custom Node (`TableNode.tsx`)**: Schema table card with `PK`, `FK`, and `UQ` badges, column types, and input/output connector handles.
- **Foreign Key Wiring**: Foreign key relationships (`fk -> Teams.id`) automatically render green relational edges on the canvas and export to valid Mermaid `erDiagram` syntax (`Teams ||--o{ Users : "references"`).

### 2. API Route & Contract Modeling (`api <Route>`)
- **Syntax**:
  ```
  api /api/v1/auth
    + POST /login(LoginDTO): Session -> AuthService.login
    + GET /me(): UserProfile -> UserService.getProfile
  ```
- **Custom Node (`ApiNode.tsx`)**: Displays HTTP method badges (`GET` green, `POST` blue, `PUT` amber, `DELETE` red) wired directly to backend service methods.

### 3. Event-Driven & State Modeling (`event <Name>` & `state <Slice>`)
- **Syntax**:
  ```
  event UserRegistered(UserEvent) -> UserService.sendWelcome
  state CartState
    + items: CartItem[]
    + total: number
  ```
- **Custom Nodes**:
  - `EventNode.tsx`: Violet lightning pub/sub message card with animated dashed emission wires.
  - `StateNode.tsx`: Cyan state slice card displaying client-side state fields.

### 4. Interactive Domain Filter Bar
- Floating filter chips on canvas:
  - **All**: Displays full system topology.
  - **Logic**: Filters to classes, interfaces, and types.
  - **UI**: Filters to DOM component hierarchies.
  - **Database**: Filters strictly to database tables and foreign keys.
  - **API**: Filters strictly to REST API routes and endpoints.
  - **Events**: Filters to event streaming and state slices.

### 5. Multi-Domain Mermaid Exporters
- **Class Diagram**: `classDiagram` with classes, methods, visibility, and invocation links.
- **ER Diagram**: `erDiagram` with tables, columns, `PK`, `FK`, and relational multiplicity.
- **Flowchart**: `flowchart TD` grouped into subgraphs (`UI_Hierarchy`, `API_Routes`, `Services`, `Database`, `Events`).

---

## 🚀 Phase 3: Editor UX & Palette
- **Command Palette (`CommandPalette.tsx`)**: Global `Cmd+K` / `Ctrl+K` command search for adding templates (Service, UI hierarchy, Database schema, REST Route, Event Pub/Sub, State Slice), jumping between views, and running exporters.
- **Snippet Bar**: Quick one-click insertion toolbar above the code editor.
- **Bidirectional Cross-View Highlighting**: Clicking any node or entity on the visual canvas instantly highlights and scrolls to its corresponding line numbers in the outline editor.

---

## 📥 Phase 4: Reverse-Engineering Codebase Importers
- **TypeScript Extractor (`src/lib/importers/typescript.ts`)**: Scans TypeScript code, classes, methods, and React component hierarchies to reconstruct spec outlines.
- **SQL DDL & Prisma Parser (`src/lib/importers/sql.ts`)**: Converts `CREATE TABLE` statements (with `PRIMARY KEY`, `FOREIGN KEY ... REFERENCES`, `UNIQUE`) or Prisma schemas into `db <Table>` specifications.
- **Import Modal (`ImportModal.tsx`)**: Interactive modal supporting pasting code/DDL with Append or Replace modes.

---

## 🔍 Phase 5 & 6: Architectural Rule Linter & Codebase Scaffolder
- **Architecture Rule Linter (`src/lib/linter/rules.ts`)**:
  - Unresolved Call Targets: Detects service calls targeting nonexistent entities.
  - Foreign Key Integrity: Validates foreign key references point to declared database tables.
  - Cycle Detector: Uses DFS cycle detection to detect circular dependency chains.
  - Layer Boundary Violations: Warns if UI components bind directly to database models without service abstraction.
  - Dead / Unreferenced Services: Detects unused services.
- **Codebase Scaffolder (`src/lib/generator/scaffolder.ts` & `ScaffoldModal.tsx`)**:
  - Generates TypeScript service classes with method stubs and dependency injections.
  - Generates React UI component files with typed props and child/service wiring.
  - Generates Prisma schema (`prisma/schema.prisma`) with primary keys, unique constraints, and scalar types.
  - Generates Express REST API router (`src/routes/api.ts`) with typed endpoints.
  - Includes interactive file tree and code preview modal with one-click download/copy.

---

## 🧪 Validation & Test Results

| Command | Status | Output / Results |
|---------|--------|------------------|
| `npm run lint` | Passed | `tsc --noEmit` and `gts lint` completed with 0 errors |
| `npm run dupes` | Passed | 0 duplicate clones found across 40 source files (0.00% duplication) |
| `npm run test` | Passed | 16 / 16 unit tests passed |
| `npm run coverage` | Passed | 92.68% statement coverage across all testable libraries |
| `npm run build` | Passed | Production bundle built cleanly |
| `git commit` | Passed | Pre-commit gate sequentially verified all 4 stages |

