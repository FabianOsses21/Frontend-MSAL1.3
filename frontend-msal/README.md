# Pedidos360 — Frontend (Angular + MSAL)

Angular 22 SPA that authenticates against Microsoft Entra ID using MSAL (Authorization Code Flow + PKCE) and consumes the backend through AWS API Gateway.

## Architecture

```mermaid
graph LR
    subgraph Client
        A["Angular SPA<br/>MSAL + PKCE"]
    end
    subgraph Azure["Microsoft Entra ID (IDaaS)"]
        B["Tenant<br/>SPA App + API App<br/>Scope: OT.Create"]
    end
    subgraph AWS
        C["API Gateway<br/>JWT Authorizer + CORS"]
        D["EC2 · Spring Boot<br/>OAuth2 Resource Server"]
        E[("H2 file / RDS")]
    end
    A -->|"1. loginRedirect (code + PKCE)"| B
    B -->|"2. id_token + access_token"| A
    A -->|"3. HTTPS · Authorization: Bearer JWT"| C
    C -->|"4. valid token"| D
    C -.->|"401 invalid token"| A
    D --> E
```

## Authorization Code Flow with PKCE

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant F as Angular SPA (MSAL)
    participant E as Entra ID
    U->>F: Click "Sign in"
    F->>F: Generate code_verifier + code_challenge (S256)
    F->>E: GET /authorize?client_id&code_challenge&state&nonce
    E->>U: Login / consent form
    U->>E: Credentials
    E->>F: Redirect to redirectUri with authorization code
    F->>E: POST /token (code + code_verifier)
    E->>E: Verify SHA256(code_verifier) == code_challenge
    E->>F: id_token + access_token (JWT)
    F->>F: Cache tokens in sessionStorage
```

## Authenticated request flow (JWT validation)

```mermaid
sequenceDiagram
    autonumber
    participant F as Angular SPA
    participant G as API Gateway (AWS)
    participant B as Spring Boot (EC2)
    F->>G: GET /api/requests<br/>Authorization: Bearer JWT
    G->>G: JWT Authorizer: validate iss + aud
    alt invalid / missing token
        G-->>F: 401 Unauthorized
    else valid token
        G->>B: Forward request + JWT
        B->>B: Resource Server verifies signature, issuer-uri, audience
        alt missing SCOPE_OT.Create
            B-->>F: 403 Forbidden
        else authorized
            B-->>G: 200 + JSON
            G-->>F: 200 + JSON
        end
    end
```

## Key files

| File | Purpose |
|---|---|
| `src/environments/environment.ts` | `clientId`, `tenantId`, `backendScope`, `apiUrl` (API Gateway) |
| `src/app/factories/msal-instance.factory.ts` | `PublicClientApplication` → PKCE flow, `sessionStorage` cache |
| `src/app/app.config.ts` | `protectedResourceMap` + `MsalInterceptor` (auto Bearer token) |
| `src/app/services/auth.service.ts` | `loginRedirect`, logout, roles from `idTokenClaims` |
| `src/app/app.routes.ts` | `MsalGuard` on protected routes, `roleGuard` on `/catalog` |
| `src/app/services/order.service.ts` | API calls through API Gateway, 401/403 error handling |

---

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
