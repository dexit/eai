# Engineering and Development Plans

This document registers the precise, step-by-step engineering plan designed to address the user's requirements.

## Step 1: Upgrade Shared Interface Definition (types.ts)
* Create `DetailLookupConfig` and integrate it inside `ImportJob` and `ImportJobConfig` interfaces.
* Add `total`, `totalFiltered`, and `totalPages` as optional fields under `ImportJob`.

## Step 2: Implement GIS Coordinate Location Quick Presets in App Component (App.tsx)
* Add quick coordinates loader presets (lat/lon and distance) for major UK cities (e.g. Birmingham, London, Manchester, Leeds).
* Inject coordinates and radius parameters securely inside the QueryParams list.

## Step 3: Upgrade Data Scraping Engine supporting Nested Lookups (ImportJobsManager.tsx)
* Update `handleStartJob` scraper loop.
* If Detail Lookup config is enabled, extract specified reference field (e.g. `vacancyReference`).
* Issue fetch to substitute Detail URL Template, rate-throttling between detail request cycles.
* Merge resulting detail payload keys directly into item structure.
* Capture response body root keys `total`, `totalFiltered`, `totalPages` and persist them into the Job's stats!

## Step 4: Add CSS/HTML Custom JSON-Tree Leaf Explorer Visualizer (JSONSea / JSONCrack clone)
* Create interactive, collapsible JSON tree viewer supporting:
  * Node toggles
  * Node dot-notation path indicator (with Copy Path button)
  * Rich type categorization highlights
  * Dynamic filtering of keys/values.

## Step 5: Build PHP Code Generator
* Output a complete, self-contained, rates-limiting PHP scraper script with cURL/Guzzle loops, multi-page bounds, arrays extraction (`totalFiltered`), and nested per-item detail pages.

## Step 6: Expand SQL Exporter supporting SQLite, MySQL, and Postgres Dialects
* Rewrite `handleExportDbTable` with dialect selectors.
* Generate proper column type estimation (text vs integer vs float) and matching SQL dialects.
