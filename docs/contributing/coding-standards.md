# Coding Standards

Code conventions, component patterns, and commit guidelines for Super Bulls.

---

## General Principles

1. **Stability first** — Changes must never break existing functionality
2. **Minimal surface area** — Only modify files directly related to the task
3. **SSR-safe** — All code must work in both browser and server-side rendering contexts
4. **Graceful degradation** — Features should fail silently, never crash the app
5. **TypeScript strict** — All code should be properly typed

---

## TypeScript

- Use TypeScript for all new files
- Prefer `interface` over `type` for object shapes
- Use explicit return types for exported functions
- Avoid `any` — use `unknown` and narrow with type guards
- Import types with `import type` when only types are needed

```typescript
// Good
import type { Video } from '@/lib/mock-data';

// Avoid
import { Video } from '@/lib/mock-data'; // if only using as type
```

---

## React Patterns

### Components

- Use functional components with hooks (no class components)
- Memoize expensive renders with `memo()` (e.g., `VideoCard`)
- Use `useCallback` for functions passed as props
- Use `useRef` instead of `useState` for values that don't trigger re-renders

### Client vs Server

- Mark all components with browser APIs as `'use client'`
- Keep page-level components as server components when possible
- Only the main `page.tsx` is a client component (it uses hooks extensively)

### State Management

- Use local `useState` for component-level state
- Use React Context (`AuthProvider`) for app-wide state
- Avoid global state libraries unless necessary
- Never store sensitive data (API keys, tokens) in React state

---

## SSR Safety Rules

**Critical:** This app runs on Cloudflare Workers where `window`, `localStorage`, and `indexedDB` are undefined.

```typescript
// ALWAYS guard browser APIs
const isBrowser = typeof window !== 'undefined';
if (!isBrowser) return; // or use fallback

// GOOD: Checked before use
async function getData() {
  if (!isBrowser) return null;
  return localStorage.getItem('key');
}

// BAD: Will crash on SSR
async function getData() {
  return localStorage.getItem('key');
}
```

**Files with SSR guards:**
- `src/lib/cache.ts` — IndexedDB + localStorage fallback to in-memory Map
- `src/lib/api-quota.ts` — localStorage fallback to fresh state

---

## File Organization

### Adding New Features

```
src/
├── components/          # UI components
│   ├── feature-name/    # Group related components in a folder
│   └── ui/              # shadcn/ui components (don't modify)
├── hooks/               # Custom React hooks
│   └── use-feature.ts
├── lib/                 # Utility functions and services
│   └── feature.ts
├── config/              # Configuration files
│   └── feature.ts
├── contexts/            # React context providers
│   └── feature-context.tsx
└── app/api/             # API routes
    └── feature/
        └── route.ts
```

### Import Aliases

Use `@/` path alias (mapped to `src/`):

```typescript
// Good
import { cache } from '@/lib/cache';
import { useAuth } from '@/contexts/auth-context';

// Avoid
import { cache } from '../../../lib/cache';
```

---

## Styling Conventions

- **Tailwind CSS** for all styling (no inline styles, no CSS modules)
- Use shadcn/ui components as building blocks
- Follow the existing color scheme (red-600 for primary actions)
- Dark mode support is required (use `dark:` prefix)
- Use `cn()` utility from `@/lib/utils` for conditional classes

```typescript
// Good
import { cn } from '@/lib/utils';

<button className={cn(
  'rounded-full text-xs font-medium',
  isActive
    ? 'bg-red-600 text-white'
    : 'hover:bg-red-50'
)}>
```

---

## Error Handling

- **Never throw unhandled errors** in UI code
- **Always catch** async operations that can fail
- **Use toast notifications** for user-facing errors (`sonner`)
- **Silently degrade** for non-critical features (cache, history sync)

```typescript
// Good: Silent degradation
try {
  await saveToFirestore(data);
} catch {
  // Feature still works without Firestore
}

// Bad: Unhandled rejection
await saveToFirestore(data); // Crashes if offline
```

---

## Firebase Integration Rules

- Firebase SDK is **client-side only** — don't import in API routes
- Firebase Admin SDK is **server-side only** — don't import in components
- Firestore operations must check `user` is not null before proceeding
- Use the `useAuth()` hook, never access Firebase directly in components

```typescript
// Good: Through auth context
const { user } = useAuth();
if (user) {
  await saveWatchHistory(user.uid, video);
}

// Bad: Direct Firebase access in component
import { getAuth } from 'firebase/auth';
const auth = getAuth();
```

---

## Commit Guidelines

### Commit Message Format

```
<type>: <short description>

<detailed explanation if needed>
```

### Types

| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructuring (no feature change) |
| `style` | Formatting, whitespace (no logic change) |
| `chore` | Build, dependencies, config |

### Examples

```
feat: add NFL channel to RSS feed sources
fix: guard localStorage access for SSR safety
docs: add API endpoint documentation
refactor: simplify video classification logic
```

---

## Testing Before Pushing

1. **Build passes**: `npm run build` completes without errors
2. **No new lint errors**: `npm run lint` shows no new issues
3. **SSR safe**: No direct `localStorage` / `indexedDB` access without guards
4. **Feature isolated**: Only files related to the change are modified
5. **Backward compatible**: Existing features still work as before
