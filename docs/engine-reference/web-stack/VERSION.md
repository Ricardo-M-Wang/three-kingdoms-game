# Web Stack — Version Reference

| Field | Value |
|-------|-------|
| **Runtime** | Browser (DOM + Web APIs) |
| **Framework** | React 19.2 |
| **Language** | TypeScript 6.0 |
| **Build Tool** | Vite 8.0 |
| **CSS** | Tailwind CSS 4.2 |
| **State** | Zustand 5.0 |
| **Router** | React Router 7.14 |
| **Project Pinned** | 2026-05-28 |

## Knowledge Gap Warning

React 19 introduced significant changes (Server Components, Actions, use() hook,
ref as prop). TypeScript 6.0 may have features beyond the LLM's training data.
Always verify React/TS APIs against current docs when implementing.

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.5 | UI framework |
| react-dom | ^19.2.5 | DOM renderer |
| react-router-dom | ^7.14.2 | Client-side routing |
| zustand | ^5.0.12 | State management |
| tailwindcss | ^4.2.4 | Utility-first CSS |
| @tailwindcss/vite | ^4.2.4 | Tailwind Vite plugin |
| vite | ^8.0.10 | Build tool |

## Verified Sources

- React 19 docs: https://react.dev/
- TypeScript 6.0: https://devblogs.microsoft.com/typescript/
- Vite 8: https://vite.dev/
- Tailwind CSS 4: https://tailwindcss.com/
- Zustand: https://github.com/pmndrs/zustand
