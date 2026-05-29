# Solution Features Map

This file diagrams and outlines the explicit feature set designed for our advanced paginated API scraper and data exporter.

## 1. Deep Detail Reference Lookup (Nested Scraper)
* **Configuration Toggle**: Add "Enable Deep Detail Reference Lookup" checkbox in Job creation and setup form.
* **Fields**:
  * **Reference Key Source**: Dropdown or string input (e.g. `vacancyReference` or `id`) to target property keys in parent list.
  * **Detail URL Template**: String url supporting `{reference}` substitute placeholder (e.g. `https://api.apprenticeships.education.gov.uk/vacancies/vacancy/{reference}`).
  * **Throttle Delay**: Configurable milliseconds delay (e.g. `500ms`) specifically between sub-fetches to prevent blocking.
* **Scraper Engine Upgrade**: While making paginated requests, loop each parent item. If detail lookup is enabled, perform secondary fetch. Merge child fields directly into item payload before committing to consolidated array and local Virtual Database.
* **Console feedback**: Detailed stdout/logs in the runner console representing nested lookup indices: `[Page 1] [Lookup 4/10] Merged detailed vacancy payload for reference 100004561`.

## 2. Advanced PHP Scraper & Loops Code Generator
* **Syntax Panel**: Create a dedicated tab/panel "PHP Code Generator" inside the automated jobs viewer.
* **Features**:
  * Automatically takes current job URL, header keys, post body, delay throttles, and detail lookup credentials.
  * Outputs copy-pasteable, clean object-oriented PHP code using pure `curl` or Guzzle.
  * Implements pagination bounds, arrays metadata parsing (`totalFiltered`), deduplication, and nested detailed lookup with sleep.

## 3. High-Performance JSON Tree Explorer (JSONSea & JSONCrack Visualizer)
* **Visual Node Tree**: Provide an interactive tree visualizer for inspecting response JSON or selected item rows.
* **Interactive Controls**:
  * Expand/Collapse object and array branches with indicator arrows.
  * Value path compiler: Hovering/clicking any node displays the dot-notation path (e.g., `results[0].wage.wageType`).
  * "Copy Path" action: Quick copy path directly as reference parameter key or search target.
  * Rich inline highlights for keys, values, datatypes (Strings, Numbers, Booleans, Nulls).
  * Filter/Search bar to filter specific nodes by key or value text.

## 4. Smart Metadata & Total Counts Engine
* **Metadata Extractor**: Automatically captures variables `total`, `totalFiltered`, `totalPages` inside API response payloads.
* **KPI Metric Cards**: Displays total records available versus current scraped progress in prominent, beautiful visual badges.
* **Suggested Range Controls**: Displays a helpful notice to adjust page setup: * "API reports 429 total pages. Click to adjust End Page config to 429."

## 5. Latitude, Longitude, & Geographical Search Support
* **Presets Upgrade**: Inject new location-based query parameters (latitude, longitude, distanceInMiles) to quickly search regional apprenticeships (e.g. around Birmingham, London, Manchester).
* **Location Helper**: Add instant preset buttons to load regional coordinates.

## 6. Extended DB Relational Exporter Dialects
* **Modes**:
  * **SQLite Dialect**: Custom SQLite tables, primary IDs, and bulk inserts.
  * **PostgreSQL Dialect**: Valid Postgres schema layout, Serial sequences, escape sequences.
  * **MySQL Dialect**: Auto-increment columns, string-escaped statements.
