# Documentation index

Start here. Everything you need to understand, run, extend or deploy AstroSim.

---

## Reading paths

**I just want to run it** →
[README → Quick start](../README.md#quick-start) →
[Environment variables](../README.md#environment-variables).

**I want to understand the code** →
[Architecture](ARCHITECTURE.md) →
[UML diagrams](uml/) →
[Simulation & physics](SIMULATION.md).

**I want to call the API** →
[API reference](API.md).

**I want to work on the database** →
[Database](DATABASE.md).

**I want to contribute** →
[Contributing](CONTRIBUTING.md).

---

## Documents

| Document | What it covers |
| --- | --- |
| [../README.md](../README.md) | Project overview, features, quick start, scripts, API summary |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Workspace topology, client/server layers, request lifecycle, config, security, deployment, trade-offs |
| [API.md](API.md) | Every endpoint, payloads, auth, pagination, error codes, rate limits, SDK |
| [SIMULATION.md](SIMULATION.md) | State vector, integrators (RK4/RK45/…), gravity, collisions, black holes, stars, relativity, constants, presets |
| [DATABASE.md](DATABASE.md) | ER model, tables, constraints, migrations, pool, common queries, lifecycle |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, conventions, code style, tests, workflow, feature checklist |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [../LICENSE](../LICENSE) | MIT licence |

## UML & diagrams (`uml/`)

| File | Diagram | Notation |
| --- | --- | --- |
| [class-diagram.md](uml/class-diagram.md) | Class / type model (engine, server layers, types) | Mermaid `classDiagram` |
| [class-diagram.puml](uml/class-diagram.puml) | Same, PlantUML source | PlantUML |
| [sequence-diagram.md](uml/sequence-diagram.md) | Request lifecycle, simulation step, login, scene save | Mermaid `sequenceDiagram` |
| [activity-diagram.md](uml/activity-diagram.md) | Simulation step, scene save, validation flow | Mermaid `flowchart` |
| [state-diagram.md](uml/state-diagram.md) | Engine lifecycle, body lifecycle, scene states | Mermaid `stateDiagram-v2` |
| [component-diagram.md](uml/component-diagram.md) | Component & deployment view | Mermaid `flowchart` |
| [er-diagram.md](uml/er-diagram.md) | Database entity-relationship model | Mermaid `erDiagram` |
| [use-case-diagram.md](uml/use-case-diagram.md) | Actor use cases | Mermaid `flowchart` |

> Mermaid renders directly on GitHub/GitLab and in most Markdown previewers.
> The `.puml` file is for PlantUML tooling (`plantuml class-diagram.puml`).

---

## Source map

| Path | Purpose |
| --- | --- |
| `client/src/sim/` | Physics core: `engine`, `body`, `gravity`, `collision`, `relativity`, `blackhole`, `star`, `photonsphere`, `presets`, `constants` |
| `client/src/lib/` | Numerics: `mathx`, `rkmethods`, `calculus`, `linalg` |
| `client/src/render/` | Canvas renderer and camera |
| `client/src/ui/` | Menubar, toasts |
| `client/src/api/` | Typed fetch clients |
| `server/src/routes/` | URL → controller wiring |
| `server/src/controllers/` | HTTP layer + zod schemas |
| `server/src/services/` | Business rules, validation, audit |
| `server/src/models/` | SQL and row mapping |
| `server/src/middleware/` | auth, validation, rate limiting, ids, errors |
| `server/src/database/` | pool, migrate, seed, reset, sql runner |
| `database/` | `schema.sql`, `seed.sql` |
