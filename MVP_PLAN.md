# STAIRS MVP Execution Plan

## 1. MVP Definition & Scope

The MVP for STAIRS focuses entirely on the "Core Loop": configuring the observation environment, viewing tonight's conditions, and generating an actionable imaging plan.

**Included in MVP (The Core Loop):**

- **Settings/Setup:** Backend-synced configuration for observer locations and telescope selection.
- **Dashboard:** At-a-glance view of current location, weather, and top targets for tonight.
- **Plan Generator:** The core tool to generate a chronological target timeline for a single night.

**Deferred to Post-MVP (Phase 2):**

- Full Catalog Browser (search/filter deep sky objects manually).
- Deep-dive Target Details (altitude charts, FOV overlays).
- Multi-Night Forecast engine.
- Observation Logs (session tracking).

---

## 2. Technical Architecture & Strategy

- **Source of Truth:** The backend `config.yaml` is the ultimate source of truth. We will replace any frontend `localStorage` hacks with strict React Query syncs to `GET /settings/` and `PATCH /settings/`.
- **UI Framework:** React 19 + Vite (already scaffolded).
- **Styling:** Tailwind CSS v4 + Shadcn UI (already scaffolded).
- **State Management:** TanStack React Query for all API interactions. A React Context will be used to wrap the settings for easy access across components.

---

## 3. Execution Phases

### Phase 1: Configuration & Settings Sync

_Goal: Ensure the application knows "where" and "what" it is planning for._

- [ ] **API Integration:** Create React Query hooks for `GET /settings/` and `PATCH /settings/`.
- [ ] **Context Overhaul:** Rewrite `SettingsContext` to read from the query and expose a `syncConfig` method instead of `localStorage`.
- [ ] **Locations UI:**
  - List saved locations.
  - Add/Edit location modal (Name, Lat, Lon, Elev, Bortle).
  - "Set as Default" toggle.
  - _Bonus:_ "Use Browser Location" helper button.
- [ ] **Telescope UI:**
  - Read-only list of available profiles from `GET /profiles/`.
  - Allow user to click to set one as the `default_telescope` in the config.
- [ ] **Constraints UI:**
  - Sliders for Minimum/Maximum Altitude.

### Phase 2: The Dashboard

_Goal: Provide immediate, actionable context upon opening the app._

- [ ] **Environment Context:** Display the active default location and telescope profile.
- [ ] **Weather Integration:**
  - Create `useWeather(lat, lon)` hook calling `GET /weather/`.
  - Build simple widgets for Clouds, Humidity, Temperature, and Seeing.
  - Handle fallback states if weather provider is disabled.
- [ ] **Tonight's Highlights:**
  - Leverage the planner engine (`POST /plan/generate`) in the background to fetch just the `recommendations` list for the dashboard.
  - Display top 3-6 targets using a reusable `TargetCard` component.

### Phase 3: The Plan Generator (The Core Engine)

_Goal: Expose the core algorithm to the user in a readable timeline format._

- [ ] **Planning UI Layout:**
  - Left column: Parameter confirmation (Location, Profile, Start Time, Min Altitude).
  - Right column: The generated timeline.
- [ ] **API Integration:** Create `useGeneratePlan` mutation for `POST /plan/generate`.
- [ ] **Timeline View:**
  - Render `ObservationBlock` items chronologically.
  - Display start/end times, Target Name, and OSS/Final Scores.
  - Use color-coding (e.g., green for >80 score) to highlight prime targets.
- [ ] **Export Actions:**
  - Wire up buttons for `POST /plan/export/csv` and `POST /plan/export/skylist`.
  - Handle browser file downloads from the returned blobs.

### Phase 4: Polish & Validation

_Goal: Ensure the application feels like a complete product, even with a limited scope._

- [ ] **Loading States:** Implement skeleton loaders for weather, targets, and the planning engine to prevent UI jumping.
- [ ] **Error Handling:** Graceful fallbacks if the API is offline or if a telescope profile is deleted from the file system.
- [ ] **Responsive Check:** Ensure the dashboard grids and settings modals are usable on a tablet/mobile view for field usage.

---

## 4. API Endpoint Dependencies (MVP)

| Endpoint               | Method    | Purpose                                                        |
| ---------------------- | --------- | -------------------------------------------------------------- |
| `/settings/`           | GET/PATCH | Load/Sync user config (locations, default scope, constraints). |
| `/profiles/`           | GET       | List available telescope hardware profiles.                    |
| `/weather/`            | GET       | Fetch live weather metrics for the dashboard.                  |
| `/plan/generate`       | POST      | Generate the timeline and target recommendations.              |
| `/plan/export/csv`     | POST      | Download timeline as CSV.                                      |
| `/plan/export/skylist` | POST      | Download timeline for SkySafari.                               |

---

## 5. Dashboard Enhancements (Phase 2b)

**Objective:** Enhance the Sky Dashboard to prominently display the current or next "dark time" window, intelligently recommend top targets based on dynamic sky conditions, and visualize the overall sky quality (Weather + Moon) for the night in a new time graph.

### Implementation Details:

- **API: New Lightweight Recommendations:** Implement `POST /targets/recommend` to return ranked targets without the heavy chronological timeline building.
- **API: New Quality Series:** Implement `GET /planner/quality-series` to provide 10-minute interval data for a Sky Quality Score (Weather + Moon).
- **UI: Dark Time Logic:**
  - If current time is within astronomical night: Label as "Current Dark Time" (Start: Now, End: Night End).
  - If current time is before astronomical night: Label as "Next Dark Time" (Start: Night Start, End: Night End).
- **UI: Scoring Visibility:** Target cards will display both "Absolute Score" (intrinsic suitability) and "Relative Score" (current sky quality/position).
- **UI: Sky Quality Graph:** A new line chart visualizing the night's imaging potential (0-100 score) over time.
