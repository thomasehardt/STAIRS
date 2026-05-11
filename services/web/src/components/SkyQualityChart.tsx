import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  annotationPlugin,
);

interface QualityPoint {
  time: string;
  score: number;
  moon_mult: number;
  weather_mult: number;
  seeing_mult?: number | null;
}

interface SkyQualityChartProps {
  points: QualityPoint[];
}

export function SkyQualityChart({ points }: SkyQualityChartProps) {
  const chartData = useMemo(() => {
    return {
      labels: points.map((p) => {
        const d = new Date(p.time);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }),
      datasets: [
        {
          label: "Moon Influence",
          data: points.map((p) => Math.round(p.moon_mult * 100)),
          borderColor: "rgba(255, 206, 86, 0.4)",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.4,
        },
        {
          label: "Weather Impact",
          data: points.map((p) => Math.round(p.weather_mult * 100)),
          borderColor: "rgba(75, 192, 192, 0.4)",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderDash: [2, 2],
          pointRadius: 0,
          tension: 0.4,
        },
        {
          label: "Total Quality",
          data: points.map((p) => p.score),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          fill: true,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.4,
        },
      ],
    };
  }, [points]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(10, 14, 26, 0.95)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        callbacks: {
          label: (context: any) =>
            ` ${context.dataset.label}: ${context.parsed.y}%`,
        },
      },
      annotation: {
        annotations: {
          nowLine: {
            type: "line" as const,
            xMin: points.findIndex((p) => new Date(p.time) >= new Date()),
            xMax: points.findIndex((p) => new Date(p.time) >= new Date()),
            borderColor: "rgba(59, 130, 246, 0.5)",
            borderWidth: 2,
            borderDash: [5, 5],
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
          font: { size: 10 },
          color: "rgba(255, 255, 255, 0.5)",
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: {
          stepSize: 25,
          font: { size: 10 },
          color: "rgba(255, 255, 255, 0.5)",
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
