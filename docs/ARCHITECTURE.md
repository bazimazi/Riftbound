# Client architecture

Riftbound is a local single-player game. The simulation, progression, rendering,
audio, input, and persistence all run in the client. There is no gameplay backend.
Vite is development/build tooling; it is not needed by someone playing the built
game. The old static `server.mjs` has been replaced by that tooling.

## Source layout

```text
src/
  main.ts                    Browser entry and stylesheet imports
  game/
    index.ts                 Public simulation API
    Game.ts                  Run state and simulation orchestration
    types.ts                 Game, save, and entity contracts
    math.ts                  Shared simulation math
    save.ts                  Save defaults, migration, and run banking
    data/                    Heroes, spells, specializations, descriptions
    combat/                  Class mechanics, motion, spells, and talent effects
    progression/             Forge, journeys, talents, research, evolutions
    world/                   Realms, exploration, contracts, and artifacts
  client/
    app.ts                   Menus, controls, HUD, and client composition
    dom.ts                   Typed HTML element bindings
    assets.ts                Bundler-managed artwork URLs
    platform/save-repository.ts  Storage boundary
    runtime/game-loop.ts     Host clock and frame scheduling
    rendering/               Canvas renderer, sprite caches, maps, and effects
    audio/                   Web Audio sound synthesis
    ui/                      Screen controllers and layout helpers
    styles/                  Game stylesheets
  shared/records.ts          Typed lookup table helper
```

Keep browser APIs and platform integration in `client`. `game` has no DOM,
storage, network, or server dependency and can run under Node for tests. It
accepts elapsed seconds, controls, a save, and an injectable random source;
the client consumes its state and events. New mechanics belong in the matching
game subsystem, while their presentation belongs in rendering/UI.

All runtime source is TypeScript, with strict type checking. A separate game
configuration excludes DOM and Node globals to enforce the platform boundary.
The existing Node
and Playwright test drivers remain JavaScript and use `tsx` to import the typed
simulation. Production builds require a successful type check first.

## Standalone build

```sh
npm install
npm run dev          # Local development on port 4186
npm run typecheck
npm run build        # Produces dist/
```

Open `dist/index.html` directly from disk, or load it from a desktop webview.
Copy the whole folder when distributing it. The build uses relative paths and
a classic deferred script, so it works without an HTTP server. PNG atlases and
the font are embedded: loading separate images over `file:` would taint the
canvases used for sprite extraction and recoloring. This makes the bundle larger
but keeps the current rendering pipeline usable offline. License notices are
included in the output. No CDN or external audio service is used.

## Persistence and a future desktop wrapper

`SaveRepository` loads, migrates, and writes the established
`riftbound.save.v1` format. `SaveStorage` exposes `getItem` and `setItem`; the
browser implementation is passed in by `app.ts`. A wrapper can supply a
synchronous cached adapter backed by its local save file without changing
combat or progression. An asynchronous native file API will need a preload or
cache layer before creating the repository.

Browser storage is scoped to the host, protocol, and profile. Existing localhost
saves migrate when playing at the same address. Disk builds and a future native
origin have separate storage; transferring saves between those environments
requires an explicit export/import feature or wrapper migration. Storage failures
allow play in memory and are reflected by the existing save-status UI. Only
banked runs persist; closing an unfinished run still loses its unbanked rewards.

`GameLoop` owns the frame scheduler and caps elapsed time after suspension.
`FrameScheduler` is injectable, and the loop exposes start, stop, and reset for
host lifecycle integration. Keyboard, touch, rendering, and Web Audio continue
to use browser APIs available in desktop webviews. The client build is ready for
a wrapper; no Electron/Tauri shell, installer, or platform-specific packaging
has been added.

## Verification

```sh
npm test              # Simulation, progression, saves, and host services
npm run test:client   # Build, then direct-file offline desktop/mobile smoke test
npm run test:browser  # Existing full desktop/touch regression suites
npm run check         # Type check, unit tests, and standalone smoke test
npm run format:check
```

Browser tests require Playwright Chromium (`npx playwright install chromium`).
The standalone smoke test disables networking and exercises asset/font loading,
movement, skill release, pause, banking, and save reload at desktop and phone
sizes. Browser regression suites start temporary Vite servers; those servers
are test tooling only. The browser test API is enabled explicitly by `?test=1`.
