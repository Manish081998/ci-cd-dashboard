# Gitweb

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.0.

It has two parts that both need to be running at the same time:

- **Backend** — `server.js`, an Express server (default port `3001`) that talks to git/GitHub and handles deploys.
- **Frontend** — the Angular app (default port `4200`), served via `ng serve`.

## Setup (first time only)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local server config from the example, then fill in your values (GitHub token, deploy targets, credentials, etc.):

   ```bash
   cp server-config.example.json server-config.json
   ```

   `server-config.json` is gitignored, so your tokens/credentials stay local.

## Running the app

### Option A — run both together (recommended)

```bash
npm start
```

This uses `concurrently` to launch the backend (`node server.js`) and the frontend (`ng serve`) in one terminal, prefixed `GIT` (yellow) and `NG` (cyan).

- Frontend: http://localhost:4200/
- Backend:  http://localhost:3001/

If you're on a machine that needs the system CA store for HTTPS/git calls, use the CA-aware variant instead:

```bash
npm run start:ca
```

### Option B — run them separately

In one terminal, start the backend:

```bash
npm run server
```

In another terminal, start the frontend:

```bash
ng serve
```

Then open `http://localhost:4200/` in your browser. The Angular dev server proxies/consumes the backend API, so both must be running for the app to work fully. The frontend will automatically reload whenever you modify source files.

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

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

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