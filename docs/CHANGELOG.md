# Changelog

All notable changes to AstroSim are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Full documentation set: `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`,
  `docs/SIMULATION.md`, `docs/DATABASE.md`, `docs/CONTRIBUTING.md`,
  `docs/CHANGELOG.md`, `docs/README.md`.
- UML diagrams under `docs/uml/` (class, sequence, activity, state, component,
  ER, use case) in both Mermaid and PlantUML.

---

## [1.0.0] — 2026-01-01

First public release: a browser simulation engine, REST API and MySQL
persistence.

### Added

**Simulation engine (`client/src/sim/`)**

- `Engine` with fixed-step RK4 integration, adaptive sub-stepping
  (`advance()`), and configurable `dt`, `timeScale`, `gravity` and
  `collisionMode`.
- Scene round-tripping: `loadScene`, `toScene`, `snapshot`, `addBody`,
  `removeBody`, `findBody`, `clear`, `rebaseEnergy`.
- Newtonian pairwise gravity with Plummer softening and an optional
  relativistic `1/c²` correction (`gravity.ts`, `relativity.ts`).
- Collision handling: `merge` (inelastic, momentum- and mass-conserving),
  `bounce` (restitution `0.35`) and `none` (`collision.ts`).
- Body model with trails, temperature, luminosity, spin and fixed anchors
  (`body.ts`).
- Energy, momentum, centre-of-mass, circular/escape speed and orbit helpers.
- Black-hole geometry (`schwarzschildRadius`, `photonSphereRadius`,
  `iscoRadius`, `shadowRadius`, `ergosphereRadius`, Hawking temperature and
  evaporation time).
- Stellar relations (mass–luminosity, radius, spectral class, colour, lifetime)
  and light-bending helpers (deflection angle, Einstein radius, critical impact
  parameter, Shapiro delay).
- Six built-in presets mirroring the seed data.

**Numeric foundation (`client/src/lib/`)**

- `mathx`: generic vectors (`V`), statistics (`S`), `EMA`, root finders (`R`),
  interpolation (`I`), scientific-notation formatting.
- `rkmethods`: Euler, midpoint, Heun, RK4, RK45, `integrate`, `STEPPERS`.
- `calculus`: forward/backward/central/five-point/Richardson derivatives,
  gradients, Jacobians, divergence, curl, quadrature (trapezoid, Simpson,
  Simpson 3/8, adaptive Simpson, Gauss–Legendre, Romberg), arc length, Taylor
  series, limits, ODE helpers, gravitational potential and field.
- `linalg`: LU, determinant, solve, inverse, rank, Cholesky, QR, power and
  inverse iteration, 2×2/3×3 fast paths, rotation matrices.

**Client presentation & integration**

- 2-D canvas renderer with camera transforms, DPR-aware sizing, trails, grid,
  velocity vectors and glow, plus a distinct black-hole rendering.
- Menubar (File / Presets / Simulate / View / Account) and toast notifications.
- Typed API clients (`client`, `authApi`, `simulationApi`, `presetApi`,
  `experimentApi`, `healthApi`) with token handling and envelope unwrapping.
- Vite build with `@`-aliases and `math`/`sim` chunk splitting; dev proxy for
  `/api`.

**Server (`server/`)**

- Express 4 application with Helmet, CORS allow-list, compression, body
  parsing, cookie parsing, request IDs and Morgan logging.
- JWT authentication: `POST /auth/register`, `/auth/login`, `/auth/logout`,
  `GET /auth/me`, with bcrypt password hashing and optional/required/role guards.
- Simulation CRUD with pagination, search, public/archived filtering, play
  counting and ownership/visibility rules.
- Preset catalogue endpoints, experiment records, and cross-simulation body
  aggregate endpoints.
- Zod validation at the HTTP edge and a scene normaliser that clamps every field
  and enforces `MAX_BODIES_PER_SIMULATION`.
- Uniform success envelopes and a central error handler with stable error codes.
- Rate limiting (global `/api` limiter plus a stricter auth limiter) and
  fire-and-forget audit events in `api_events`.
- MySQL pool, migration/seed/reset tooling and a comment-aware SQL script runner.

**Persistence (`database/`)**

- MySQL 8 schema: `users`, `simulations`, `bodies`, `presets`, `experiments`,
  `api_events`, `schema_migrations`, and the `v_simulation_summary` view.
- Seed data for the built-in preset catalogue.

**Tooling**

- npm workspaces monorepo, shared strict `tsconfig.base.json`, ESLint config,
  `node:test` unit tests, and `.env.example`.

---

[Unreleased]: https://example.com/astrosim/compare/v1.0.0...HEAD
[1.0.0]: https://example.com/astrosim/releases/tag/v1.0.0
