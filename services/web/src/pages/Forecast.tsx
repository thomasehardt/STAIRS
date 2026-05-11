import React, { useState, useMemo, useEffect } from "react";
import { type UseQueryResult } from "@tanstack/react-query";
import { Chart, registerables, type ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";
import {
  useMultiLocationForecast,
  type MultiForecastResult,
} from "@/hooks/use-multi-location-forecast";
import {
  CloudMoon,
  CalendarDays,
  MapPin,
  Clock,
  ArrowRight,
  AlertCircle,
  Info,
  Moon,
  Sunrise,
  Sunset,
  X,
} from "lucide-react";
import { SkyQualityChart } from "@/components/SkyQualityChart";
import { useSkyQuality } from "@/hooks/use-sky-quality";

// Register Chart.js components and plugins
Chart.register(...registerables);

const QualityBadge: React.FC<{ score: number | null | undefined }> = ({
  score,
}) => {
  let color = "bg-muted text-muted-foreground";
  let text = "N/A";

  if (score !== null && score !== undefined) {
    text = Math.round(score).toString();
    if (score >= 80)
      color = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
    else if (score >= 60)
      color = "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    else if (score >= 40)
      color = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    else color = "bg-rose-500/10 text-rose-500 border border-rose-500/20";
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${color}`}
    >
      {text}
    </span>
  );
};

const LocationNightCard: React.FC<{
  loc: any;
  isBest: boolean;
  navigate: any;
}> = ({ loc, isBest, navigate }) => {
  const { data: qualityData, isLoading } = useSkyQuality(
    loc.name,
    loc.astronomical_night_start || loc.date,
  );

  const formatTime = (iso: string | null) => {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`p-6 rounded-[2rem] border transition-all flex flex-col h-full ${
        isBest
          ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
          : "bg-secondary/30 border-transparent"
      }`}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1 min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <MapPin
              className={`w-4 h-4 shrink-0 ${
                isBest ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span className="text-lg font-black uppercase tracking-tight truncate">
              {loc.name}
            </span>
            {isBest && (
              <span className="bg-primary text-primary-foreground text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                Best Site
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {loc.effective_hours
                  ? `${loc.effective_hours.toFixed(1)}h window`
                  : "No window"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5" />
              <span>{loc.total_dark_hours.toFixed(1)}h total dark</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-start shrink-0">
          <div className="flex flex-col items-end gap-1">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Absolute
            </p>
            <QualityBadge score={loc.absolute_quality} />
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Relative
            </p>
            <QualityBadge score={loc.relative_quality} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-background/50 rounded-2xl border border-border/50">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Sunrise className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Astro Start
            </span>
          </div>
          <p className="text-xl font-black font-mono">
            {formatTime(loc.astronomical_night_start)}
          </p>
        </div>
        <div className="p-4 bg-background/50 rounded-2xl border border-border/50">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Sunset className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Astro End
            </span>
          </div>
          <p className="text-xl font-black font-mono">
            {formatTime(loc.astronomical_night_end)}
          </p>
        </div>
      </div>

      {/* Night Quality Chart */}
      <div className="mb-6 flex-1 min-h-[140px] relative group/chart">
        <div className="absolute inset-0 flex flex-col">
          <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2 px-1 flex justify-between">
            <span>Night Quality Trend</span>
            {qualityData?.points && (
              <span className="text-muted-foreground group-hover/chart:text-primary transition-colors opacity-0 group-hover/chart:opacity-100">
                Live Simulation
              </span>
            )}
          </p>
          <div className="flex-1 bg-background/30 rounded-2xl border border-border/50 p-4">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qualityData?.points && qualityData.points.length > 0 ? (
              <SkyQualityChart points={qualityData.points} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-[10px] text-muted-foreground uppercase font-black">
                  No Simulation Available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {loc.note && (
        <div className="flex items-start gap-3 mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            {loc.note}
          </p>
        </div>
      )}

      <button
        onClick={() =>
          navigate("/plan", {
            state: {
              initialStartTime: loc.astronomical_night_start || loc.date,
              initialLocationName: loc.name,
            },
          })
        }
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all ${
          isBest
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02]"
            : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
        }`}
      >
        Start Planning
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

const DayOverview: React.FC<{
  day: any;
  onClose: () => void;
  navigate: any;
}> = ({ day, onClose, navigate }) => {
  const date = new Date(day.date);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full max-w-6xl max-h-[95vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-border flex justify-between items-center bg-secondary/20">
          <div className="space-y-1">
            <p className="text-xs font-black text-primary uppercase tracking-[0.3em] leading-none">
              Night Overview
            </p>
            <h2 className="text-3xl font-black uppercase tracking-tight">
              {date.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {day.displayLocations.map((loc: any, idx: number) => (
              <LocationNightCard
                key={idx}
                loc={loc}
                isBest={loc.name === day.bestLocationName}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ScoreInfoTooltip: React.FC = () => {
  return (
    <div className="group relative">
      <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary cursor-help transition-colors" />
      <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-card border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
        <div className="space-y-2 text-left">
          <div>
            <p className="text-[10px] font-black uppercase text-primary mb-0.5">
              Relative Quality
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight font-medium">
              Measures how good the night is{" "}
              <span className="text-foreground font-bold">
                for that specific location
              </span>{" "}
              based on weather, clouds, and moon phase. A 100 means perfect
              conditions for that site.
            </p>
          </div>
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-black uppercase text-primary mb-0.5">
              Absolute Quality
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight font-medium">
              Adjusts the score based on{" "}
              <span className="text-foreground font-bold">
                light pollution (Bortle scale)
              </span>
              . Allows for a true comparison between sites; a Bortle 8 site will
              never reach an absolute 100.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ForecastHeader: React.FC<{
  days: number;
  setDays: (days: number) => void;
  qualityType: "absolute" | "relative";
  setQualityType: (type: "absolute" | "relative") => void;
}> = ({ days, setDays, qualityType, setQualityType }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 bg-card border border-border rounded-3xl shadow-sm mb-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Forecast Window
        </h2>
        <div className="flex items-center gap-4 mt-2">
          <input
            id="days-slider"
            type="range"
            min="3"
            max="14"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="w-48 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-lg font-black font-mono">
            {days}{" "}
            <span className="text-xs text-muted-foreground uppercase font-sans">
              Days
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 items-start md:items-end">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <CloudMoon className="w-4 h-4" />
            Scoring Mode
          </h2>
          <ScoreInfoTooltip />
        </div>
        <div className="flex bg-secondary/50 p-1 rounded-xl mt-2 border border-border/50">
          <button
            onClick={() => setQualityType("absolute")}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              qualityType === "absolute"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Absolute
          </button>
          <button
            onClick={() => setQualityType("relative")}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              qualityType === "relative"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Relative
          </button>
        </div>
      </div>
    </div>
  );
};

export const ForecastPage: React.FC = () => {
  const navigate = useNavigate();
  const { config, activeLocation } = useSettings();
  const [days, setDays] = useState(14);
  const [qualityType, setQualityType] = useState<"absolute" | "relative">(
    "absolute",
  );
  const [selectedDay, setSelectedDay] = useState<any>(null);

  // Manage which locations are selected for the forecast
  const [selectedLocationNames, setSelectedLocationNames] = useState<string[]>(
    [],
  );

  // Initialize selected locations from config if not set
  useEffect(() => {
    if (config?.locations && selectedLocationNames.length === 0) {
      setSelectedLocationNames(config.locations.map((l) => l.name));
    }
  }, [config?.locations, selectedLocationNames.length]);

  const filteredLocations = useMemo(() => {
    if (!config?.locations) return [];
    // Always include the default/active location
    const activeName = activeLocation?.name;
    return config.locations.filter(
      (l) =>
        selectedLocationNames.includes(l.name) ||
        l.name === activeName ||
        l.default,
    );
  }, [config?.locations, selectedLocationNames, activeLocation?.name]);

  const results = useMultiLocationForecast(
    filteredLocations,
    days,
  ) as UseQueryResult<MultiForecastResult>[];

  const isLoading = results.some((r) => r.isLoading);
  const hasAnyData = results.some((r) => r.data);
  const error = results.find((r) => r.error)?.error;

  const chartData = useMemo(() => {
    const datasets = results
      .filter((r) => r.status === "success" && r.data)
      .map((r, idx) => {
        const data = r.data!;
        const chartPoints = data.forecastData.days.map((day) => ({
          x: new Date(day.date).getTime(),
          y:
            qualityType === "absolute"
              ? day.absolute_quality
              : day.relative_quality,
        }));

        const colors = [
          "#3b82f6", // blue
          "#10b981", // emerald
          "#f59e0b", // amber
          "#ef4444", // rose
          "#8b5cf6", // violet
          "#06b6d4", // cyan
        ];
        const color = colors[idx % colors.length];

        return {
          label: data.locationName,
          data: chartPoints,
          borderColor: color,
          backgroundColor: `${color}20`,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true,
        };
      });

    return { datasets };
  }, [results, qualityType]);

  const chartOptions: ChartOptions<"line"> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            displayFormats: {
              day: "MMM d",
            },
          },
          grid: {
            display: false,
          },
          ticks: {
            font: {
              family: "JetBrains Mono",
              size: 10,
            },
            color: "#6b7280",
          },
        },
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text:
              qualityType === "absolute"
                ? "Absolute Quality (0-100)"
                : "Relative Quality (0-100)",
            font: {
              family: "JetBrains Mono",
              size: 10,
              weight: "bold",
            },
            color: "#6b7280",
          },
          grid: {
            color: "rgba(107, 114, 128, 0.1)",
          },
          ticks: {
            stepSize: 20,
            font: {
              family: "JetBrains Mono",
              size: 10,
            },
            color: "#6b7280",
          },
        },
      },
      plugins: {
        tooltip: {
          backgroundColor: "#111827",
          titleFont: { family: "JetBrains Mono", size: 12 },
          bodyFont: { family: "JetBrains Mono", size: 12 },
          padding: 12,
          cornerRadius: 12,
          boxPadding: 6,
        },
        legend: {
          display: false,
        },
      },
    };
  }, [qualityType]);

  // Organize and sort data by day for the grid, ensuring reactivity to qualityType
  const daysGrid = useMemo(() => {
    if (results.length === 0) return [];

    const allDays: Record<string, { date: string; locations: any[] }> = {};

    results.forEach((res) => {
      if (res.status === "success" && res.data) {
        res.data.forecastData.days.forEach((day) => {
          // Ensure date is parsed as local time to avoid timezone shifts
          const dateKey = new Date(day.date + "T00:00:00").toDateString();
          if (!allDays[dateKey]) {
            allDays[dateKey] = {
              date: day.date,
              locations: [],
            };
          }
          const score =
            qualityType === "absolute"
              ? day.absolute_quality
              : day.relative_quality;
          allDays[dateKey].locations.push({
            name: res.data!.locationName,
            ...day,
            displayScore: score,
          });
        });
      }
    });

    const activeName = activeLocation?.name;

    // Post-process: sort locations and align with calendar
    const sortedDays = Object.values(allDays)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((day) => {
        // Find best location by score
        const byScore = [...day.locations].sort(
          (a, b) => b.displayScore - a.displayScore,
        );
        const bestScore = byScore[0]?.displayScore || 0;
        const bestName = bestScore > 0 ? byScore[0]?.name : null;

        // Sort locations for display: Active/Default first, then alphabetical
        const displayLocations = [...day.locations].sort((a, b) => {
          const isADefault =
            a.name === activeName ||
            config?.locations.find((l) => l.name === a.name)?.default;
          const isBDefault =
            b.name === activeName ||
            config?.locations.find((l) => l.name === b.name)?.default;

          if (isADefault && !isBDefault) return -1;
          if (!isADefault && isBDefault) return 1;
          return a.name.localeCompare(b.name);
        });

        return {
          ...day,
          displayLocations,
          bestLocationName: bestName,
        };
      });

    if (sortedDays.length === 0) return [];

    // --- Filter days based on observing period ---
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const filteredForecastDays = sortedDays.filter((day) => {
      const dayDate = new Date(day.date + "T00:00:00");

      if (dayDate < todayStart) {
        // This is a past day. Include only if its night hasn't ended yet.
        return day.locations.some((loc) => {
          if (!loc.astronomical_night_end) return false;
          return new Date(loc.astronomical_night_end) > now;
        });
      }
      return true;
    });

    if (filteredForecastDays.length === 0) return [];

    // Calendar alignment and Past-day padding
    const firstForecastDate = new Date(
      filteredForecastDays[0].date + "T00:00:00",
    );
    const dayOfWeek = firstForecastDate.getDay(); // 0 (Sun) to 6 (Sat)

    const result: (
      | (typeof filteredForecastDays)[0]
      | { date: string; isPast: true }
    )[] = [];

    // 1. Add placeholders for days in the current week that are BEFORE the forecast start
    for (let i = 0; i < dayOfWeek; i++) {
      const pastDate = new Date(firstForecastDate);
      pastDate.setDate(firstForecastDate.getDate() - (dayOfWeek - i));
      result.push({
        date: pastDate.toISOString().split("T")[0],
        isPast: true,
      });
    }

    // 2. Add the actual forecast days
    return [...result, ...filteredForecastDays];
  }, [results, qualityType, activeLocation?.name, config?.locations]);

  const toggleLocation = (name: string) => {
    setSelectedLocationNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">
            Observation Forecast
          </h1>
          <p className="text-muted-foreground text-lg">
            Predictive imaging quality for your locations.
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 animate-pulse">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Syncing weather algorithms...
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <ForecastHeader
            days={days}
            setDays={setDays}
            qualityType={qualityType}
            setQualityType={setQualityType}
          />
        </div>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4" />
            Location Selection
          </h2>
          <div className="flex flex-wrap gap-2">
            {config?.locations.map((loc) => {
              const isDefault =
                loc.default || loc.name === activeLocation?.name;
              const isSelected =
                selectedLocationNames.includes(loc.name) || isDefault;
              return (
                <button
                  key={loc.name}
                  onClick={() => !isDefault && toggleLocation(loc.name)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-primary/30"
                  } ${
                    isDefault ? "cursor-default opacity-80" : "cursor-pointer"
                  }`}
                >
                  {loc.name} {isDefault && "\u2605"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && !hasAnyData && (
        <div className="p-12 text-center bg-rose-500/5 border border-rose-500/20 rounded-3xl">
          <h3 className="text-xl font-black text-rose-500 uppercase tracking-tighter mb-2">
            Sync Error
          </h3>
          <p className="text-muted-foreground">{(error as any).message}</p>
        </div>
      )}

      {chartData.datasets.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <ActivityIcon className="w-4 h-4" />
            Comparative Trend
          </h3>
          <div className="h-80 w-full p-6 border border-border rounded-3xl bg-card shadow-sm relative group">
            <Line key={qualityType} options={chartOptions} data={chartData} />
          </div>
          <div className="flex flex-wrap gap-4 px-2">
            {chartData.datasets.map((ds, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ds.borderColor }}
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  {ds.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          {days}-Day Outlook
        </h3>

        {/* Calendar Header */}
        <div className="hidden lg:grid grid-cols-7 gap-6 mb-2 px-6">
          {weekDays.map((day) => (
            <div key={day} className="text-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                {day}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
          {daysGrid.map((day, i) => {
            if (!day) return null;

            const date = new Date(day.date + "T00:00:00");
            const isToday = date.toDateString() === new Date().toDateString();

            // Render Past Placeholder
            if ("isPast" in day && day.isPast) {
              return (
                <div
                  key={`past-${i}`}
                  className="hidden lg:flex p-4 border border-dashed rounded-3xl bg-secondary/10 opacity-40 flex-col grayscale pointer-events-none"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-black">
                        {date.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </h4>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-full h-px bg-border" />
                  </div>
                </div>
              );
            }

            const forecastDay = day as {
              displayLocations: any[];
              bestLocationName: string | null;
              date: string;
            };

            return (
              <div
                key={i}
                onClick={() => setSelectedDay(day)}
                className={`p-4 border rounded-3xl bg-card shadow-sm flex flex-col transition-all hover:border-primary/40 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                  isToday
                    ? "ring-2 ring-primary ring-offset-4 ring-offset-background"
                    : ""
                }`}
              >
                <div className="flex justify-between items-start mb-4 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest leading-none mb-1 lg:hidden">
                      {date.toLocaleDateString(undefined, { weekday: "short" })}
                    </p>
                    <h4 className="text-lg font-black truncate">
                      {date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </h4>
                  </div>
                  {isToday && (
                    <span className="bg-primary text-primary-foreground text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shrink-0">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                  {forecastDay.displayLocations.map((loc, j) => {
                    const isBest = loc.name === forecastDay.bestLocationName;
                    return (
                      <div key={j} className="group/item flex-1 flex flex-col">
                        <div
                          className={`flex flex-col h-full p-2.5 rounded-xl border transition-all ${
                            isBest
                              ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                              : "bg-secondary/30 border-transparent group-hover/item:border-border/50"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1.5 min-w-0">
                              <div className="flex flex-col min-w-0 pr-1">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <MapPin
                                    className={`w-2.5 h-2.5 shrink-0 ${
                                      isBest
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                  <span
                                    className={`text-[10px] font-bold truncate leading-none ${
                                      isBest ? "text-primary" : ""
                                    }`}
                                  >
                                    {loc.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 shrink-0 text-muted-foreground" />
                                  <span className="text-[9px] font-medium text-muted-foreground leading-none">
                                    {loc.effective_hours
                                      ? `${loc.effective_hours.toFixed(1)}h`
                                      : "0h"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <div className="flex flex-col items-center">
                                  <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter leading-none mb-0.5">
                                    Abs
                                  </span>
                                  <QualityBadge score={loc.absolute_quality} />
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter leading-none mb-0.5">
                                    Rel
                                  </span>
                                  <QualityBadge score={loc.relative_quality} />
                                </div>
                              </div>
                            </div>

                            {isBest && (
                              <div className="mb-1.5 px-1.5 py-0.5 bg-primary/10 rounded-md self-start">
                                <span className="text-[8px] font-black uppercase text-primary tracking-tighter">
                                  Best Site
                                </span>
                              </div>
                            )}

                            {loc.note && (
                              <div
                                className={`flex items-start gap-1 mb-2 p-1.5 rounded-lg ${
                                  isBest ? "bg-primary/5" : "bg-background/50"
                                }`}
                              >
                                <AlertCircle className="w-2.5 h-2.5 text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-[9px] text-muted-foreground leading-tight italic line-clamp-2">
                                  {loc.note}
                                </p>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              navigate("/plan", {
                                state: {
                                  initialStartTime:
                                    loc.astronomical_night_start || loc.date,
                                  initialLocationName: loc.name,
                                },
                              })
                            }
                            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                              isBest
                                ? "bg-primary text-primary-foreground opacity-100"
                                : "bg-primary/10 text-primary opacity-0 group-hover/item:opacity-100 hover:bg-primary hover:text-white"
                            }`}
                          >
                            Plan
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <DayOverview
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          navigate={navigate}
        />
      )}
    </div>
  );
};

// renamed to avoid conflict with Chart.js internal name or similar
function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
