---
phase: 02
plan: 03
subsystem: auth
tags: [login, logout, session, lockout]
dependency-graph:
  requires: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
  provides: [login-page, logout-api, auth-flow]
  affects: [header, layout]
tech-stack:
  added: []
  patterns: [conditional-layout, route-groups-alternative]
key-files:
  created:
    - src/app/api/auth/login/route.ts
    - src/app/api/auth/logout/route.ts
    - src/app/login/page.tsx
    - src/app/login/layout.tsx
    - src/components/app-shell.tsx
    - src/components/layout-wrapper.tsx
  modified:
    - src/app/layout.tsx
    - src/components/header.tsx
decisions:
  - Used LayoutWrapper pattern instead of route groups to minimize changes
  - Login page renders without sidebar/header chrome
  - Generic error messages for security (no username enumeration)
metrics:
  duration: 4m 18s
  completed: 2026-02-23T03:33:09Z
---

# Phase 02 Plan 03: Login/Logout Summary

JWT-less session authentication with argon2 token verification and 15-minute lockout protection.

## Implementation Details

### Login API (`/api/auth/login`)

- POST endpoint validates admin token against stored hash
- Uses argon2 timing-safe verification from `token.ts`
- 15-minute lockout after 5 failed attempts via `lockout.ts`
- Generic error messages only ("Invalid credentials")
- Creates 24-hour sliding window session via iron-session

### Logout API (`/api/auth/logout`)

- POST endpoint destroys session
- Resets session to default unauthenticated state
- Returns success even on errors for reliability

### Login Page (`/login`)

- Clean page without sidebar/header chrome
- Token input with show/hide toggle
- Loading state during authentication
- Error display for failed attempts
- Redirects to dashboard on success

### Layout Architecture

Created `LayoutWrapper` component that conditionally renders `AppShell`:
- Public routes (`/login`, `/setup`) render without dashboard chrome
- All other routes get full AppShell with sidebar/header
- Pattern chosen over route groups to minimize file restructuring

### Logout Button

Added to header with:
- LogOut icon from lucide-react
- Red hover state for visual distinction
- Disabled state during logout
- Navigates to `/login` and refreshes router

## Commits

| Hash | Message |
|------|---------|
| 0374784 | feat(02-03): add login API route with lockout protection |
| 7cb3b06 | feat(02-03): add logout API route |
| b45c971 | feat(02-03): add login page with conditional layout |
| 64a2b90 | feat(02-03): add logout button to header |

## Deviations from Plan

None - plan executed as specified.

## Self-Check: PASSED

- [x] src/app/api/auth/login/route.ts exists
- [x] src/app/api/auth/logout/route.ts exists
- [x] src/app/login/page.tsx exists
- [x] src/components/layout-wrapper.tsx exists
- [x] src/components/app-shell.tsx exists
- [x] Commit 0374784 exists
- [x] Commit 7cb3b06 exists
- [x] Commit b45c971 exists
- [x] Commit 64a2b90 exists
