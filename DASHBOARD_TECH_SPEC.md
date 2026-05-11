# Technical Specification: Dashboard Enhancements

This document defines the precise implementation details for the Phase 2b Dashboard enhancements.

## 1. Schema Modifications (`services/api/src/api/schemas.py`)

### TargetRecommendation Update

Add missing metadata fields required for the `TargetCard` UI to prevent redundant lookups.

```python
class TargetRecommendation(BaseModel):
    target_id: str
    common_name: str | None = None
    # NEW FIELDS
    target_type: str
    constellation: str
    magnitude: float | None = None
    # EXISTING FIELDS
    oss_score: float  # Absolute Suitability
    aqs_score: float | None = None
    sqs_score: float  # Current Sky Quality (0-100)
    final_score: float # OSS * (SQS/100)
    visible_start: datetime | None = None
    visible_end: datetime | None = None
```

### New Sky Quality Schemas

```python
class QualityPoint(BaseModel):
    time: datetime
    score: float # 0-100 combined Moon + Weather score

class QualitySeriesResponse(BaseModel):
    location_name: str
    points: list[QualityPoint]
```

---

## 2. API Endpoints (`services/api/src/api/routers/planner.py`)

### `POST /planner/recommend`

A lightweight alternative to `/generate` that only ranks targets.

- **Request**: `PlanRequest` (reuses existing model).
- **Logic**:
  1. Resolve location and astronomical night.
  2. Calculate `static_oss` for all targets in the catalog.
  3. Calculate `sqs_score` at the midpoint of the night (or current time if night has started).
  4. Filter by `min_alt` and `theoretical_max_alt`.
  5. Return top 20 recommendations.
- **Goal**: Response time < 500ms.

### `GET /planner/quality-series`

Provides the data for the Dashboard sky quality graph.

- **Parameters**: `location_name`, `start_time` (optional).
- **Logic**:
  1. Resolve location and find the next astronomical night window.
  2. Sample 10-minute intervals across the window.
  3. For each interval:
     - Get `w_mult` (Weather multiplier 0.0-1.0).
     - Get `m_mult` (Moon quality multiplier 0.0-1.0).
     - Combined Score = `(w_mult * m_mult) * 100`.
  4. Return `QualitySeriesResponse`.

---

## 3. Frontend Implementation (`services/web/src`)

### Dashboard Timeframe Logic

The Dashboard will calculate the header state based on `PlanResponse.astronomical_night_start/end`:

```typescript
const isDarkNow = now >= nightStart && now <= nightEnd;
const label = isDarkNow ? "Current Dark Time" : "Next Dark Time";
const displayStart = isDarkNow ? now : nightStart;
```

### New Component: `SkyQualityChart.tsx`

- **Library**: `react-chartjs-2`.
- **Type**: Area chart (Line chart with fill).
- **Y-Axis**: Fixed 0-100.
- **Styling**: Semi-transparent primary color fill, matching the `AltitudeChart` aesthetic.

### Hook: `useSkyQuality()`

New React Query hook fetching from `/planner/quality-series`.

---

## 4. Implementation Steps

1. **Step 1 (API)**: Update `schemas.py` with expanded `TargetRecommendation` and new quality models.
2. **Step 2 (API)**: Implement `POST /planner/recommend` in `planner.py`.
3. **Step 3 (API)**: Implement `GET /planner/quality-series` in `planner.py`.
4. **Step 4 (Web)**: Create `useRecommendedTargets` and `useSkyQuality` hooks.
5. **Step 5 (Web)**: Build `SkyQualityChart.tsx`.
6. **Step 6 (Web)**: Refactor `Dashboard.tsx` to use new endpoints and display timeframe labels.
