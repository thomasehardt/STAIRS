import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import { useSettings } from "@/context/SettingsContext";

// Register Chart.js components and plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
);

interface AltitudePoint {
  time: string;
  alt_deg: number;
}

export function AltitudeChart({ data }: { data: AltitudePoint[] }) {
  const { minAltitude, maxAltitude } = useSettings();
  const [showMockup, setShowMockup] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Theme state to hold resolved colors for Canvas
  const [colors, setColors] = useState({
    primary: "#3b82f6",
    muted: "#9ca3af",
    border: "#374151",
    card: "#111827",
    background: "#0a0e1a",
  });

  // Resolve CSS variables for Canvas
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const resolveColor = (prop: string, fallback: string) => {
      const val = style.getPropertyValue(prop).trim();
      // Tailwind v4 uses okLCH or specific formats, but browser computedStyle usually gives rgb/hex
      return val || fallback;
    };

    setColors({
      primary: resolveColor("--color-primary", "#3b82f6"),
      muted: resolveColor("--color-muted-foreground", "#9ca3af"),
      border: resolveColor("--color-border", "#374151"),
      card: resolveColor("--color-card", "#111827"),
      background: resolveColor("--color-background", "#0a0e1a"),
    });
  }, []);

  // Color constants for the Dashboard style (Resolved)
  const COLOR_DASH_OPTIMAL = colors.primary;
  const COLOR_DASH_RESTRICTED = colors.muted;
  const COLOR_DASH_TEXT = colors.muted;

  // Color constants for the "Perfect Mockup" Popup style
  const COLOR_MOCKUP_OPTIMAL = "#1f77b4";
  const COLOR_MOCKUP_RESTRICTED = "#808080";
  const COLOR_MOCKUP_REFERENCE = "#666666";

  // Process data for Chart.js
  const processedData = data.map((p) => {
    const date = new Date(p.time);
    const firstDate = new Date(data[0].time);
    const startHour = firstDate.getHours() + firstDate.getMinutes() / 60;
    const offsetHours =
      (date.getTime() - firstDate.getTime()) / (1000 * 60 * 60);

    return {
      x: startHour + offsetHours,
      y: Math.max(0, p.alt_deg), // Clip negative altitudes to 0 per spec
      timeStr: p.time,
    };
  });

  const getChartData = (isMockupView: boolean) => {
    const optimalColor = isMockupView
      ? COLOR_MOCKUP_OPTIMAL
      : COLOR_DASH_OPTIMAL;
    const restrictedColor = isMockupView
      ? COLOR_MOCKUP_RESTRICTED
      : COLOR_DASH_RESTRICTED;

    return {
      datasets: [
        {
          label: "Altitude",
          data: processedData,
          borderColor: optimalColor,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.1,
          fill: false,
          segment: {
            borderColor: (ctx: any) => {
              const y0 = ctx.p0.parsed.y;
              const y1 = ctx.p1.parsed.y;
              const avg = (y0 + y1) / 2;
              if (avg >= minAltitude - 0.1 && avg <= maxAltitude + 0.1)
                return optimalColor;
              return restrictedColor;
            },
            borderWidth: (ctx: any) => {
              const y0 = ctx.p0.parsed.y;
              const y1 = ctx.p1.parsed.y;
              const avg = (y0 + y1) / 2;
              if (avg >= minAltitude - 0.1 && avg <= maxAltitude + 0.1)
                return 3;
              return 1;
            },
            borderDash: (ctx: any) => {
              const y0 = ctx.p0.parsed.y;
              const y1 = ctx.p1.parsed.y;
              const avg = (y0 + y1) / 2;
              // Solid for optimal range, dashed for restricted
              if (avg >= minAltitude - 0.1 && avg <= maxAltitude + 0.1)
                return [];
              return [4, 4];
            },
          },
        },
      ],
    };
  };

  const getOptions = (isMockupView: boolean): ChartOptions<"line"> => {
    const textColor = isMockupView ? "#6b7280" : COLOR_DASH_TEXT;
    const gridColor = isMockupView ? "#f0f0f0" : colors.card;

    // Force min/max to whole hours to ensure clean tick marks
    const xMin = Math.floor(Math.min(...processedData.map((d) => d.x)));
    const xMax = Math.ceil(Math.max(...processedData.map((d) => d.x)));

    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          min: xMin,
          max: xMax,
          title: {
            display: isMockupView,
            text: "Time",
            font: {
              family: isMockupView ? "Inter, sans-serif" : "Inter, sans-serif",
              size: 10,
              weight: 500,
            },
            color: textColor,
          },
          ticks: {
            stepSize: 1, // Force labels every 1 hour
            maxTicksLimit: 24, // Allow up to 24 labels (full day)
            autoSkip: true,
            callback: (value) => {
              // value is the 'x' in processedData (decimal hours)
              const hourNum = Math.round(value as number);
              const h = hourNum % 24;
              const ampm = h >= 12 ? "PM" : "AM";
              const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
              return `${dh}${ampm}`;
            },
            font: {
              family: isMockupView ? "Inter, sans-serif" : "Inter, sans-serif",
              size: isMockupView ? 10 : 8,
            },
            color: textColor,
          },
          grid: { display: false },
        },
        y: {
          min: 0,
          max: 90,
          title: {
            display: isMockupView,
            text: "Altitude",
            font: {
              family: isMockupView ? "Inter, sans-serif" : "Inter, sans-serif",
              size: 10,
              weight: 500,
            },
            color: textColor,
          },
          ticks: {
            stepSize: 30,
            font: {
              family: isMockupView ? "Inter, sans-serif" : "Inter, sans-serif",
              size: isMockupView ? 10 : 8,
            },
            color: textColor,
            callback: (value) => `${value}\u00b0`,
          },
          grid: { color: gridColor },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isMockupView ? "white" : colors.card,
          titleColor: isMockupView ? "#374151" : colors.primary,
          bodyColor: isMockupView ? "#6b7280" : "#fff",
          borderColor: isMockupView ? "#e5e7eb" : colors.border,
          borderWidth: 1,
          padding: 8,
          cornerRadius: 4,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const xValue = items[0].parsed.x;
              if (xValue === null || xValue === undefined) return "";
              const h = Math.floor(xValue) % 24;
              const m = Math.round((xValue - Math.floor(xValue)) * 60);
              const ampm = h >= 12 ? "PM" : "AM";
              const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
              return `${dh}:${m.toString().padStart(2, "0")} ${ampm}`;
            },
            label: (item) =>
              ` Altitude: ${item.parsed.y?.toFixed(1) ?? "0.0"}\u00b0`,
          },
        },
        annotation: {
          annotations: {
            shading: {
              type: "box",
              yMin: minAltitude,
              yMax: maxAltitude,
              backgroundColor: isMockupView
                ? "rgba(31, 119, 180, 0.1)"
                : `${colors.primary}0D`,
              borderWidth: 0,
              z: -1,
            },
            lineMin: {
              type: "line",
              yMin: minAltitude,
              yMax: minAltitude,
              borderColor: isMockupView
                ? COLOR_MOCKUP_REFERENCE
                : colors.border,
              borderWidth: isMockupView ? 2 : 1,
              borderDash: [8, 4],
              label: {
                display: true,
                content: `${minAltitude}\u00b0`,
                position: "start",
                yAdjust: -10,
                backgroundColor: "transparent",
                color: isMockupView ? COLOR_MOCKUP_REFERENCE : colors.muted,
                font: {
                  family: isMockupView
                    ? "Inter, sans-serif"
                    : "Inter, sans-serif",
                  size: 9,
                  weight: 600,
                },
              },
            },
            lineMax: {
              type: "line",
              yMin: maxAltitude,
              yMax: maxAltitude,
              borderColor: isMockupView
                ? COLOR_MOCKUP_REFERENCE
                : colors.border,
              borderWidth: isMockupView ? 2 : 1,
              borderDash: [8, 4],
              label: {
                display: true,
                content: `${maxAltitude}\u00b0`,
                position: "start",
                yAdjust: -10,
                backgroundColor: "transparent",
                color: isMockupView ? COLOR_MOCKUP_REFERENCE : colors.muted,
                font: {
                  family: isMockupView
                    ? "Inter, sans-serif"
                    : "Inter, sans-serif",
                  size: 9,
                  weight: 600,
                },
              },
            },
            linePeak: {
              type: "line",
              yMin: 90,
              yMax: 90,
              borderColor: isMockupView ? "#999" : `${colors.muted}33`,
              borderWidth: 1,
              borderDash: [3, 3],
              label: {
                display: true,
                content: "90\u00b0",
                position: "start",
                yAdjust: -10,
                backgroundColor: "transparent",
                color: isMockupView ? "#999" : `${colors.muted}66`,
                font: {
                  family: isMockupView
                    ? "Inter, sans-serif"
                    : "Inter, sans-serif",
                  size: 9,
                },
              },
            },
          },
        },
      },
    };
  };

  return (
    <div ref={containerRef}>
      {/* Dashboard View (Cyber Themed) */}
      <div
        className="h-40 w-full mt-4 p-4 bg-background/50 rounded-xl border border-border/50 shadow-inner relative overflow-hidden cursor-zoom-in group"
        onClick={() => setShowMockup(true)}
      >
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors z-10 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-card px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-border text-primary">
            Open Reference View
          </span>
        </div>
        <Line data={getChartData(false)} options={getOptions(false)} />
      </div>

      {/* Mockup Modal Overlay */}
      {showMockup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowMockup(false)}
        >
          <div
            className="w-full max-w-5xl bg-[#f3f4f6] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mockup Header */}
            <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-start">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-gray-800">
                  Sky Object Altitude
                </h1>
                <p className="text-gray-500 text-xs italic">
                  Path of object from sunrise to sunset (Chart.js
                  Implementation)
                </p>
              </div>
              <button
                onClick={() => setShowMockup(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Mockup Content */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
              <div className="bg-white p-6 md:p-12 rounded-xl shadow-lg flex flex-col min-h-[500px]">
                <div className="flex-1">
                  <Line data={getChartData(true)} options={getOptions(true)} />
                </div>

                {/* Mockup Footer Legend */}
                <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-100 pt-6 mt-6">
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-gray-400"></span>
                      <span>0\u00b0-30\u00b0 / 80\u00b0-90\u00b0 (1px)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-[3px] bg-[#1f77b4]"></span>
                      <span>30\u00b0-80\u00b0 (3px)</span>
                    </div>
                  </div>
                  <div className="font-medium tracking-tight">
                    STAIRS Instrumentation v3.1
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
