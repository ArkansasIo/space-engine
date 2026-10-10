# Contributing to AstroSim

Thanks for your interest in AstroSim. This guide covers local setup, the
conventions we follow, and how to get a change merged.

---

## 1. Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | ≥ 18 |
| npm | any version bundled with Node 18+ (workspaces required) |
| MySQL | 8.x |

---

## 2. Getting started

```bash
git clone <your-fork-url> astrosim
cd astrosim
npm install                 # installs server + client workspaces

copy .env.example .env      # Windows PowerShell
# cp .env.example .env      # macOS / Linux
#   edit DB_USER / DB_PASSWORD / JWT_SECRET

npm run db:migrate          # create schema
npm run db:seed             # load built-in presets
npm run dev                 # API :4000  +  client :5173
```

Verify your baseline before changing anything:

```bash
npm run typecheck
npm test
npm run lint
```

---

## 3. Repository conventions

### Layout rules

- `client/src/lib/**` and `client/src/sim/**` are **pure** — no DOM, no network,
  no globals. They must be unit-testable in isolation.
- `client/src/render/**` and `client/src/ui/**` may touch the DOM/canvas.
- The server is strictly layered: `routes → controllers → services → models`.
  Dependencies point **downward only**; a model must never import a controller.
- SQL lives only in `models/**`. No other layer writes queries.
- Shared shapes are declared in `client/src/types` and `server/src/types`; keep
  them in sync when the contract changes.

### Import aliases

| Alias | Resolves to | Used in |
| --- | --- | --- |
| `@/*` | `client/src/*` | client |
| `@lib`, `@sim`, `@render`, `@ui`, `@api` | client subfolders | client |
| `@/*`, `@config`, `@controllers`, `@services`, `@models`, `@routes`, `@middleware`, `@database`, `@utils` | server folders | server |

Use aliases rather than long relative paths.

---

## 4. Code style

- **TypeScript strict mode**, always. The shared options live in
  `tsconfig.base.json` (`strict`, `noImplicitAny`, `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).
- No `any` unless you document why. Prefer `unknown` plus a narrowing helper
  (`utils/sanitize.ts → isPlainObject` is the pattern in use).
- No unused imports or variables — the compiler rejects them.
- Prefer `const`; avoid mutation except where the engine deliberately mutates
  bodies for performance.
- Every module opens with a short `/** … */` block explaining its role — follow
  the existing files.
- Small, focused functions. The numeric `lib/` modules favour pure functions and
  an immutable `V` (vector) API with explicit in-place variants suffixed `i`
  (`addi`, `muli`, `madd`).
- Explicit return types on exported functions.

### Naming

| Kind | Convention | Example |
| --- | --- | --- |
| Files | `camelCase.ts` (models/services), `PascalCase.ts` for classes | `simulationService.ts`, `Engine.ts`-style exports |
| Types / interfaces | `PascalCase` | `GravitySettings`, `SceneSettings` |
| Functions | `camelCase` | `computeAccelerations`, `totalEnergy` |
| Constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_DT`, `MAX_SUBSTEPS` |
| DB columns | `snake_case` | `password_hash`, `sim_id` |
| API/domain fields | `camelCase` | `passwordHash`, `simulationId` |

Mapping between the last two happens **only** in `models/**`.

### Comments

Explain *why*, not *what*. Preserve the existing header comments. Do not add
boilerplate or emoji.

---

## 5. Validation & errors (server)

- Add/extend a **zod schema** in the controller for every request body/query, and
  wire it through `validate({ body, query, params })` in the route.
- Throw `AppError` factories from `utils/errors` (`badRequest`, `notFound`,
  `forbidden`, `conflict`, …) — never `res.status().json()` for errors.
- Respond with `ok` / `created` / `noContent` from `utils/response` so envelopes
  stay uniform.
- Any new mutation that matters should emit an audit event via
  `eventService.record(ctx, { … })` and add its type to `EVENT_TYPES`.

## 6. Validation & physics (client)

- New scene-affecting fields must be added to **all** of: the client `BodySpec`
  type, the server `BodySpec` type, `sceneValidator.validateBody` (with clamps),
  `BodyOptions`/`Body.fromSpec`, `Body.toSpec`, and the `bodies` table columns.
- New physics helpers go in the appropriate `sim/` module as pure functions with
  a documented formula. Add them to `docs/SIMULATION.md`.
- Keep the integrator contract intact: `Derivative = (t, y) => Vec`, and ensure
  `Engine.step`'s save/restore of body state is preserved.

---

## 7. Tests

Tests use the built-in **`node:test`** runner and `node:assert/strict`, and live
in `server/src/tests/`. The `npm test` script compiles the server to `dist/` and
runs `node --test dist/**/*.test.js`, so new test files are picked up
automatically.

```bash
npm test
```

Guidelines:

- Prefer testing **pure** logic: row mappers, the scene validator, the SQL
  splitter, and numeric helpers.
- One behaviour per `test(...)`; name it as a sentence
  (`'validateBody clamps out-of-range values'`).
- Use small factory helpers (`row()`, `scene()`) for fixtures.
- No network or database access in unit tests.

---

## 8. Adding a feature end-to-end

A good mental checklist for anything user-visible:

1. **Types** — client + server (`BodySpec`, DTO, or `SceneSettings`).
2. **Persistence** — schema change in `database/schema.sql`, a model change, and
   a documented migration note.
3. **Service** — business rules, limits, ownership, audit event.
4. **Controller + route** — zod schema, guard (`optionalAuth`/`requireAuth`),
   envelope.
5. **API client** — a typed wrapper in `client/src/api/`.
6. **UI / engine** — wire it into `Engine`, the renderer, or the menu.
7. **Docs** — update the relevant file in `docs/` and the UML if the structure
   changed.
8. **Verify** — `npm run typecheck && npm test && npm run lint`.

---

## 9. Commit & PR workflow

1. Branch from the default branch: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
2. Keep commits focused and use the imperative mood in the subject line:
   `add rk45 adaptive sub-stepping to engine`.
3. Ensure the quality gates pass locally before opening a PR:

   ```bash
   npm run typecheck
   npm test
   npm run lint
   ```

4. In the PR description include: **what** changed, **why**, how it was
   **tested**, and any **screenshots** for UI changes.
5. Do not commit `.env`, build output, or editor files (see `.gitignore`).

### Commit message example

```
feat(sim): resolve collisions in a single pass per step

- detect pairs after each RK4 step
- merge conserves momentum and mass
- promote extreme neutron mergers to black holes
```

---

## 10. Reporting issues

Include: what you expected, what happened, exact steps to reproduce, your
OS/Node/MySQL versions, and any console or server-log output. For physics
anomalies, note the scene (preset or the bodies' parameters), `gravity` settings,
`dt`, and the observed energy drift.

---

## 11. House rules

- Match the surrounding code's style, comment density and naming.
- Do not reformat or "clean up" unrelated code in a feature PR.
- Do not add dependencies without a clear reason; both workspaces keep their
  dependency lists deliberately small.
- Never weaken validation or skip an ownership check for convenience.
