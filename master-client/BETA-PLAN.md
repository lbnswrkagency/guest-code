# Implementation Plan - Session 1: master-client Setup + Homepage

## What we're doing NOW

Create a new monorepo folder `master-client/` at the project root with:
1. **Next.js web app** (TypeScript, SCSS, App Router)
2. **React Native mobile app** (TypeScript, Expo)
3. **Shared packages** (design tokens, types)
4. Clean out all default/junk files from both
5. Build the **public homepage** (event listing feed) that fetches from the existing backend
6. Dark/light mode from the start
7. i18n with EN, DE, GR, ES
8. Follow the designer's layout for the event cards

## Designer Layout Reference
The homepage is a public event listing page:
- **Header**: "GuestCode" logo (Guest=white, Code=gold) + search icon + login icon
- **Genre filter chips**: horizontal scroll row (90s, Latin, Afrobeats, Amapiano, etc.)
- **Event cards** (vertical feed, full-width):
  - Large portrait flyer image (dominant, takes most of card space)
  - Date badge in top-right corner of flyer (gold background)
  - Event title (large, bold, white)
  - Subtitle/artist name (muted text)
  - Time range in gold accent (e.g., "23:00 - 05:00")
  - Location pin icon + venue name
  - Genre tag pills below
  - Divider
  - Brand logo + brand name at bottom of card
  - Subtle gold border/glow on the card
- **Next card peeks** from below (infinite scroll feed)
- Dark theme default

## Backend API to use
The existing server has a public events endpoint:
- `GET /api/events/public` → returns live public events (no auth required)
- `GET /api/events/public/featured` → featured events
- `GET /api/events/public/categories` → genre categories
- `GET /api/events/public/cities` → cities with events
- Server runs on Render at the existing URL (use `NEXT_PUBLIC_API_URL` env var)

## Steps

### Step 1: Create monorepo structure
```
master-client/
├── apps/
│   ├── web/          # Next.js 15 + TypeScript + SCSS
│   └── mobile/       # React Native + Expo + TypeScript
├── packages/
│   ├── shared/       # TypeScript types, API client
│   └── design-tokens/# Colors, spacing, typography
├── turbo.json
├── package.json      # Workspace root
└── .gitignore
```

### Step 2: Initialize Next.js app (apps/web)
- Next.js with App Router, TypeScript, SCSS modules
- Clean out all default boilerplate (welcome pages, default CSS, logos)
- Set up next-intl with EN/DE/GR/ES
- Set up dark/light mode with CSS variables + ThemeProvider
- Set up SCSS infrastructure (_variables, _media-queries)

### Step 3: Initialize React Native app (apps/mobile)
- Expo with TypeScript
- Clean out default boilerplate
- Basic App.tsx with navigation placeholder
- Dark/light theme setup with useColorScheme

### Step 4: Build the Homepage (web)
Following the designer's layout:
- Public page (no auth needed), SSR for SEO
- Fetch events from `GET /api/events/public`
- Genre filter chips (scrollable)
- Event card components with the exact layout from mockup
- Responsive: mobile-first, enhance for tablet/desktop
- All text wrapped in `t()` for i18n
- CSS variables for dark/light mode

### Step 5: Build basic Homepage (mobile)
- Same event listing concept in React Native
- Fetch from same API
- FlatList with event cards
- Basic but functional

### Step 6: Instructions for running both
- Document how to start web client
- Document how to start mobile client

## Key files to create

### Web (Next.js)
- `apps/web/app/[locale]/layout.tsx` - Root layout with theme + i18n
- `apps/web/app/[locale]/page.tsx` - Homepage (event listing)
- `apps/web/components/EventCard/EventCard.tsx` + `.module.scss`
- `apps/web/components/GenreFilter/GenreFilter.tsx` + `.module.scss`
- `apps/web/components/Header/Header.tsx` + `.module.scss`
- `apps/web/components/ThemeToggle/ThemeToggle.tsx`
- `apps/web/styles/_variables.scss`
- `apps/web/styles/_media-queries.scss`
- `apps/web/styles/globals.scss`
- `apps/web/lib/api.ts` - API client
- `apps/web/messages/en.json`, `de.json`, `gr.json`, `es.json`
- `apps/web/middleware.ts` - i18n routing

### Mobile (React Native)
- `apps/mobile/App.tsx`
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/components/EventCard.tsx`
- `apps/mobile/src/lib/api.ts`
- `apps/mobile/src/theme/tokens.ts`

## Verification
After implementation:
1. Start Next.js: `cd master-client/apps/web && npm run dev`
2. Start React Native: `cd master-client/apps/mobile && npx expo start`
3. Verify homepage loads events from backend
4. Verify dark/light mode toggle works
5. Verify language switching works (EN/DE/GR/ES)
6. Check responsive design on mobile/tablet/desktop viewports

---

---

## Development Workflow: Challenge & Refactor

**IMPORTANT**: When implementing features from the old React client (`guest-code/client/`) into the new Next.js/React Native apps, follow this process:

### Before Writing Any Code:
1. **Look at the old implementation** - Read the existing React component/feature
2. **Open a debate** - Challenge the current approach:
   - What works well that we should keep?
   - What's overcomplicated or messy?
   - What's missing (accessibility, performance, edge cases)?
   - What patterns are outdated?
3. **Propose improvements** - Suggest better approaches:
   - Modern React patterns (hooks, suspense, server components)
   - Better state management
   - Cleaner component structure
   - Improved UX/UI
   - Mobile-first considerations
4. **Discuss trade-offs** - Have a conversation about what to do
5. **Then implement** - Build the improved version

### This applies to:
- Navigation/routing
- Authentication flow
- Component architecture
- API integration patterns
- State management
- Styling approach
- Error handling
- Loading states
- Form handling
- Any feature migration

### The goal:
We're not just copying the old client - we're **refactoring and improving** as we go. Every feature is an opportunity to do it better.

---

## Current Status & Issues

### Completed
- All files created and code written
- Dependencies installed in both apps/web and apps/mobile
- Build verified from WSL (Next.js 15.5.12 compiles, TypeScript passes)

### Blocking Issues
1. **Next.js 14.0.3 still being resolved on Windows** — there's likely a stale `node_modules` in `guest-code/` (the parent project) that shadows the local Next.js 15
2. **Expo CLI not found on Windows** — `npx expo start` fails; may need `npm exec expo -- start` or direct binary path
3. **Web shows "Internal server error"** — expected if backend isn't running locally; `.env.local` points to `localhost:8080`
