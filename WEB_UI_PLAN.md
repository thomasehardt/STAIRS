# STAIRS Web UI Plan

## Overview

A modern web frontend for STAIRS (Astro Imaging Run Scheduler), built as a single-page application (SPA) that consumes the existing FastAPI backend. The UI targets astrophotography enthusiasts using smart telescopes (Seestar S50, Dwarf II, etc.).

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | **React 18+** with **Vite** | Fast dev server, excellent ecosystem |
| Language | **TypeScript** | Type safety matching the Pydantic backend |
| UI Library | **Shadcn/ui** + **Tailwind CSS** | Clean, accessible components; dark mode friendly (astro theme) |
| State Management | **TanStack Query (React Query)** | Perfect for API data fetching/caching |
| HTTP Client | **httpx** (Python-style) → **axios** or **fetch** | Simple API calls |
| Charts/Visualization | **Recharts** or **Plotly.js** | Altitude charts, sky quality graphs |
| Astronomy Rendering | **D3.js** or **PixiJS** | Overhead sky view, target positioning |
| Build Output | Static files served by FastAPI | Keep deployment simple (single container) |

## Architecture

```
services/
├── api/              # Existing FastAPI backend (unchanged)
└── web/              # New React SPA
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── pages/        # Route-level page components
    │   ├── hooks/        # Custom React hooks (useQuery wrappers)
    │   ├── lib/          # API client, utilities
    │   └── types/        # TypeScript types generated from Pydantic models
    ├── public/
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.ts
```

The web SPA is served as static files by the FastAPI backend in production (or via Vite dev server in development with proxy to API).

---

## Core Features & Pages

### 1. Dashboard (`/`)
**Purpose:** Quick status overview and launch pad for common actions.

- Current location and weather summary
- Tonight's imaging window (astronomical night start/end)
- Top recommended targets for tonight
- Recent observation logs

**API endpoints used:**
- `GET /system/` - Health check
- `GET /weather/?lat=&lon=&timestamp=` - Current weather
- `GET /plan/forecast?days=1` - Tonight's forecast
- `GET /logs/` - Recent logs

---

### 2. Plan Generator (`/plan`)
**Purpose:** Generate and review a single-night observation plan.

**Inputs:**
- Location (dropdown from saved locations + manual lat/lon override)
- Telescope profile (dropdown from `/profiles/`)
- Start time (date picker, defaults to now)
- Minimum altitude slider (default 30°)

**Outputs:**
- Timeline view: chronological observation blocks with target name, start/end times, scores
- Recommendations list: scored targets not in timeline
- Export buttons: CSV and SkySafari .skylist

**UI Components:**
- `LocationPicker` - Dropdown + manual input
- `ProfileSelector` - Telescope profile cards
- `TimelineView` - Visual timeline with blocks colored by score
- `TargetCard` - Target with OSS/SQS scores, magnitude, size
- `ExportButton` - Dropdown for CSV/SkySafari

**API endpoints used:**
- `POST /plan/generate`
- `POST /plan/export/csv`
- `POST /plan/export/skylist`
- `GET /locations/`
- `GET /profiles/`

---

### 3. Multi-Night Forecast (`/forecast`)
**Purpose:** View imaging quality forecast across multiple nights.

**Inputs:**
- Location
- Number of days (slider: 1-30)
- Start date (optional)

**Outputs:**
- Day cards with: date, night hours, overall quality score, weather score, notes
- Color-coded grid (green=good, yellow=ok, red=poor)
- "Absolute" vs "Relative" quality toggle

**UI Components:**
- `ForecastGrid` - Responsive card grid
- `QualityBadge` - Colored badge (excellent/good/fair/poor)
- `WeatherSparkline` - Mini chart of cloud cover/humidity

**API endpoints used:**
- `GET /plan/forecast`

---

### 4. Target Catalog Browser (`/catalogs`)
**Purpose:** Browse and search deep-sky objects.

**Features:**
- Catalog tabs: Messier, NGC, IC, Caldwell
- Search bar (searches name, identifier, constellation)
- Filter by: type (galaxy, nebula, cluster), magnitude range, constellation
- Target cards with: name, type, magnitude, size, constellation
- Click to view detail

**UI Components:**
- `CatalogTabs` - Tabbed interface
- `SearchBar` - Instant search with debounce
- `TargetGrid` - Responsive card grid
- `TargetFilters` - Type, magnitude, constellation filters

**API endpoints used:**
- `GET /catalogs/`
- `GET /targets/search?q=`
- `GET /targets/{target_id}?profile_name=`

---

### 5. Target Detail (`/targets/:id`)
**Purpose:** Deep dive into a specific target.

**Sections:**
- **Overview:** Name, type, magnitude, size, constellation, coordinates
- **FOV Fit:** Visual indicator of how target fits in selected telescope
- **Tonight's Pass:** Altitude chart over time (from `/targets/{id}/position`)
- **Quality Series:** SQS score over time (from `/plan/target-series`)
- **Observation History:** Past logs for this target
- **Add to Plan:** Quick action to include in tonight's plan

**UI Components:**
- `AltitudeChart` - Recharts line chart (time vs altitude)
- `ScoreChart` - Recharts line chart (time vs SQS score)
- `FovIndicator` - Visual representation of target vs telescope FOV
- `LogTimeline` - Past observation logs

**API endpoints used:**
- `GET /targets/{target_id}`
- `GET /targets/{target_id}/position?lat=&lon=&start_time=&hours=`
- `GET /plan/target-series?target_id=&location_name=&telescope_profile_name=`
- `GET /logs/target/{target_id}`

---

### 6. Observation Logs (`/logs`)
**Purpose:** Track and review observation history.

**Features:**
- Chronological log list (newest first)
- Filter by: target, date range, rating
- Create new log: select target, date, rating (1-5), status, notes
- Edit/delete existing logs
- Summary stats: total sessions, favorite targets, average rating

**UI Components:**
- `LogCard` - Compact log entry with target, date, rating stars, status badge
- `LogForm` - Modal or drawer for creating/editing logs
- `RatingStars` - Interactive star rating input
- `StatusBadge` - Colored badge (captured, attempted, planned)

**API endpoints used:**
- `GET /logs/`
- `POST /logs/`
- `DELETE /logs/{log_id}`

---

### 7. Locations & Settings (`/settings`)
**Purpose:** Manage observation locations and application settings.

**Sections:**
- **Locations:** List saved locations, add/edit/delete, set default
- **Telescope Profiles:** View profiles (read-only, managed via JSON files)
- **Planning Settings:** Bortle scale, min altitude, weather thresholds
- **Integrations:** Weather API status

**UI Components:**
- `LocationForm` - Add/edit location with timezone auto-detect
- `ProfileCard` - Read-only telescope profile display
- `SettingsForm` - Editable planning settings

**API endpoints used:**
- `GET /locations/`
- `GET /settings/`
- `PATCH /settings/`
- `GET /profiles/`

---

## Component Library & Design System

### Theme
- **Dark mode first** (astronomy apps are used at night)
- Color palette: Deep space blues, dark grays, accent colors for scores
- Font: Inter or system sans-serif

### Score Color Coding
| Score Range | Color | Label |
|------------|-------|-------|
| 80-100 | Green | Excellent |
| 60-79 | Light Green | Good |
| 40-59 | Yellow | Fair |
| 20-39 | Orange | Poor |
| 0-19 | Red | Very Poor |

### Key Reusable Components
- `<ScoreBadge />` - Colored badge showing OSS/SQS scores
- `<TargetCard />` - Consistent target display across pages
- `<AltitudeChart />` - Reusable altitude/time chart
- `<LocationPicker />` - Dropdown with saved locations
- `<ProfileSelector />` - Telescope profile selection
- `<RatingStars />` - Interactive star rating
- `<StatusBadge />` - Observation status indicator

---

## API Integration

### TypeScript Types Generation
Generate types from Pydantic models:
```bash
# Use openapi-typescript or similar
curl http://localhost:8000/openapi.json | openapi-typescript > src/types/api.ts
```

### API Client (`src/lib/api.ts`)
```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = {
  get: (path: string) => fetch(`${API_BASE}${path}`),
  post: (path: string, body: any) => fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  // ...delete, patch, etc.
};
```

### React Query Hooks (`src/hooks/`)
```typescript
export function useCatalogs() {
  return useQuery({ queryKey: ['catalogs'], queryFn: () => api.get('/catalogs/') });
}

export function useGeneratePlan(request: PlanRequest) {
  return useMutation({ mutationFn: (req) => api.post('/plan/generate', req) });
}
// ... more hooks
```

---

## Future Considerations (v2+)

### Interactive Sky Map (`/sky`)
- Overhead sky view showing all visible targets
- Targets positioned by altitude/azimuth in real-time
- Click target to view details
- Time slider to see target movement
- Horizon line and astronomical night window overlay

### Simulated Viewport
- Show how target appears in telescope's FOV
- Overlay target size vs sensor size
- Simulate exposure result (basic)

### Mobile Responsive
- PWA (Progressive Web App) support
- Install on phone/tablet for field use
- Touch-friendly controls

### Real-time Updates
- WebSocket connection for long-running operations
- Live weather updates during observation session

---

## Development Workflow

### Phase 1: Foundation (Week 1-2)
- [ ] Set up React + Vite + TypeScript project in `services/web/`
- [ ] Configure Tailwind CSS + Shadcn/ui
- [ ] Generate TypeScript types from OpenAPI spec
- [ ] Build API client and React Query hooks
- [ ] Implement dark theme and base layout (sidebar, header)

### Phase 2: Core Pages (Week 3-4)
- [ ] Dashboard page
- [ ] Plan Generator page with timeline view
- [ ] Target Catalog Browser with search/filter
- [ ] Target Detail page with altitude chart

### Phase 3: Secondary Features (Week 5-6)
- [ ] Multi-Night Forecast page
- [ ] Observation Logs page with CRUD
- [ ] Locations & Settings page

### Phase 4: Polish & Deploy (Week 7-8)
- [ ] Integrate FastAPI static file serving
- [ ] Update Docker Compose for web service
- [ ] Responsive design pass
- [ ] Error handling and loading states
- [ ] E2E tests with Playwright

---

## Deployment

### Development
```bash
# Terminal 1: API
cd services/api && uvicorn src.api.main:app --reload

# Terminal 2: Web
cd services/web && npm run dev
```

### Production
```bash
# Build web static files
cd services/web && npm run build

# API serves the static files
# Update main.py to mount StaticFiles
app.mount("/", StaticFiles(directory="services/web/dist"), name="web")
```

### Docker
Update `docker-compose.yaml` to build the web service (or build static files into API image).

---

## Success Metrics

- All API endpoints accessible through the UI
- Plan generation completes in < 3 seconds (matching API performance)
- Mobile-responsive for field use
- Dark mode readability under red light (astronomer's friend)
