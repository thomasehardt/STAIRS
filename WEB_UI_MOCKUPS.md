# STAIRS Web UI Mockups

## Color Palette & Design Tokens

```
Background:    #0a0e1a (deep space blue)
Surface:        #111827 (dark gray)
Surface Hover:  #1f2937
Primary:        #3b82f6 (blue)
Primary Hover:  #2563eb
Success:        #22c55e (green)
Warning:        #eab308 (yellow)
Danger:         #ef4444 (red)
Text Primary:   #f9fafb
Text Secondary: #9ca3af
Border:         #374151
```

---

## 1. Dashboard (`/`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰ STAIRS                    Dashboard                    🔔  ⚙️  👤   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │   📍 Location    │  │  🌙 Tonight     │  │  ☁️  Weather     │      │
│  │                  │  │                  │  │                  │      │
│  │  Tromso, Norway  │  │  Night Starts   │  │  Clouds: 20%    │      │
│  │  69.65°N 18.95°E│  │  18:42 (UTC+1) │  │  Humidity: 45%  │      │
│  │  Bortle: 3       │  │  Night Ends     │  │  Seeing: 1.8"   │      │
│  │                  │  │  05:18 (UTC+1) │  │  Temp: -5°C      │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  ⭐ Tonight's Top Targets                           [View All →]  │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │  │
│  │  │  M42         │  │  M31         │  │  M45         │              │  │
│  │  │  Orion Neb   │  │  Andromeda   │  │  Pleiades   │              │  │
│  │  │              │  │              │  │              │              │  │
│  │  │  ★★★★☆ 82   │  │  ★★★★☆ 78   │  │  ★★★☆☆ 65   │              │  │
│  │  │  Mag: 4.0    │  │  Mag: 3.4    │  │  Mag: 1.6    │              │  │
│  │  │  Size: 65'   │  │  Size: 190'  │  │  Size: 110'  │              │  │
│  │  │              │  │              │  │              │              │  │
│  │  │  [+ Add]     │  │  [+ Add]     │  │  [+ Add]     │              │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  📝 Recent Observation Logs                                        │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  2026-01-15  M42 Orion Nebula      ⭐⭐⭐⭐☆  captured           │  │
│  │  2026-01-12  M31 Andromeda         ⭐⭐⭐☆☆  captured           │  │
│  │  2026-01-10  M45 Pleiades          ⭐⭐⭐⭐⭐  captured           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Elements:

- **Header:** Logo, nav links, notification bell, settings gear, user avatar
- **Location Card:** Current observing location with coordinates and Bortle scale
- **Tonight Card:** Astronomical night window calculated from API
- **Weather Card:** Current conditions from Open-Meteo
- **Top Targets:** Horizontal scrollable cards with quick-add buttons
- **Recent Logs:** Quick list with rating stars and status badges

---

## 2. Plan Generator (`/plan`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰ STAIRS          Plan Generator                        🔔  ⚙️  👤   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  📍 Location & Telescope                                            │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  Location: [Tromso, Norway                    ▼]                   │  │
│  │  Or: Lat: [69.65] Lon: [18.95] Elev: [100m] Bortle: [3▼]     │  │
│  │                                                                     │  │
│  │  Telescope: [Seestar S50                    ▼]                    │  │
│  │                                                                     │  │
│  │  Start Time: [2026-01-15T18:00    📅]  Min Alt: [30° ▼]        │  │
│  │                                                                     │  │
│  │  [ 🚀 Generate Plan ]                                                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │  📋 Timeline              │  │  ⭐ Recommendations                 │  │
│  │                          │  │                                    │  │
│  │  18:42 ────────────────  │  │  M31 Andromeda      ★★★★☆ 78    │  │
│  │    M42 Orion Nebula      │  │  Size: 190'  Mag: 3.4            │  │
│  │    Alt: 42°  Score: 82  │  │  [+ Add to plan]                 │  │
│  │    [△] [□] [✎] [✘]    │  │                                    │  │
│  │                          │  │  M45 Pleiades       ★★★☆☆ 65    │  │
│  │  20:15 ────────────────  │  │  Size: 110'  Mag: 1.6            │  │
│  │    M31 Andromeda         │  │  [+ Add to plan]                 │  │
│  │    Alt: 55°  Score: 78  │  │                                    │  │
│  │    [△] [□] [✎] [✘]    │  │  NGC 281 Pacman      ★★☆☆☆ 42  │  │
│  │                          │  │  Size: 35'  Mag: 7.3             │  │
│  │  21:30 ────────────────  │  │  [+ Add to plan]                 │  │
│  │    M45 Pleiades          │  │                                    │  │
│  │    Alt: 68°  Score: 65  │  │                                    │  │
│  │    [△] [□] [✎] [✘]    │  │                                    │  │
│  │                          │  │                                    │  │
│  │  22:45 ────────────────  │  │                                    │  │
│  │    M42 Orion Nebula      │  │                                    │  │
│  │    Alt: 61°  Score: 79  │  │                                    │  │
│  │    [△] [□] [✎] [✘]    │  │                                    │  │
│  │                          │  │                                    │  │
│  │  [Export CSV] [Export SkySafari]                                  │  │
│  └────────────────────────────┘  └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Elements:

- **Location & Telescope Panel:** Dropdowns with saved locations/profiles, manual override inputs
- **Timeline View:** Chronological blocks with target name, altitude, score
- **Block Actions:** Reorder (△), View (□), Edit (✎), Remove (✘)
- **Recommendations Panel:** Scored targets not yet in timeline
- **Export Buttons:** CSV and SkySafari format downloads

---

## 3. Multi-Night Forecast (`/forecast`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰ STAIRS          Forecast                              🔔  ⚙️  👤   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Location: [Tromso, Norway          ▼]  Days: [14 ▼]  Start: [2026-01-15 📅] │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Night Quality Overview (Jan 15 - Jan 28)                          │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  Jan 15  🌙  Night: 6.5h  ☁️ 20%  💧45%  ★★★★☆ 82  [Details] │  │
│  │  ────────────────────────────────────────────────────●──────       │  │
│  │                                                                     │  │
│  │  Jan 16  🌙  Night: 6.7h  ☁️ 45%  💧60%  ★★★☆☆ 68  [Details] │  │
│  │  ──────────────────────────────────────────●──────────             │  │
│  │                                                                     │  │
│  │  Jan 17  🌙  Night: 6.9h  ☁️ 80%  💧75%  ★★☆☆☆ 42  [Details] │  │
│  │  ─────────────────────────────────●─────────────────             │  │
│  │                                                                     │  │
│  │  Jan 18  🌙  Night: 7.1h  ☁️ 15%  💧40%  ★★★★☆ 88  [Details] │  │
│  │  ────────────────────────────────────────────────●───             │  │
│  │                                                                     │  │
│  │  Jan 19  🌙  Night: 7.3h  ☁️ 10%  💧35%  ★★★★★ 95  [Details] │  │
│  │  ────────────────────────────────────────────────────●              │  │
│  │                                                                     │  │
│  │  ... (more days)                                                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Legend: ★★★★★ 90-100  ★★★★☆ 70-89  ★★★☆☆ 50-69  ★★☆☆☆ 30-49     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Elements:

- **Filter Bar:** Location, days range, start date
- **Day Cards:** Date, night hours, weather metrics, quality score badge
- **Quality Bar:** Visual indicator of relative quality across the period
- **Color Coding:** Green (excellent), Yellow (fair), Red (poor)

---

## 4. Target Catalog Browser (`/catalogs`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰ STAIRS          Catalogs                              🔔  ⚙️  👤   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Search targets...                                    ]                │
│                                                                             │
│  [Messier] [NGC] [IC] [Caldwell]                                          │
│                                                                             │
│  Filters:  Type: [All ▼]  Mag: [All ▼]  Const: [All ▼]  [Reset]        │
│                                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  M42     │ │  M31     │ │  M45     │ │  M13     │ │  M51     │           │
│  │  Orion   │ │  Andromeda│ │  Pleiades│ │  Hercules│ │  Whirl-  │           │
│  │  Nebula  │ │  Galaxy  │ │  Cluster │ │  Cluster │ │  pool    │           │
│  │          │ │          │ │          │ │          │ │  Galaxy  │           │
│  │  ★★★★☆   │ │  ★★★★☆   │ │  ★★★★★   │ │  ★★★☆☆   │ │  ★★★☆☆   │           │
│  │  Mag: 4.0│ │  Mag: 3.4│ │  Mag: 1.6│ │  Mag: 5.8│ │  Mag: 8.4│           │
│  │  Size:65' │ │  Size:190'│ │  Size:110'│ │  Size:20' │ │  Size:25' │           │
│  │  [View →] │ │  [View →] │ │  [View →] │ │  [View →] │ │  [View →] │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  M1      │ │  M8      │ │  M27     │ │  M57     │ │  M81     │           │
│  │  Crab    │ │  Lagoon  │ │  Dumbbell│ │  Ring    │ │  Bode's  │           │
│  │  Nebula  │ │  Nebula  │ │  Nebula  │ │  Nebula  │ │  Galaxy  │           │
│  │          │ │          │ │          │ │          │ │          │           │
│  │  ★★☆☆☆   │ │  ★★★☆☆   │ │  ★★★☆☆   │ │  ★★★★☆   │ │  ★★★☆☆   │           │
│  │  Mag: 8.4│ │  Mag: 6.0│ │  Mag: 7.5│ │  Mag: 8.8│ │  Mag: 6.9│           │
│  │  Size:6'  │ │  Size:90'│ │  Size:8' │ │  Size:1' │ │  Size:27' │           │
│  │  [View →] │ │  [View →] │ │  [View →] │ │  [View →] │ │  [View →] │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                                             │
│  [< Prev]  Page 1 of 12  [Next >]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Elements:

- **Search Bar:** Instant search with debounce
- **Catalog Tabs:** Quick switch between Messier, NGC, IC, Caldwell
- **Filters:** Type, magnitude range, constellation dropdowns
- **Target Grid:** Responsive card layout with key info and quick-view button
- **Pagination:** Standard prev/next with page numbers

---

## 5. Target Detail (`/targets/M42`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰ STAIRS          M42 - Orion Nebula                    🔔  ⚙️  👤   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  M42 - Orion Nebula                                                │  │
│  │  Emission Nebula  |  Mag: 4.0  |  Size: 65' × 60'  |  Orion     │  │
│  │  RA: 83.8221°  Dec: -5.3911°                                    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────────────────────┐  │
│  │  🔭 FOV Fit      │  │  📈 Altitude Tonight                       │  │
│  │                  │  │                                            │  │
│  │  Seestar S50     │  │    70 ┼                                    │  │
│  │                  │  │    60 ┤  ╱╲                               │  │
│  │  Target: 65'×60'│  │    50 ┤ ╱  ╲     ╱╲                     │  │
│  │  Sensor: 1.7°×1.0°│  │    40 ┤╱    ╲   ╱  ╲   ╱╲               │  │
│  │                  │  │    30 ┤    ╲ ╱    ╱  ╲ ╱  ╲              │  │
│  │  ✅ Fits!        │  │    20 ┤     ╲╱____╱____╲╱____╲             │  │
│  │  (2.6× fill)    │  │       └─────────────────────────────> Time  │  │
│  │                  │  │       18:00  20:00  22:00  00:00  02:00    │  │
│  │                  │  │                                            │  │
│  │  [Change Scope]  │  │                                            │  │
│  └──────────────────┘  └──────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  📊 Quality Score Over Time (SQS)                                   │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │                                   90 ┼                              │  │
│  │     Weather: 100%  Moon: 85%      80 ┤  ╱╲                       │  │
│  │     Final: 82                    70 ┤ ╱  ╲                      │  │
│  │                                   60 ┤╱    ╲  ╱╲                 │  │
│  │                                   50 ┤      ╲╱  ╲  ╱╲             │  │
│  │                                   40 ┤          ╲╱  ╲            │  │
│  │                                      └─────────────────> Time      │  │
│  │                                      18:00  20:00  22:00  00:00   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  📝 Observation History                [+ Add Log Entry]            │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  2026-01-15  ⭐⭐⭐⭐☆  82  captured    "Great run, saw detail!"   │  │
│  │  2026-01-10  ⭐⭐⭐☆☆  65  attempted   "Clouds rolled in"          │  │
│  │  2026-01-05  ⭐⭐⭐⭐⭐  95  captured    "Perfect conditions!"      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [+ Add to Tonight's Plan]  [📌 Save to Favorites]                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Elements:

- **Header:** Target name, type, magnitude, size, constellation, coordinates
- **FOV Fit Panel:** Visual indicator of how target fits in telescope view
- **Altitude Chart:** Recharts line chart showing target altitude over time
- **Quality Score Chart:** SQS breakdown (weather, moon, altitude factors)
- **Observation History:** Past logs with ratings and notes
- **Action Buttons:** Add to plan, save to favorites

---

## 6. Observation Logs (`/logs`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰ STAIRS          Observation Logs                      🔔  ⚙️  👤   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filters:  Target: [All ▼]  Date: [All Time ▼]  Rating: [All ▼]        │
│                                                                             │
│  [+ New Log Entry]                                                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  2026-01-15  M42 Orion Nebula                                     │  │
│  │  ⭐⭐⭐⭐☆  Rating: 4/5  Status: captured                         │  │
│  │  "Great run tonight. Managed 30min integration. Orion Nebula          │  │
│  │  showed great detail in the spiral arms."                            │  │
│  │  [✎ Edit] [🗑️ Delete]                                            │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  2026-01-12  M31 Andromeda Galaxy                                  │  │
│  │  ⭐⭐⭐☆☆  Rating: 3/5  Status: captured                         │  │
│  │  "Andromeda is getting lower. Only got 20min before it dipped       │  │
│  │  below 30° altitude."                                               │  │
│  │  [✎ Edit] [🗑️ Delete]                                            │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  2026-01-10  M45 Pleiades                                          │  │
│  │  ⭐⭐⭐⭐⭐  Rating: 5/5  Status: captured                         │  │
│  │  "Perfect night! Bortle 3 sky, no wind. Pleiades looked stunning    │  │
│  │  with the Seestar. 45min integration."                              │  │
│  │  [✎ Edit] [🗑️ Delete]                                            │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  2026-01-08  NGC 281 Pacman Nebula                                 │  │
│  │  ⭐⭐☆☆☆  Rating: 2/5  Status: attempted                         │  │
│  │  "Too low on the horizon. Atmospheric extinction was terrible.       │  │
│  │  Will try again when it's higher."                                  │  │
│  │  [✎ Edit] [🗑️ Delete]                                            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [< Prev]  Page 1 of 5  [Next >]                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New Log Entry Modal:

```
┌──────────────────────────────────────────────────────────────────────┐
│  + New Observation Log                                    [✕]    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                │
│  Target: [M42 Orion Nebula               ▼]                       │
│                                                                │
│  Date: [2026-01-15 📅]                                       │
│                                                                │
│  Rating:  ⭐⭐⭐⭐☆  (4/5)                                      │
│          [⭐] [⭐] [⭐] [⭐] [☆]                               │
│                                                                │
│  Status: [captured ▼]                                          │
│          (captured / attempted / planned)                        │
│                                                                │
│  Notes:                                                         │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Great run tonight. Managed 30min integration...          │    │
│  │                                                          │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                │
│  [Cancel]  [Save Log Entry]                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. Settings (`/settings`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰ STAIRS          Settings                               🔔  ⚙️  👤   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  📍 Saved Locations                                                 │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  Tromso, Norway                                  [Edit] [Delete]  │  │
│  │  69.65°N, 18.95°E  |  Elev: 100m  |  Bortle: 3  |  Default ✅ │  │
│  │                                                                     │  │
│  │  Los Angeles, CA                                 [Edit] [Delete]  │  │
│  │  34.05°N, -118.24°W  |  Elev: 88m  |  Bortle: 5            │  │
│  │                                                                     │  │
│  │  Greenwich, London                               [Edit] [Delete]  │  │
│  │  51.48°N, 0.0°W  |  Elev: 15m  |  Bortle: 4              │  │
│  │                                                                     │  │
│  │  [+ Add New Location]                                                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  🔭 Telescope Profiles (read-only)                                   │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  Seestar S50                                          [View JSON] │  │
│  │  50mm aperture  |  250mm FL  |  1920×1080  |  2.9μm pitch       │  │
│  │                                                                     │  │
│  │  Dwarf II                                              [View JSON] │  │
│  │  50mm aperture  |  150mm FL  |  3840×2160  |  1.6μm pitch       │  │
│  │                                                                     │  │
│  │  (Managed via JSON files in data/telescopes/)                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  ⚙️ Planning Settings                                                │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  Default Min Altitude:  [30°    ▼]                                │  │
│  │  Default Bortle Scale:    [3      ▼]                                │  │
│  │  Weather Thresholds:                                                 │  │
│  │    Max Cloud Cover:     [50%    ▼]                                │  │
│  │    Max Humidity:        [70%    ▼]                                │  │
│  │    Max Seeing:          [2.5"   ▼]                                │  │
│  │                                                                     │  │
│  │  [Save Settings]                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Navigation & Layout

### Sidebar (Collapsed):

```
┌──┐
│☰ │
├──┤
│🏠 │ Dashboard
│📋 │ Plan
│🌙 │ Forecast
│🔭 │ Catalogs
│📝 │ Logs
│⚙️ │ Settings
└──┘
```

### Sidebar (Expanded):

```
┌──────────────┐
│  ☰ STAIRS   │
├──────────────┤
│  🏠 Dashboard │
│              │
│  📋 Plan     │
│     Generator │
│              │
│  🌙 Forecast │
│              │
│  🔭 Catalogs │
│              │
│  📝 Logs     │
│              │
│  ⚙️ Settings │
└──────────────┘
```

---

## Mobile Responsive Considerations

### Dashboard (Mobile):

```
┌─────────────────┐
│ ☰ STAIRS    🔔 │
├─────────────────┤
│ 📍 Tromso, NO   │
│ 69.65°N 18.95°E│
│ Bortle: 3        │
├─────────────────┤
│ 🌙 Tonight       │
│ Night: 18:42-05:│
│ 18 (6.5h)       │
├─────────────────┤
│ ☁️ Weather       │
│ Clouds: 20%     │
│ Humidity: 45%   │
├─────────────────┤
│ ⭐ Top Targets  │
│ ┌─────────────┐ │
│ │ M42 Orion   │ │
│ │ ★★★★☆ 82   │ │
│ │ [+ Add]    │ │
│ └─────────────┘ │
│ ...more cards   │
└─────────────────┘
```

---

## Component States

### Loading State (Plan Generator):

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 Plan Generator                                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  📍 Location & Telescope                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │              🌙 Generating Plan...                            │   │
│  │                                                              │   │
│  │              ╔═══════════════╗                              │   │
│  │              ║ ░░░░░░░░░░░ ║ 45%                           │   │
│  │              ╚═══════════════╝                              │   │
│  │                                                              │   │
│  │  Calculating altitudes...                                    │   │
│  │  Scoring targets...                                          │   │
│  │  Building timeline...                                        │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Error State (API Failure):

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 Plan Generator                                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  📍 Location & Telescope                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │                    ⚠️ Error Generating Plan                  │   │
│  │                                                              │   │
│  │  Telescope profile "Seestar S50" not found.                  │   │
│  │  Please check your settings.                                │   │
│  │                                                              │   │
│  │  [Try Again]  [Check Settings]                              │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Typography Scale

```
Hero/Page Title:     Inter 32px/40px Bold
Section Title:        Inter 24px/32px SemiBold
Card Title:           Inter 18px/28px Medium
Body Text:            Inter 14px/20px Regular
Small Text/Caption:   Inter 12px/16px Regular
Button Text:          Inter 14px/20px Medium
```

---

## Iconography

Using **Lucide React** icon set (consistent, clean, outline style):

- 🏠 Home: `Home`
- 📋 Plan: `Calendar`
- 🌙 Forecast: `Moon`
- 🔭 Catalogs: `Telescope`
- 📝 Logs: `ClipboardList`
- ⚙️ Settings: `Settings`
- 📍 Location: `MapPin`
- ☁️ Weather: `Cloud`
- ⭐ Star/Rating: `Star`
- 🔔 Notification: `Bell`
- 👤 User: `User`
- ➕ Add: `Plus`
- ✎ Edit: `Pencil`
- 🗑️ Delete: `Trash2`
- ✕ Close: `X`
- 📅 Date: `Calendar`
- 🔍 Search: `Search`
- ↓ Download: `Download`
- ⚠️ Error: `AlertTriangle`
- ✅ Success: `CheckCircle`
