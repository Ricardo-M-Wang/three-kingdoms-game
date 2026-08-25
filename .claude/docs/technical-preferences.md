# Technical Preferences

<!-- Populated by /setup-engine. Updated as the user makes decisions throughout development. -->
<!-- All agents reference this file for project-specific standards and conventions. -->

## Engine & Language

- **Engine**: Web (React 19 + TypeScript + Vite)
- **Language**: TypeScript 6.x
- **Rendering**: React DOM + Tailwind CSS 4 + Canvas/WebGL for game scenes
- **Physics**: N/A (turn-based strategy, no real-time physics needed)

## Input & Platform

<!-- Written by /setup-engine. Read by /ux-design, /ux-review, /test-setup, /team-ui, and /dev-story -->
<!-- to scope interaction specs, test helpers, and implementation to the correct input methods. -->

- **Target Platforms**: Web Browser (Desktop + Mobile)
- **Input Methods**: Keyboard/Mouse, Touch
- **Primary Input**: Mouse (point-and-click strategy)
- **Gamepad Support**: None
- **Touch Support**: Full (responsive layout for mobile)
- **Platform Notes**: PWA-capable for offline play; support Chrome, Firefox, Safari, Edge

## Naming Conventions

- **Classes/Components**: PascalCase (e.g., `BattleScene`, `HeroCard`)
- **Variables/Functions**: camelCase (e.g., `selectedHero`, `calculateDamage`)
- **Events/Handlers**: `on` + PascalCase (e.g., `onHeroSelect`, `onBattleEnd`)
- **Files**: Components in PascalCase (`HeroCard.tsx`), utils in camelCase (`damageCalc.ts`)
- **Hooks**: `use` + PascalCase (e.g., `useGameState`, `useHeroData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_HERO_LEVEL`, `BASE_DAMAGE`)

## Performance Budgets

- **Target Load Time**: < 3s initial, < 1s route transitions
- **Bundle Size**: < 500KB gzipped (initial chunk)
- **Frame Rate**: 60fps UI, 30fps game animations
- **Memory**: < 200MB heap

## Testing

- **Framework**: Vitest + React Testing Library
- **Minimum Coverage**: 70% game logic, 50% UI components
- **Required Tests**: Game rules/balance formulas, state transitions, AI decisions, battle calculations

## Forbidden Patterns

<!-- Add patterns that should never appear in this project's codebase -->
- [None configured yet — add as architectural decisions are made]

## Allowed Libraries / Addons

<!-- Add approved third-party dependencies here -->
- [None configured yet — add as dependencies are approved]

## Architecture Decisions Log

<!-- Quick reference linking to full ADRs in docs/architecture/ -->
- [No ADRs yet — use /architecture-decision to create one]

## Engine Specialists

<!-- Written by /setup-engine when engine is configured. -->
<!-- Read by /code-review, /architecture-decision, /architecture-review, and team skills -->
<!-- to know which specialist to spawn for engine-specific validation. -->

- **Primary**: ui-programmer (React/TypeScript web stack)
- **Language/Code Specialist**: ui-programmer
- **Shader Specialist**: N/A (no custom shaders in web stack)
- **UI Specialist**: ui-programmer
- **Additional Specialists**: ai-programmer, gameplay-programmer, systems-designer
- **Routing Notes**: React components use ui-programmer; game logic uses gameplay-programmer; AI uses ai-programmer

### File Extension Routing

<!-- Skills use this table to select the right specialist per file type. -->
<!-- If a row says [TO BE CONFIGURED], fall back to Primary for that file type. -->

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (primary language) | gameplay-programmer |
| Shader / material files | N/A |
| UI / screen files | ui-programmer |
| Scene / prefab / level files | ui-programmer |
| Native extension / plugin files | ui-programmer |
| General architecture review | Primary |
