# STAIRS UI Learning Path

This document outlines the curriculum for implementing the STAIRS Web UI. It is designed to be followed sequentially, helping you transition from a backend developer to a full-stack engineer using modern React and TypeScript.

---

## 🛠️ Phase 0: Environment Isolation

To keep your host system clean, choose one of the following two isolation strategies.

### Option A: Full Docker Isolation (The "Safe" Path)
This keeps all Node.js binaries and `node_modules` entirely inside a container.

1.  **Initialize the container:**
    ```bash
    # Run this from the root directory to bootstrap the project
    docker compose run --rm web-dev npm create vite@latest . -- --template react-ts
    ```
2.  **Start Development:**
    ```bash
    docker compose up web-dev
    ```
    *   *Access the UI at:* `http://localhost:5173`
    *   *Note:* The `node_modules` are stored in a Docker volume, so they won't clutter your project folder.

### Option B: Local Version Manager (The "Fast" Path)
This uses `nvm` to isolate Node.js to this specific project shell.

1.  **Install NVM:** [Follow the official guide](https://github.com/nvm-sh/nvm).
2.  **Setup Project:**
    ```bash
    cd services/web
    nvm install 20
    nvm use 20
    ```
3.  **Bootstrap:**
    ```bash
    npm create vite@latest . -- --template react-ts
    ```

---

## 🛠️ Project Resources
*   **[BLUEPRINTS.md](./BLUEPRINTS.md):** Refer to this file for as-built code patterns and reusable component templates.
*   **Design Tokens:** See `services/web/src/index.css` for the "Deep Space" theme variables.

---

## 📚 The Curriculum

### Phase 1: The Modern Foundation
*   **Goal:** Set up React + Vite + Tailwind CSS + Shadcn/ui.
*   **Key Learning:** Understanding the "assembly line" (PostCSS -> Tailwind -> CSS) and the importance of path aliases in large projects.
*   **Detailed Steps:**
    1.  **Tailwind v4 Setup:**
        *   Install: `npm install -D tailwindcss @tailwindcss/postcss postcss autoprefixer`
        *   PostCSS: Create `postcss.config.js` using `@tailwindcss/postcss`.
        *   CSS: Replace `index.css` content with `@import "tailwindcss";`.
    2.  **Path Aliases (Pre-Shadcn):**
        *   Update `tsconfig.json` and `tsconfig.app.json` with `baseUrl` and `@/*` paths.
        *   Update `vite.config.ts` with `resolve.alias` using `path.resolve`.
    3.  **Shadcn/ui Init:**
        *   Run: `npx shadcn@latest init`
        *   Settings: Radix (Library), Nova (Preset), Yes (Tailwind v4 compatibility).

---

## 🛠️ Troubleshooting & Nuances

### Import Alias Errors
If `shadcn init` fails with "No import alias found", ensure that `tsconfig.json` (the root one) contains the `paths` definition, as the CLI tool may not automatically resolve paths through `tsconfig.app.json`.

### TypeScript 6.0 Peer Dependencies
When installing tools like `openapi-typescript` on React 19/TS 6.0, you may see version conflicts. Use `--legacy-peer-deps` to bypass these checks for libraries that haven't officially tagged TS 6.0 support yet.

### Tailwind v4 vs v3
*   **v3:** Used `@tailwind base;` and `tailwind.config.js` for almost everything.
*   **v4:** Uses `@import "tailwindcss";` and shifts configuration toward CSS variables, though `tailwind.config.js` is still supported for complex themes.
### Phase 2: Type-Safe API Integration [DONE]
*   **Goal:** Generate TypeScript types from the FastAPI backend and set up data fetching.
*   **Key Learning:** Successfully bridged the gap between Python (FastAPI) and TypeScript (React) using `openapi-typescript` and `TanStack Query`.

### Phase 3: Component Engineering
*   **Goal:** Build reusable UI atoms and molecules.
*   **Key Learning:** Component composition, Props, and layout patterns (Grid/Flex).
*   **Detailed Steps:**
    1.  **Atomic Design:**
        *   Create `src/components/TargetCard.tsx`.
        *   Implement Props interface using the `Target` type from `src/lib/api`.
    2.  **Visual Polish:**
        *   Integrate `Lucide React` icons for visual cues.
        *   Use Tailwind grid layouts to display the catalog.
    3.  **Refactor App Structure:**
        *   Clean up `App.tsx` by moving state into specialized components.

    *   Implement `<ScoreBadge />`: Maps 0-100 scores to status colors.
    *   Implement `<TargetCard />`: Uses generated types to display target data.
    *   Implement `<AppLayout />`: A sidebar-based layout matching the `mockups/v2` sidebar.

### Phase 4: Data Visualization [DONE]
*   **Goal:** Render astronomical charts.
*   **Key Learning:** Mastered time-series visualization using `Recharts` and implementing "Smart Components" that fetch their own supplemental data.

### Phase 5: Dynamic Context & Global State
*   **Goal:** Synchronize user settings (Location/Telescope) across the entire application.
*   **Key Learning:** React Context API vs Prop Drilling, and synchronizing state with LocalStorage.
*   **Detailed Steps:**
    1.  **Context Creation:**
        *   Create `src/context/SettingsContext.tsx` to hold the current location coordinates and telescope profile name.
        *   Implement a "Provider" to wrap the application in `main.tsx`.
    2.  **Dynamic Hooks:**
        *   Refactor `useTargetPosition` to pull coordinates from the Context instead of hardcoded strings.
    3.  **Persistence:**
        *   Learn how to save user preferences to the browser's `LocalStorage` so they persist after a refresh.

---

## 📖 Reference Material

*   **Mockups:** `mockups/v2/` (Focus on `index.html` and `shared/STYLE_GUIDE.md`)
*   **API Specs:** [http://localhost:8000/docs](http://localhost:8000/docs) (Once API is running)
*   **Design Tokens:** See `WEB_UI_MOCKUPS.md` for specific hex codes.
