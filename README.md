# pi-extensions

Flat monorepo for pi packages.

## Layout

- `packages/shared` — shared helpers used by extension packages
- `packages/*` — one package per extension, plus prompt/theme packages

This layout keeps packages easy to install, test, disable, and remove individually from `~/.pi/agent/settings.json` or project `.pi/settings.json`.

## Install one package locally

```bash
pi install ./packages/session-tab-title
pi install ./packages/foresight
```

## Workspace bootstrap

Run this once after changing package dependencies:

```bash
npm install
```
