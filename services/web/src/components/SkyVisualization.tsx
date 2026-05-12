import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { components } from "@/types/api";

type SkyStatusPoint = components["schemas"]["SkyStatusPoint"];
type PositionPoint = components["schemas"]["PositionPoint"];

interface SkyVisualizationProps {
  timeline: SkyStatusPoint[];
  locationName: string;
  visibleTargetIds: string[];
}

export function SkyVisualization({
  timeline,
  locationName,
  visibleTargetIds,
}: SkyVisualizationProps) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Animation Loop - Increased frequency for smoothness
  useEffect(() => {
    let timer: number;
    if (isPlaying && timeline.length > 0) {
      timer = window.setInterval(() => {
        setIndex((prev) => (prev + 1) % timeline.length);
      }, 300); // Faster, smoother steps
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, timeline.length]);

  // Ensure index is within bounds if timeline changes
  const safeIndex = index < timeline.length ? index : 0;
  const current = timeline[safeIndex];

  if (!current) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs text-center p-8">
        Telemetry unavailable for this time segment.
      </div>
    );
  }

  const size = 400;
  const center = size / 2;
  const radius = size / 2 - 40;

  const project = (alt: number, az: number) => {
    // Project altitude and azimuth to polar coordinates
    const r = ((90 - alt) / 90) * radius;
    const angle = (az - 90) * (Math.PI / 180);
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const moonPos = project(current.moon_alt, current.moon_az);
  const isMoonValid = !isNaN(moonPos.x) && !isNaN(moonPos.y);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative aspect-square w-full max-w-[500px] mx-auto bg-slate-950 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden group">
        {/* Polar Grid */}
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          {/* Background circles */}
          {[30, 60, 0].map((alt) => (
            <circle
              key={alt}
              cx={center}
              cy={center}
              r={((90 - alt) / 90) * radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              strokeDasharray={alt === 0 ? "none" : "4 4"}
            />
          ))}

          {/* Compass labels */}
          {["N", "E", "S", "W"].map((dir, i) => {
            const angle = (i * 90 - 90) * (Math.PI / 180);
            const x = center + (radius + 20) * Math.cos(angle);
            const y = center + (radius + 20) * Math.sin(angle);
            return (
              <text
                key={dir}
                x={x}
                y={y}
                textAnchor="middle"
                alignmentBaseline="middle"
                className="fill-slate-500 font-black text-[10px]"
              >
                {dir}
              </text>
            );
          })}

          {/* Crosshair */}
          <line
            x1={center}
            y1={center - radius}
            x2={center}
            y2={center + radius}
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />
          <line
            x1={center - radius}
            y1={center}
            x2={center + radius}
            y2={center}
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />

          {/* Moon */}
          {current.moon_alt > 0 && isMoonValid && (
            <g
              transform={`translate(${moonPos.x - 10}, ${moonPos.y - 10})`}
              className="transition-transform duration-300 ease-linear"
            >
              <circle
                cx="10"
                cy="10"
                r="10"
                className="fill-white opacity-10 blur-sm"
              />
              <circle cx="10" cy="10" r="6" className="fill-slate-100" />
              {/* phase shadow */}
              <circle
                cx={10 + ((current.moon_phase ?? 0.5) - 0.5) * 8}
                cy="10"
                r="6.5"
                className="fill-slate-950 transition-all duration-300"
                style={{ opacity: Math.max(0, 1 - (current.moon_phase ?? 0)) }}
              />
              <text
                x="10"
                y="24"
                textAnchor="middle"
                className="fill-white font-black text-[9px] uppercase tracking-widest drop-shadow-md"
              >
                Moon
              </text>
            </g>
          )}

          {/* Targets */}
          {Object.entries(current.target_positions).map(([id, pos]) => {
            const pPoint = pos as PositionPoint;
            if (
              !id ||
              id.trim() === "" ||
              id === "null" ||
              !visibleTargetIds.includes(id)
            )
              return null;
            if (!pPoint || isNaN(pPoint.alt_deg)) return null;

            const isUp = pPoint.alt_deg >= 0;
            // Project to map - if below horizon, show on edge with low opacity
            const p = project(Math.max(-2, pPoint.alt_deg), pPoint.az_deg);
            if (isNaN(p.x) || isNaN(p.y)) return null;

            return (
              <g
                key={id}
                className="transition-transform duration-300 ease-linear"
                style={{
                  transform: `translate(${p.x}px, ${p.y}px)`,
                  opacity: isUp ? 1 : 0.2,
                }}
              >
                <circle
                  cx="0"
                  cy="0"
                  r={isUp ? 4 : 2}
                  className={`${
                    isUp ? "fill-primary animate-pulse" : "fill-slate-500"
                  }`}
                />
                {isUp && (
                  <text
                    x="8"
                    y="4"
                    className="fill-primary font-bold text-[8px] uppercase tracking-tighter"
                  >
                    {id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-col gap-4">
        {/* Current Time Display */}
        <div className="flex justify-center">
          <div className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-lg flex items-baseline gap-3">
            <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">
              {locationName}
            </span>
            <span className="text-base font-mono font-black text-white tracking-widest">
              {new Date(current.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Animation Controls & Integrated Timeline */}
        <div className="flex items-center gap-4 px-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shrink-0 h-10 w-10 border-slate-800 bg-slate-900/50 hover:bg-primary/20 hover:border-primary/50 text-white"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 fill-current" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0 h-10 w-10 text-slate-500 hover:text-white"
            onClick={() => {
              setIndex(0);
              setIsPlaying(false);
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <div className="flex-1 flex flex-col gap-2 px-4">
            <div className="relative group">
              <input
                type="range"
                min={0}
                max={timeline.length - 1}
                step={1}
                value={index}
                onChange={(e) => setIndex(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary group-hover:h-2 transition-all"
              />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-primary/40 rounded-l-lg pointer-events-none group-hover:h-2 transition-all"
                style={{ width: `${(index / (timeline.length - 1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono font-bold text-slate-600 uppercase tracking-tighter">
              {timeline
                .filter((_, i) => i % 4 === 0 || i === timeline.length - 1)
                .map((point, i) => (
                  <span
                    key={i}
                    className={
                      index === timeline.indexOf(point) ? "text-primary" : ""
                    }
                  >
                    {new Date(point.time).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
