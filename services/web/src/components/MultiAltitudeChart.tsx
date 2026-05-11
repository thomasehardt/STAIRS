import { useMemo } from "react";
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

interface QualityPoint {
  time: string;
  score: number;
}

interface MultiAltitudeChartProps {
  targetDatasets: {
    label: string;
    positions: { time: string; alt_deg: number }[];
  }[];
  qualityPoints?: QualityPoint[];
}

export function MultiAltitudeChart({
  targetDatasets,
  qualityPoints,
}: MultiAltitudeChartProps) {
  const { minAltitude, maxAltitude } = useSettings();

  const colors = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // rose
    "#8b5cf6", // violet
    "#06b6d4", // cyan
  ];

  const chartData = useMemo(() => {
    // Find the overall start time to align all series on the X-axis
    const allSeries = [
      ...targetDatasets.map((ds) => ds.positions),
      qualityPoints ? qualityPoints : [],
    ].filter((s) => s.length > 0);

    if (allSeries.length === 0) return { datasets: [] };

    // Reference time (X=0) will be the first point's time
    const refTime = new Date(allSeries[0][0].time);
    const startHour = refTime.getHours() + refTime.getMinutes() / 60;

    const datasets: any[] = [];

    // 1. Add Imaging Quality (as a filled area on y1 axis)
    if (qualityPoints && qualityPoints.length > 0) {
      datasets.push({
        label: "Imaging Quality",
        data: qualityPoints.map((p) => {
          const date = new Date(p.time);
          const offsetHours =
            (date.getTime() - refTime.getTime()) / (1000 * 60 * 60);
          return {
            x: startHour + offsetHours,
            y: p.score,
          };
        }),
        borderColor: "rgba(59, 130, 246, 0.5)",
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        fill: true,
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.3,
        yAxisID: "y1", // Use the right axis
      });
    }

    // 2. Add Target Altitudes (on y axis)
    targetDatasets.forEach((ds, idx) => {
      const color = colors[idx % colors.length];
      datasets.push({
        label: ds.label,
        data: ds.positions.map((p) => {
          const date = new Date(p.time);
          const offsetHours =
            (date.getTime() - refTime.getTime()) / (1000 * 60 * 60);
          return {
            x: startHour + offsetHours,
            y: Math.max(0, p.alt_deg),
          };
        }),
        borderColor: color,
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.2,
        fill: false,
        yAxisID: "y", // Use the left axis
        segment: {
          borderColor: (ctx: any) => {
            const y0 = ctx.p0.parsed.y;
            const y1 = ctx.p1.parsed.y;
            const avg = (y0 + y1) / 2;
            if (avg >= minAltitude - 0.1 && avg <= maxAltitude + 0.1)
              return color;
            return color + "44"; // Dimmer (lower opacity)
          },
          borderDash: (ctx: any) => {
            const y0 = ctx.p0.parsed.y;
            const y1 = ctx.p1.parsed.y;
            const avg = (y0 + y1) / 2;
            if (avg >= minAltitude - 0.1 && avg <= maxAltitude + 0.1) return [];
            return [4, 4]; // Dashed
          },
          borderWidth: (ctx: any) => {
            const y0 = ctx.p0.parsed.y;
            const y1 = ctx.p1.parsed.y;
            const avg = (y0 + y1) / 2;
            if (avg >= minAltitude - 0.1 && avg <= maxAltitude + 0.1) return 3;
            return 1.5; // Thinner
          },
        },
      });
    });

    return { datasets };
  }, [targetDatasets, qualityPoints]);

  // Find min/max X for scaling
  const xValues = chartData.datasets.flatMap((ds) =>
    ds.data.map((d: any) => d.x),
  );
  const xMin = xValues.length > 0 ? Math.floor(Math.min(...xValues)) : 0;
  const xMax = xValues.length > 0 ? Math.ceil(Math.max(...xValues)) : 12;

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      x: {
        type: "linear",
        min: xMin,
        max: xMax,
        ticks: {
          stepSize: 1,
          callback: (value) => {
            const h = Math.round(value as number) % 24;
            const ampm = h >= 12 ? "PM" : "AM";
            const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
            return `${dh}${ampm}`;
          },
          font: { family: "Inter, sans-serif", size: 11, weight: "bold" },
          color: "rgba(255, 255, 255, 0.8)",
        },
        grid: { display: false },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        min: 0,
        max: 90,
        title: { display: false },
        ticks: {
          stepSize: 30,
          font: { family: "Inter, sans-serif", size: 11, weight: "bold" },
          color: "rgba(255, 255, 255, 0.8)",
          callback: (value) => `${value}\u00b0`,
        },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        min: 0,
        max: 100,
        title: { display: false },
        ticks: {
          stepSize: 25,
          font: { family: "Inter, sans-serif", size: 11, weight: "bold" },
          color: "rgba(59, 130, 246, 0.8)",
          callback: (value) => `${value}%`,
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
          borderRadius: 5,
          font: { family: "Inter, sans-serif", size: 10, weight: "bold" },
          color: "rgba(255, 255, 255, 0.7)",
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "Inter, sans-serif" },
        bodyFont: { family: "Inter, sans-serif" },
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
          label: (item) => {
            const label = item.dataset.label;
            const val = item.parsed.y;
            if (val === null || val === undefined) return ` ${label}: N/A`;
            if (label === "Imaging Quality")
              return ` Quality: ${Math.round(val)}%`;
            return ` ${label}: ${val.toFixed(1)}\u00b0`;
          },
        },
      },
      annotation: {
        annotations: {
          minAltLine: {
            type: "line",
            yMin: minAltitude,
            yMax: minAltitude,
            borderColor: "rgba(239, 68, 68, 0.4)",
            borderWidth: 1.5,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `Min: ${minAltitude}\u00b0`,
              position: "start",
              backgroundColor: "transparent",
              color: "rgba(239, 68, 68, 0.7)",
              font: { family: "Inter, sans-serif", size: 10, weight: "bold" },
            },
          },
          maxAltLine: {
            type: "line",
            yMin: maxAltitude,
            yMax: maxAltitude,
            borderColor: "rgba(59, 130, 246, 0.4)",
            borderWidth: 1.5,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `Max: ${maxAltitude}\u00b0`,
              position: "start",
              backgroundColor: "transparent",
              color: "rgba(59, 130, 246, 0.7)",
              font: { family: "Inter, sans-serif", size: 10, weight: "bold" },
            },
          },
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
