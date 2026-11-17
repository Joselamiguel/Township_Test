# GitHub Pages deployment

The public site at `https://roshanm75.github.io/Township_Test/` uses a static build of the actual Next.js user interface and pedestrian journey engine. It needs no hosted database account or paid routing service.

The text-only site came from Pages publishing the repository root with its legacy source/Jekyll build. There was no compiled app `index.html` in that folder, so the README was rendered as a documentation page. Publishing source files does not build a Next.js application, and Pages cannot run its Next.js API routes or PostgreSQL/PostGIS.

## What works in the public preview

- Interactive map, sample Elmina walks and pedestrian-only routes.
- Walking needs and saved preferences; route comparisons, time-of-day shade/lighting and honest confidence bars.
- Rest/budget constraints and entrance selection using the available source records. There are no invented verified seats or surveys.
- Reachable-place discovery and shared walk links that preserve the project URL prefix.
- Mapped-place provenance and read-only verification coverage.
- Optional weather forecasts requested directly from Open-Meteo. An outage stays explicitly unavailable.

The public preview shows that shared reports and verification edits are unavailable. Reporting is disabled, the verification page displays source coverage, and the data provider rejects writes before sending them. Preferences stay in the visitor's browser. No local reports, auditor labels, evidence references, database credentials or database dumps are exported. Initial public hazard/report/verification arrays are deliberately empty, and the maintenance page does not label that absence as an all-clear survey.

The default `npm run dev` / `npm run build` / `npm start` application retains its Next.js APIs and local PostgreSQL/PostGIS records, shared reports, editable facilities and observation history. See the main README for setup. The public preview is not a substitute for deploying that server when shared contributions are needed.

## Build locally

Use Node.js 24 and the existing lockfile:

```bash
npm ci
npm run build:pages
npm run check:pages
npm run preview:pages
```

`build:pages` imports the supplied `precinct.json` with the existing strict pedestrian importer, creates public snapshot files under the ignored `public/pilot/` directory, then builds Next.js with `output: 'export'`. Pages/layouts use `.tsx`; the Pages-only `pageExtensions` setting excludes server `.ts` API handler entry points from this build. The full server build uses the original extensions and keeps its APIs. No source files are renamed or deleted to switch modes.

The script sets `NEXT_PUBLIC_SITE_MODE=pages` and `NEXT_PUBLIC_BASE_PATH=/Township_Test`. In GitHub Actions the repository name determines the prefix; a repository named `owner.github.io` uses the domain root. To test a different prefix, provide `NEXT_PUBLIC_BASE_PATH` to the build command (an empty value builds for the root). These are public build settings, not database credentials. Changing them requires rebuilding.

Next.js prefixes links and assets, and the snapshot provider prefixes JSON requests. `trailingSlash` exports deep links such as `resident/index.html`; `.nojekyll` protects underscore assets if the output is hosted with a branch-based static server. The planning clock follows the visitor's current time rather than the snapshot's build time.

`check:pages` verifies app HTML, linked CSS/JavaScript files, project-prefixed asset paths, public data, pedestrian filtering and the absence of fabricated verification records. `preview:pages` serves only `out/` at the configured project prefix, so local checks catch broken subdirectory links instead of relying on a Next.js development server.

## Automatic deployment

`.github/workflows/pages.yml` builds and checks the static app on pull requests and uploads the compiled `out/` artifact. Pushes to `master` and manual runs also deploy the artifact using GitHub's official Pages actions. The deployment job requests `pages: write` and `id-token: write`. Both workflows use Actions with Node.js 24 runtimes and Ubuntu 24.04 runners.

The repository owner selects **Repository Settings → Pages → Build and deployment → Source → GitHub Actions** for the compiled site. The workflow deliberately does not modify administrative Pages settings with its deployment token: those configuration changes require different authorization from deploying an artifact. GitHub repository settings and publishing a Codex cloud environment are separate controls.

The full application checks remain in `.github/workflows/ci.yml`, including real PostGIS integration tests. Pages deployment does not require, expose or replace the local database. For a later full public deployment, use a host capable of running Next.js server routes and a PostgreSQL/PostGIS instance, with authenticated administrator access.
