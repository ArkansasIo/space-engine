# HTTP API reference

Base URL: `/api` (development: `http://127.0.0.1:4000/api`, proxied by Vite from
`http://localhost:5173/api`).

All endpoints exchange JSON. Content type for requests with a body must be
`application/json`.

---

## Conventions

### Success envelopes

Single resources are wrapped in a `data` field:

```json
{ "data": { "id": 1, "name": "Binary Stars" } }
```

List endpoints add pagination metadata:

```json
{
  "data": [ /* items */ ],
  "meta": { "page": 1, "pageSize": 20, "total": 43, "totalPages": 3 }
}
```

### Error shape

Every non-2xx response has this shape:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [{ "path": "body.name", "message": "Required" }]
  }
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Zod validation failed, bad body, or malformed scene |
| 401 | `UNAUTHORIZED` | Missing, invalid or expired token |
| 403 | `FORBIDDEN` | Authenticated but not allowed (private scene, disabled account, wrong role) |
| 404 | `NOT_FOUND` | No matching resource or route |
| 409 | `CONFLICT` | Username/email taken, or per-user simulation limit reached |
| 429 | `RATE_LIMITED` | Throttled by the global or auth limiter |
| 503 | — | `/health/ready` when the database is unreachable |
| 500 | `INTERNAL` | Unexpected server error |

### Authentication

Send the JWT issued by `/auth/login` or `/auth/register` as a bearer token:

```
Authorization: Bearer <token>
```

A `token` cookie is also accepted. `optionalAuth` routes populate the requester
when a valid token is present but never reject; `requireAuth` routes return 401
without one.

### Pagination

`page` (default `1`, min `1`) and `pageSize` (default `20`, max `100`; `50` for
experiments). `meta.total` is the total row count and `meta.totalPages` is
derived.

---

## Health

### `GET /api/health` · `GET /api/health/ready`

Readiness probe. Returns 200 when the database answers a ping, otherwise 503.

```json
{
  "data": {
    "status": "ok",
    "uptime": 42,
    "env": "development",
    "database": "up",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

`status` is `"ok"` when `database` is `"up"`, otherwise `"degraded"`.

### `GET /api/health/live`

Liveness probe — always 200 while the process is running.

```json
{ "data": { "status": "ok", "uptime": 42 } }
```

---

## Authentication — `/api/auth`

The credential endpoints are guarded by `authLimiter` (20 requests / 15 min in
production, 200 otherwise).

### `POST /api/auth/register` → `201`

| Field | Type | Rules |
| --- | --- | --- |
| `username` | string | 3–32 chars; sanitised to `[a-zA-Z0-9_.-]` |
| `email` | string | valid email, ≤ 190 chars; lower-cased |
| `password` | string | 8–72 chars |
| `displayName` | string? | 1–64 chars; defaults to the username |

```json
{
  "data": {
    "user": { "id": 3, "username": "ada", "displayName": "ada", "role": "user" },
    "token": "eyJhbGciOi…",
    "expiresIn": "7d"
  }
}
```

Errors: `409 CONFLICT` if the username or email already exists.

### `POST /api/auth/login` → `200`

Body: `{ "username": "ada", "password": "…" }` (username 1–64, password 1–72).

Returns the same `AuthResult` as register. Errors: `401 UNAUTHORIZED` for bad
credentials, `403 FORBIDDEN` for a disabled account.

### `POST /api/auth/logout` — 🔒 required → `200`

Records a logout audit event. Returns `{ "data": { "ok": true } }`.

### `GET /api/auth/me` — 🔒 required → `200`

```json
{ "data": { "id": 3, "username": "ada", "displayName": "ada", "role": "user" } }
```

`404` if the authenticated user no longer exists.

---

## Simulations — `/api/simulations`

### `GET /api/simulations` — optional auth → `200`

Query parameters:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | int ≥ 1 | `1` | |
| `pageSize` | int 1–100 | `20` | |
| `mine` | bool | — | Restrict to the requester's scenes (requires a token) |
| `public` | bool | — | Only `is_public` scenes |
| `archived` | bool | — | Include archived scenes (excluded by default) |
| `search` | string ≤ 120 | — | Case-insensitive `LIKE` over name and description |
| `presetKey` | string ≤ 60 | — | Filter by originating preset |

Ordered by `updated_at DESC`. Each item is a `Simulation`:

```json
{
  "id": 12,
  "userId": 3,
  "name": "Binary Stars",
  "description": "Two equal stars locked in a mutual orbit.",
  "presetKey": "binary-stars",
  "bodyCount": 2,
  "seed": null,
  "settings": {
    "bodies": [ /* BodySpec[] */ ],
    "gravity": { "G": 1, "softening": 4, "relativistic": false },
    "camera": { "x": 0, "y": 0, "zoom": 1 }
  },
  "isPublic": false,
  "isArchived": false,
  "playCount": 5,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-02T00:00:00.000Z",
  "owner": "ada"
}
```

### `POST /api/simulations` — 🔒 required → `201`

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | 1–120 chars, required, trimmed |
| `description` | string \| null | ≤ 500 chars |
| `presetKey` | string \| null | ≤ 60 chars |
| `seed` | int \| null | RNG seed recorded with the scene |
| `settings` | object | required `SceneSettings` |
| `isPublic` | bool? | default `false` |

`settings` is validated by zod, then **normalised** by the server: every numeric
field is clamped to a safe range, unknown `kind` values are rejected, invalid
colours fall back to `#ffcf6b`, and the body count must not exceed
`MAX_BODIES_PER_SIMULATION` (default 500). The `bodies` mirror rows are written
in the same transaction.

Errors: `409 CONFLICT` when the user already has `MAX_SIMULATIONS_PER_USER`
(default 50) active (non-archived) scenes.

### `GET /api/simulations/:id` — optional auth → `200`

Returns the scene if it is public, owned by the requester, or the requester is
an admin. Otherwise `403 FORBIDDEN`.

### `PATCH /api/simulations/:id` — 🔒 required → `200`

Any subset of `name`, `description`, `presetKey`, `settings`, `isPublic`,
`isArchived`. Supplying `settings` replaces the scene document **and** the
normalised bodies. Requires ownership or the `admin` role (`403` otherwise).

### `DELETE /api/simulations/:id` — 🔒 required → `204`

Owner or admin only. Cascades to the scene's `bodies`, and sets
`experiments.simulation_id` to `NULL` for linked runs.

### `POST /api/simulations/:id/play` — optional auth → `200`

Applies the same visibility rules, increments `play_count`, records a
`sim.play` event, and returns the updated `Simulation`.

### `GET /api/simulations/:id/bodies` — optional auth → `200`

Returns the normalised `BodyDto[]` mirror. The visibility check runs first so
private scenes are not enumerable.

```json
{
  "data": [
    {
      "id": 41, "simulationId": 12, "name": "Sol", "kind": "star",
      "mass": 90000, "radius": 34, "posX": 0, "posY": 0, "velX": 0, "velY": 0,
      "color": "#fff2b8", "temperature": 5778, "luminosity": 1, "spin": 0,
      "isFixed": true, "trailLength": 240, "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Presets — `/api/presets`

Public read-only catalogue of built-in scenes (seeded from `database/seed.sql`,
mirrored in `client/src/sim/presets.ts`).

### `GET /api/presets` → `200`

Optional `?category=` — one of `blackhole`, `stellar`, `orbital`, `exotic`,
`sandbox`. Returns `Preset[]`:

```json
{
  "id": 4, "key": "solar-system-lite", "name": "Solar System (Lite)",
  "category": "orbital", "description": "A heavy central star…",
  "difficulty": 2, "settings": { /* SceneSettings */ },
  "isBuiltin": true, "sortOrder": 40,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

An invalid category yields `400 BAD_REQUEST`.

### `GET /api/presets/:key` → `200`

Looks up a single preset by its stable `key`. `404 NOT_FOUND` if absent.

---

## Experiments — `/api/experiments`

Experiments are quantitative records produced by the client's calculus tools
(integral values, derivative samples, energy drift).

### `POST /api/experiments` — 🔒 required → `201`

| Field | Type | Rules |
| --- | --- | --- |
| `simulationId` | int \| null | must exist if provided |
| `label` | string | 1–120 chars, required, trimmed |
| `integralValue` | number \| null | e.g. result of `simpson`/`gaussQuad` |
| `derivativeAt` | number \| null | e.g. result of `centralDiff` |
| `energyDrift` | number \| null | fractional energy drift |
| `samples` | int ≥ 0? | number of samples used |
| `result` | any? | free-form JSON payload |

`404 NOT_FOUND` if the referenced simulation does not exist.

### `GET /api/experiments` — 🔒 required → `200`

Paged list of the requester's own experiments (`page`, `pageSize` default 50,
max 100), newest first.

### `GET /api/experiments/simulation/:id` — optional auth → `200`

All experiments recorded against one simulation, newest first.

### `DELETE /api/experiments/:id` — 🔒 required → `204`

Deletes an experiment the requester owns, or any experiment if `admin`. A
non-owner receives `404` (the resource is deliberately not disclosed).

---

## Bodies — `/api/bodies`

Cross-simulation aggregate queries over the normalised mirror.

Returns the total number of bodies of each kind across the whole database.

```json
{ "data": [ { "kind": "planet", "total": 412 }, { "kind": "star", "total": 88 } ] }
```

### `GET /api/bodies/kind/:kind` → `200`

All bodies of a given `kind` (one of the six body kinds), heaviest first.
Optional `?limit=` (default 100). An unknown kind yields `400 BAD_REQUEST`.

---

## Rate limiting

| Limiter | Scope | Window | Max |
| --- | --- | --- | --- |
| `apiLimiter` | all `/api` routes | `RATE_LIMIT_WINDOW_MS` (15 min) | `RATE_LIMIT_MAX` (300) |
| `authLimiter` | `/auth/register`, `/auth/login` | 15 min | 20 (prod) / 200 (dev) |

Rate-limited responses use the standard `RateLimit-*` headers and return
`429 RATE_LIMITED`.

---

## Client SDK

The typed wrappers in `client/src/api/` are the canonical way to call these
endpoints:

| Module | Exposes |
| --- | --- |
| `client.ts` | `request`, `requestWithMeta`, `ApiError`, token storage |
| `authApi.ts` | `register`, `login`, `logout`, `me` |
| `simulationApi.ts` | `listSimulations`, `getSimulation`, `createSimulation`, `updateSimulation`, `deleteSimulation`, `playSimulation`, `listBodies` |
| `presetApi.ts` | preset listing/lookup |
| `experimentApi.ts` | `createExperiment`, `listExperiments`, `listForSimulation`, `deleteExperiment` |
| `healthApi.ts` | readiness probe |

`request()` unwraps the `{ data }` envelope and throws `ApiError` (with
`status`, `code`, `details`) on failure; a 401 clears the stored token.
