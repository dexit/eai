# Developer Guidelines for AI Agents

To maintain perfect architecture and code styling inside this codebase, observe instructions herein:

## Typography and Design
* Theme uses Inter and JetBrains Mono fonts.
* Rich layout with ample negative spaces, styled shadows, borders, and visual rhythm.
* Avoid absolute margins and sizing where window observers are safer.

## React State Guidelines
* Do not perform state updates directly inside component render cycles.
* Ensure all elements containing custom features have unique IDs for styling / targeting.
* Ensure perfect type safety with customized TypeScript definitions inside `/src/types.ts`.
