import { useState, useMemo, useEffect } from "react";
import { useRecommendedTargets } from "@/hooks/use-recommended-targets";
import { useSkyQuality } from "@/hooks/use-sky-quality";
import { useWeather } from "@/hooks/use-weather";
import { useSettings } from "@/context/SettingsContext";
import { TargetCard } from "@/components/TargetCard";
import { MultiAltitudeChart } from "@/components/MultiAltitudeChart";
import { SkyVisualization } from "@/components/SkyVisualization";
import { useMultiTargetPosition } from "@/hooks/use-multi-target-position";
import { useSkyView } from "@/hooks/use-sky-view";
import {
  Cloud,
  Wind,
  Thermometer,
  Moon,
  MapPin,
  Info,
  Sparkles,
  Activity,
  Plus,
  Minus,
  Filter,
  X,
  Eye,
} from "lucide-react";
import { formatTemp } from "@/lib/utils";

export function Dashboard() {
  const { activeLocation, tempUnit } = useSettings();
  const { data: recommendations, isLoading: targetsLoading } =
    useRecommendedTargets();
  const { data: qualityData, isLoading: qualityLoading } = useSkyQuality();
  const { data: weather, isLoading: weatherLoading } = useWeather(
    activeLocation?.latitude ?? 0,
    activeLocation?.longitude ?? 0,
  );

  // --- TIMEFRAME LOGIC ---
  const now = new Date();
  const points = qualityData?.points || [];
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  const nightStart = firstPoint ? new Date(firstPoint.time) : null;
  const nightEnd = lastPoint ? new Date(lastPoint.time) : null;

  const isDarkNow =
    nightStart && nightEnd && now >= nightStart && now <= nightEnd;
  const timeLabel = isDarkNow ? "Current Astro Night" : "Next Astro Night";

  // Target Visibility & Filtering
  const [visibleTargetIds, setVisibleTargetIds] = useState<string[]>([]);
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [dashboardView, setDashboardView] = useState<"paths" | "sky">("paths");

  const categories = useMemo(() => {
    if (!recommendations) return [];
    const cats = new Set(recommendations.map((r) => r.target_type.trim()));
    return Array.from(cats).sort();
  }, [recommendations]);

  // Initialize with top 5 recommendations once they load
  useEffect(() => {
    if (
      recommendations &&
      recommendations.length > 0 &&
      visibleTargetIds.length === 0 &&
      scoreFilter === null &&
      categoryFilter.length === 0
    ) {
      setVisibleTargetIds(recommendations.slice(0, 5).map((r) => r.target_id));
    }
  }, [
    recommendations,
    visibleTargetIds.length,
    scoreFilter,
    categoryFilter.length,
  ]);

  // Live filtering effect
  useEffect(() => {
    if (!recommendations) return;

    // If no filters are active, we don't want to override manual toggles
    const isFilterActive = scoreFilter !== null || categoryFilter.length > 0;
    if (!isFilterActive) return;

    const filteredIds = recommendations
      .filter((r) => {
        const matchesScore =
          scoreFilter === null || r.final_score >= scoreFilter;
        const matchesCategory =
          categoryFilter.length === 0 ||
          categoryFilter.includes(r.target_type.trim());
        return matchesScore && matchesCategory;
      })
      .map((r) => r.target_id);

    setVisibleTargetIds(filteredIds);
  }, [scoreFilter, categoryFilter, recommendations]);

  // Pre-fetch all positions for instant switching
  const allTargetIds = useMemo(
    () => (recommendations || []).map((r) => r.target_id),
    [recommendations],
  );

  // Data for Sky Visualization (Fetch ALL once for instant toggling)
  const { data: skyViewData, isLoading: skyViewLoading } = useSkyView(
    allTargetIds,
    nightStart?.toISOString() || null,
  );

  const posResults = useMultiTargetPosition(allTargetIds, nightStart, nightEnd);
  const posLoading = posResults.some((r) => r.isLoading);

  // Filter positions for the chart based on visibility state
  const combinedPositions = useMemo(() => {
    const idSet = new Set(visibleTargetIds);
    return posResults
      .filter((r) => r.data && idSet.has(r.data.identifier))
      .map((r) => ({
        label: r.data!.identifier,
        positions: r.data!.positions,
      }));
  }, [posResults, visibleTargetIds]);

  // Current Quality Metrics
  const currentQuality = useMemo(() => {
    if (!points.length) return null;
    const nowMs = now.getTime();
    // find closest point to now
    const closest = points.reduce((prev, curr) =>
      Math.abs(new Date(curr.time).getTime() - nowMs) <
      Math.abs(new Date(prev.time).getTime() - nowMs)
        ? curr
        : prev,
    );

    return {
      rel: Math.round(closest.score),
      abs: Math.round(
        closest.score *
          (activeLocation?.bortle_scale
            ? 1 - (activeLocation.bortle_scale - 1) / 8
            : 1),
      ),
    };
  }, [points, now, activeLocation]);

  const toggleTarget = (id: string) => {
    setVisibleTargetIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleCategory = (cat: string) => {
    setCategoryFilter((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleClearFilters = () => {
    setScoreFilter(null);
    setCategoryFilter([]);
    if (recommendations) {
      setVisibleTargetIds(recommendations.slice(0, 5).map((r) => r.target_id));
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">
            Sky Dashboard
          </h1>
          <p className="text-muted-foreground text-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {activeLocation?.name || "Loading location..."}
          </p>
        </div>

        {nightStart && nightEnd && (
          <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-2xl flex items-center gap-3 group relative cursor-help">
            <div
              className={`w-2 h-2 rounded-full ${
                isDarkNow ? "bg-primary animate-pulse" : "bg-muted-foreground"
              }`}
            />
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                {timeLabel}
              </p>
              <p className="text-sm font-mono font-bold">
                {nightStart.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -
                {nightEnd.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="absolute top-full right-0 mt-3 w-64 p-3 bg-popover text-[10px] rounded-xl border shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 transform -translate-y-2 group-hover:translate-y-0">
              <p className="font-bold text-primary mb-1 uppercase tracking-widest">
                Astronomical Night
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This is the period when the sun is more than 18° below the
                horizon.
              </p>
              <div className="absolute bottom-full right-4 w-2 h-2 bg-popover border-l border-t border-border rotate-45 translate-y-1" />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Current Conditions
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-wider">
              Live
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <WeatherWidget
            label="Clouds"
            value={
              weather?.cloud_cover_pct !== null
                ? `${weather?.cloud_cover_pct}%`
                : "N/A"
            }
            icon={Cloud}
            loading={weatherLoading}
          />
          <WeatherWidget
            label="Humidity"
            value={
              weather?.humidity_pct !== null
                ? `${weather?.humidity_pct}%`
                : "N/A"
            }
            icon={Wind}
            loading={weatherLoading}
          />
          <WeatherWidget
            label="Temp"
            value={formatTemp(weather?.temperature_c, tempUnit)}
            icon={Thermometer}
            loading={weatherLoading}
          />
          <WeatherWidget
            label="Seeing"
            value={weather?.seeing !== null ? `${weather?.seeing}"` : "Good"}
            icon={Moon}
            loading={weatherLoading}
          />
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-4 hover:border-primary/40 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">
                Sky Score
              </p>
              {qualityLoading ? (
                <div className="h-5 w-16 bg-secondary animate-pulse rounded" />
              ) : currentQuality ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-primary">
                    {currentQuality.rel}%
                    <span className="text-[8px] ml-0.5 opacity-50 uppercase font-bold">
                      Rel
                    </span>
                  </span>
                  <span className="text-lg font-black text-primary/70">
                    {currentQuality.abs}
                    <span className="text-[8px] ml-0.5 opacity-50 uppercase font-bold">
                      Abs
                    </span>
                  </span>
                </div>
              ) : (
                <p className="text-lg font-black">N/A</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex bg-secondary/50 p-1 rounded-xl border border-border/50">
                <button
                  onClick={() => setDashboardView("paths")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    dashboardView === "paths"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Paths
                </button>
                <button
                  onClick={() => setDashboardView("sky")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    dashboardView === "sky"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Sky View
                </button>
              </div>
              <div className="p-1 hover:bg-secondary rounded-full cursor-help group relative">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-popover text-[10px] rounded-xl border shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  <p className="font-bold text-primary mb-1 uppercase">
                    Dynamic Visualization
                  </p>
                  <p className="text-muted-foreground leading-tight">
                    {dashboardView === "paths"
                      ? "Timeline view of target altitudes and sky quality."
                      : "Overhead map showing the Moon and selected targets throughout the night."}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border rounded-[2.5rem] bg-card min-h-[450px] shadow-sm relative overflow-hidden flex flex-col">
              {dashboardView === "paths" ? (
                posLoading || qualityLoading ? (
                  <div className="h-full w-full bg-secondary/20 animate-pulse rounded-xl flex items-center justify-center flex-1">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : combinedPositions.length > 0 || points.length > 0 ? (
                  <div className="flex-1 min-h-0">
                    <MultiAltitudeChart
                      targetDatasets={combinedPositions}
                      qualityPoints={points}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs text-center p-8 flex-1">
                    No paths selected. Toggle targets from the list to see their
                    orbit.
                  </div>
                )
              ) : skyViewLoading ? (
                <div className="h-full w-full bg-secondary/20 animate-pulse rounded-xl flex items-center justify-center flex-1">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : skyViewData?.timeline ? (
                <div className="flex-1 min-h-0">
                  <SkyVisualization
                    timeline={skyViewData.timeline}
                    locationName={activeLocation?.name || "Local"}
                    visibleTargetIds={visibleTargetIds}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs text-center p-8 flex-1">
                  Unable to load sky telemetry.
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border rounded-[2.5rem] bg-card space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Filter className="w-3 h-3" />
                Smart Selector
              </h2>
              {(scoreFilter !== null || categoryFilter.length > 0) && (
                <button
                  onClick={handleClearFilters}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                  Min Score
                </p>
                <div className="flex gap-1">
                  {[60, 70, 80, 90].map((s) => {
                    const hasTargets = recommendations?.some(
                      (r) => r.final_score >= s,
                    );
                    return (
                      <button
                        key={s}
                        disabled={!hasTargets}
                        onClick={() =>
                          setScoreFilter(scoreFilter === s ? null : s)
                        }
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          scoreFilter === s
                            ? "bg-primary border-primary text-primary-foreground"
                            : hasTargets
                              ? "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30"
                              : "bg-secondary/10 border-transparent text-muted-foreground/30 cursor-not-allowed"
                        }`}
                      >
                        {s}+
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                  Categories
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const hasTargets = recommendations?.some(
                      (r) => r.target_type.trim() === cat,
                    );
                    return (
                      <button
                        key={cat}
                        disabled={!hasTargets}
                        onClick={() => toggleCategory(cat)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${
                          categoryFilter.includes(cat)
                            ? "bg-primary/20 border-primary text-primary"
                            : hasTargets
                              ? "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30"
                              : "bg-secondary/10 border-transparent text-muted-foreground/30 cursor-not-allowed"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-3">
                Individual Toggles
              </p>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {recommendations?.map((r) => {
                  const isVisible = visibleTargetIds.includes(r.target_id);
                  return (
                    <button
                      key={r.target_id}
                      onClick={() => toggleTarget(r.target_id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all flex items-center gap-1.5 border ${
                        isVisible
                          ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                          : "bg-secondary/20 border-transparent text-muted-foreground hover:border-border"
                      }`}
                    >
                      {isVisible ? (
                        <Minus className="w-2.5 h-2.5" />
                      ) : (
                        <Plus className="w-2.5 h-2.5" />
                      )}
                      <span className="truncate max-w-[80px]">
                        {r.target_id}
                      </span>
                      <div className="flex items-center gap-1 ml-1 pl-1 border-l border-current/20">
                        <span>
                          {Math.round(r.sqs_score)}
                          <span className="text-[7px] opacity-60 ml-0.5">
                            R
                          </span>
                        </span>
                        <span className="opacity-30">|</span>
                        <span>
                          {Math.round(r.aqs_score || r.final_score)}
                          <span className="text-[7px] opacity-60 ml-0.5">
                            A
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Tonight's Best
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {targetsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[400px] bg-secondary/20 animate-pulse rounded-[2rem]"
                />
              ))
            ) : recommendations?.length ? (
              recommendations.map((target) => (
                <TargetCard
                  key={target.target_id}
                  target={target as any}
                  nightStart={nightStart}
                  nightEnd={nightEnd}
                  variant="catalog"
                  isPinned={visibleTargetIds.includes(target.target_id)}
                  onTogglePin={() => toggleTarget(target.target_id)}
                />
              ))
            ) : (
              <div className="col-span-full p-12 border-2 border-dashed border-border rounded-[2.5rem] text-center text-muted-foreground">
                No recommended targets found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeatherWidget({ label, value, icon: Icon, loading }: any) {
  return (
    <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-4 hover:border-primary/30 transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">
          {label}
        </p>
        {loading ? (
          <div className="h-5 w-12 bg-secondary animate-pulse rounded" />
        ) : (
          <p className="text-lg font-black">{value}</p>
        )}
      </div>
    </div>
  );
}
