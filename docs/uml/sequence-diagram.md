# Sequence diagrams

Runtime interactions across the system: an authenticated API request, the
simulation step loop, registration/login, and saving a scene.

> Rendered with Mermaid.

---

## 1. API request lifecycle (authenticated write)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant C as Client (api client)
    participant M as Middleware chain
    participant R as Route
    participant V as validate (zod)
    participant A as requireAuth
    participant H as Controller
    participant S as Service
    participant Mdl as Model
    participant DB as MySQL

    U->>C: click "Save"
    C->>M: POST /api/simulations (Bearer token, JSON body)
    M->>M: helmet, cors, compression, json, cookieParser
    M->>M: requestId -> X-Request-Id, morgan log
    M->>M: apiLimiter (rate check)
    M->>R: dispatch
    R->>V: validate({ body: createSchema })
    V-->>R: parsed body  (or 400 BAD_REQUEST)
    R->>A: requireAuth
    A->>A: verifyToken -> req.user  (or 401 UNAUTHORIZED)
    R->>H: create(req, res, next)
    H->>S: create({ ...body, userId }, auditContext)
    S->>Mdl: countForUser(userId)
    Mdl->>DB: SELECT COUNT(*) ...
    DB-->>Mdl: count
    Mdl-->>S: count
    alt limit reached
        S-->>H: throw conflict (409)
        H-->>C: next(err)
    else within limit
        S->>S: validateScene(settings)  // clamp + check
        S->>Mdl: create(input)
        Mdl->>DB: BEGIN; INSERT simulation; INSERT bodies; COMMIT
        DB-->>Mdl: insertId
        Mdl-->>S: Simulation
        S->>Mdl: eventModel.record(sim.create)
        Mdl->>DB: INSERT api_events (fire-and-forget)
        S-->>H: Simulation
        H->>C: 201 { data: Simulation }
    end
    C-->>U: toast "Saved"
```

Any thrown error is forwarded with `next(err)` and terminated by the central
`errorHandler`, producing `{ error: { code, message, details? } }`.

---

## 2. Simulation step loop (client)

```mermaid
sequenceDiagram
    autonumber
    participant RAF as requestAnimationFrame
    participant E as Engine
    participant B as Body[]
    participant G as gravity
    participant RK as rk4Step
    participant X as collision
    participant R as Renderer

    RAF->>E: advance(realDt)
    E->>E: target = max(MIN_DT, dt)·timeScale
    E->>E: sub = clamp(round(target/dt), 1, MAX_SUBSTEPS)
    loop sub times (h = target/sub)
        E->>E: step(h)
        E->>E: pack state y = [x…, y…, vx…, vy…]  (length 4n)
        loop RK4 stages k1..k4
            E->>B: write candidate state into bodies
            E->>G: computeAccelerations(bodies, settings)
            G-->>E: writes a.ax / a.ay
            E->>B: restore saved state
        end
        E->>RK: rk4Step(f, time, state, h)
        RK-->>E: next state
        E->>B: write next state into bodies
        E->>E: time += h; steps++
        alt collisionMode != 'none'
            E->>X: resolve(bodies, mode)
            X->>B: merge(a,b) or bounce(a,b)
            E->>X: prune(bodies)
            X-->>E: survivors
        end
        E->>B: pushTrail() for each body
    end
    E-->>RAF: done
    RAF->>R: render(engine.bodies)
    R-->>RAF: frame drawn
```

---

## 3. Registration

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant C as authApi
    participant R as /api/auth/register
    participant S as authService
    participant M as userModel
    participant DB as MySQL

    U->>C: register(username, email, password)
    C->>R: POST (authLimiter)
    R->>R: validate(registerSchema)
    R->>S: register(input, ctx)
    S->>S: sanitizeUsername / normalizeEmail
    S->>M: findByUsername
    M->>DB: SELECT ... WHERE username = ?
    alt username taken
        S-->>R: throw conflict (409)
    else email taken
        S->>M: findByEmail
        S-->>R: throw conflict (409)
    else free
        S->>S: hashPassword(password)  // bcrypt
        S->>M: create(user)
        M->>DB: INSERT INTO users
        DB-->>M: insertId
        S->>M: record(auth.register)
        S->>S: signToken({ sub, username, role })
        S-->>R: { user, token, expiresIn }
        R-->>C: 201 { data: AuthResult }
        C->>C: setToken(token)  // localStorage + memory
    end
```

## 4. Login

```mermaid
sequenceDiagram
    autonumber
    participant C as authApi
    participant R as /api/auth/login
    participant S as authService
    participant M as userModel
    participant DB as MySQL

    C->>R: POST { username, password } (authLimiter)
    R->>R: validate(loginSchema)
    R->>S: login(username, password, ctx)
    S->>M: findByUsernameWithHash
    M->>DB: SELECT * WHERE username = ?
    alt no user
        S-->>R: throw unauthorized (401)
    else inactive account
        S-->>R: throw forbidden (403)
    else found
        S->>S: verifyPassword(password, hash)
        alt invalid
            S-->>R: throw unauthorized (401)
        else valid
            S->>M: touchLastLogin(id)
            S->>M: findById(id)
            S->>M: record(auth.login)
            S->>S: signToken(...)
            S-->>R: { user, token, expiresIn }
            R-->>C: 200 { data: AuthResult }
        end
    end
```

---

## 5. Loading a preset and saving the scene

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant Menu as Menu
    participant P as presets
    participant E as Engine
    participant R as Renderer
    participant API as simulationApi
    participant SRV as API server

    U->>Menu: Presets -> "Binary Stars"
    Menu->>P: presetScene('binary-stars')
    P-->>Menu: SceneSettings (deep clone)
    Menu->>E: loadScene(scene)
    E->>E: resetIdCounter(1)
    E->>E: bodies = scene.bodies.map(Body.fromSpec)
    E->>E: initialEnergy = totalEnergy(...)
    E-->>Menu: ready
    Menu->>R: render(engine.bodies)

    U->>Menu: File -> Save
    Menu->>E: toScene(camera)
    E-->>Menu: SceneSettings
    Menu->>API: createSimulation({ name, settings })
    API->>SRV: POST /api/simulations
    SRV->>SRV: validate + normalise scene
    SRV-->>API: 201 { data: Simulation }
    API-->>Menu: Simulation
    Menu-->>U: toast "Saved"
```

---

## 6. Collision resolution (merge)

```mermaid
sequenceDiagram
    autonumber
    participant E as Engine
    participant X as collision
    participant A as Body a
    participant B as Body b

    E->>X: resolve(bodies, 'merge')
    X->>X: detect(bodies)
    Note over X: pairs where distance < r_a + r_b
    loop each overlapping pair
        X->>A: read mass, velocity, position
        X->>B: read mass, velocity, position
        X->>A: v = (m_a·v_a + m_b·v_b) / M
        X->>A: x = (m_a·x_a + m_b·x_b) / M
        X->>A: mass = M
        X->>A: radius = sqrt(r_a² + r_b²)·0.85
        X->>A: luminosity += b.luminosity
        X->>A: temperature = max(...)
        opt neutron star merging with M > 100000
            X->>A: kind = 'blackhole'
        end
        X->>B: alive = false
    end
    X-->>E: count handled
    E->>X: prune(bodies)
    X-->>E: survivors (alive = true)
```

---

## 7. Readiness probe

```mermaid
sequenceDiagram
    autonumber
    participant LB as Load balancer
    participant R as GET /api/health/ready
    participant S as healthService
    participant P as pool
    participant DB as MySQL

    LB->>R: GET
    R->>S: report()
    S->>P: ping()
    P->>DB: acquire connection + PING
    alt reachable
        DB-->>P: ok
        P-->>S: true
        S-->>R: { status: 'ok', database: 'up', uptime, env, timestamp }
        R-->>LB: 200
    else unreachable
        P-->>S: false
        S-->>R: { status: 'degraded', database: 'down', ... }
        R-->>LB: 503
    end
```
