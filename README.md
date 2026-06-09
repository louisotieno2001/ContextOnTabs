# Context On Tabs

Context On Tabs is a cross-browser extension for creating floating AI context panels from highlighted webpage content. Supports Chromium (MV3) and Firefox (MV2) from a single codebase using `webextension-polyfill`.

## What is included

- Plasmo + React + TypeScript extension setup
- Cross-browser API layer (`webextension-polyfill` — write `browser.*`, runs on Chrome + Firefox)
- TailwindCSS styling
- Content-script overlay injection
- Text selection capture and source anchoring
- Floating, draggable, resizable panels
- Local graph persistence through browser storage
- Background worker AI request routing
- Cross-tab state synchronization
- Node grouping with AI correlation summaries
- Popup status view and local graph reset

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | For AI features | Your OpenAI API key (local dev only) |
| `FIREFOX_EXT_ID` | For Firefox builds | Add-on ID (e.g. `context-on-tabs@example.org`) |

## Development

```bash
pnpm run dev          # Chrome MV3 (hot reload)
pnpm run dev:firefox  # Firefox MV2 (hot reload)
```

Load the generated extension from:

| Target | Path |
|---|---|
| Chrome | `build/chrome-mv3-dev` in `chrome://extensions` |
| Firefox | `build/firefox-mv2-dev` in `about:debugging#/runtime/this-firefox` |

This project expects Node 20-24. Plasmo uses Parcel `2.9.3`; the root `package.json` pins those Parcel internals through `overrides` so npm cannot accidentally hoist newer incompatible Parcel packages.

If you hit dependency issues, refresh the install:

```bash
rm -rf node_modules package-lock.json .plasmo/cache
pnpm install
```

If Node is installed through `fnm` but `npm` is not on the current shell path, use the installed Node bin path directly:

```bash
PATH=path/to/node_binary:$PATH pnpm run dev
```

## Build

```bash
pnpm run build            # Chrome MV3
pnpm run build:firefox    # Firefox MV2
pnpm run package          # Chrome MV3 (zip for store)
pnpm run package:firefox  # Firefox MV2 (zip for store)
```

Output goes to `build/` under target-specific directories.

## AI key

The extension reads `OPENAI_API_KEY` during local builds. A browser extension bundle is not a safe place for private API keys, so use this only for local MVP testing and move production calls behind a backend service.
