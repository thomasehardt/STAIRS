# STAIRS UI Blueprints

This file contains the "As-Built" code patterns for the STAIRS web interface. Use these as templates when adding new features.

## 🔗 API Integration (Phase 2)

### 1. Central API Client (`src/lib/api.ts`)

Standardized Axios instance with type safety.

```typescript
import axios from "axios";
import type { components } from "@/types/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Type aliasing: Mapping complex OpenAPI schemas to clean local names
export type Target = components["schemas"]["TargetSearchItem"];
export type TargetResponse = components["schemas"]["TargetSearchResponse"];

export default api;
```

### 2. Data Fetching Hook (`src/hooks/use-targets.ts`)

Using TanStack Query for automated loading/caching.

```typescript
import { useQuery } from "@tanstack/react-query";
import api, { type TargetResponse } from "@/lib/api";

export function useTargets() {
  return useQuery({
    queryKey: ["targets"],
    queryFn: async () => {
      // Use search endpoint with a default query
      const { data } = await api.get<TargetResponse>("/targets/search?q=M");
      return data;
    },
  });
}
```

---

## 🎨 Component Engineering (Phase 3)

### 1. Target Card Atom (`src/components/TargetCard.tsx`)

A reusable card for displaying astronomical objects.

```tsx
import type { Target } from "@/lib/api";
import { Telescope, MapPin, Activity } from "lucide-react";
import { useTargetPosition } from "@/hooks/use-target-position";
import { AltitudeChart } from "./AltitudeChart";

export function TargetCard({ target }: { target: Target }) {
  const { data: posData, isLoading } = useTargetPosition(target.identifier);

  return (
    <div className="p-4 border rounded-xl bg-card border-border hover:border-primary/40 transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Telescope className="w-4 h-4 text-primary" />
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {target.identifier}
            </h3>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {target.common_name || "Deep Sky Object"}
          </p>
        </div>
        <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-full bg-secondary text-secondary-foreground border border-border">
          {target.target_type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/50 border border-border/50">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-muted-foreground leading-none">
              Constellation
            </span>
            <span className="text-xs font-semibold">
              {target.constellation}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/50 border border-border/50">
          <Activity className="w-3 h-3 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-muted-foreground leading-none">
              Magnitude
            </span>
            <span className="text-xs font-semibold font-mono">
              {target.magnitude ?? "N/A"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        {isLoading ? (
          <div className="h-32 w-full animate-pulse bg-secondary/20 rounded-lg" />
        ) : (
          posData && <AltitudeChart data={posData.positions} />
        )}
      </div>
    </div>
  );
}
```

### 2. App Layout Shell (`src/components/AppLayout.tsx`)

The consistent frame for the application, using React Router `<Link>` for instant transitions.

```tsx
import { ReactNode } from "react";
import {
  Home,
  Telescope,
  Calendar,
  ClipboardList,
  Settings,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Calendar, label: "Plan Generator", href: "/plan" },
    { icon: Telescope, label: "Catalogs", href: "/catalogs" },
    { icon: ClipboardList, label: "Observation Logs", href: "/logs" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col border-r">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-black tracking-tighter text-primary uppercase">
            STAIRS
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
```

---

## 📈 Data Visualization (Phase 4 & 5)

### 1. Position Time-Series Hook (`src/hooks/use-target-position.ts`)

Dynamic hook that rounds start time and listens to global location settings.

```typescript
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import type { components } from "@/types/api";

type PositionSeries = components["schemas"]["TargetPositionSeries"];

export function useTargetPosition(id: string) {
  const { location } = useSettings();

  return useQuery({
    queryKey: ["position", id, location.latitude, location.longitude],
    queryFn: async () => {
      const start = new Date();
      start.setMinutes(0, 0, 0);

      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        start_time: start.toISOString(),
        hours: "12",
      });
      const { data } = await api.get<PositionSeries>(
        `/targets/${id}/position?${params}`,
      );
      return data;
    },
    enabled: !!id,
  });
}
```

### 2. Altitude Chart (`src/components/AltitudeChart.tsx`)

Professional AreaChart with dynamic observation window clipping and boundary marking.

```tsx
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { useSettings } from "@/context/SettingsContext";

export function AltitudeChart({ data }: { data: AltitudePoint[] }) {
  const { minAltitude, maxAltitude } = useSettings();

  // 🎓 Clipping math for the SVG Mask
  const chartHeight = 128;
  const topMargin = 5;
  const bottomMargin = 25;
  const availableHeight = chartHeight - topMargin - bottomMargin;
  const pxPerDeg = availableHeight / 90;
  const clipY = topMargin + (90 - maxAltitude) * pxPerDeg;
  const clipHeight = (maxAltitude - minAltitude) * pxPerDeg;

  return (
    <div className="h-32 w-full mt-4 relative">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart
          data={data}
          margin={{ top: topMargin, right: 5, left: 5, bottom: bottomMargin }}
        >
          <defs>
            <clipPath id={`clip-${minAltitude}-${maxAltitude}`}>
              <rect x="0" y={clipY} width="1000" height={clipHeight} />
            </clipPath>
          </defs>

          {/* Reference Lines for orientation */}
          <ReferenceLine y={0} stroke="#374151" strokeOpacity={0.5} />
          <ReferenceLine y={90} stroke="#374151" strokeOpacity={0.5} />
          <ReferenceLine
            y={minAltitude}
            stroke="#3b82f6"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            y={maxAltitude}
            stroke="#3b82f6"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />

          <YAxis
            domain={[0, 90]}
            ticks={[minAltitude, maxAltitude]}
            tickFormatter={(val) => `${val}\u00b0`}
            stroke="#6b7280"
            fontSize={8}
            tickLine={false}
            axisLine={false}
            width={30}
          />

          {/* Layered plotting for visibility state */}
          <Area
            type="monotone"
            dataKey="alt_deg"
            stroke="#4b5563"
            strokeWidth={1}
            strokeDasharray="1 4"
            fill="transparent"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="alt_deg"
            stroke="#3b82f6"
            strokeWidth={2}
            clipPath={`url(#clip-${minAltitude}-${maxAltitude})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 🌍 Global State & Context (Phase 5)

### 1. Settings Context (`src/context/SettingsContext.tsx`)

Manages global observer settings with LocalStorage persistence.

```tsx
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(() => {
    const saved = localStorage.getItem("stairs-location");
    return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
  });

  const [minAltitude, setMinAltitude] = useState(() => {
    const saved = localStorage.getItem("stairs-min-altitude");
    return saved ? Number(saved) : 25;
  });

  // ... (Full implementation in src/context/SettingsContext.tsx)
}
```

### 2. Application Routing (`App.tsx`)

Clean routing architecture with sub-component extraction.

```tsx
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  );
}
```
