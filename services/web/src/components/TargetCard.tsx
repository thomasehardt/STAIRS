import { useMemo } from "react";
import { Telescope, MapPin, Activity, Pin, PinOff, Clock } from "lucide-react";
import { useTargetPosition } from "@/hooks/use-target-position";
import { AltitudeChart } from "./AltitudeChart";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings-context";
import { useProfiles } from "@/hooks/use-config";
import type { components } from "@/types/api";

// Helper to render the seasonal visibility bar
function SeasonalBar({ season }: { season: string | null }) {
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const seasonMonths: Record<string, number[]> = {
    winter: [11, 0, 1], // Dec, Jan, Feb
    spring: [2, 3, 4], // Mar, Apr, May
    summer: [5, 6, 7], // Jun, Jul, Aug
    autumn: [8, 9, 10], // Sep, Oct, Nov
  };

  const activeMonths = season ? seasonMonths[season.toLowerCase()] || [] : [];

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
          Season
        </span>
        <span className="text-[10px] font-black uppercase text-primary tracking-widest">
          {season || "All Year"}
        </span>
      </div>
      <div className="flex gap-0.5 h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden">
        {months.map((_, i) => (
          <div
            key={i}
            className={`flex-1 transition-colors ${
              activeMonths.includes(i) ? "bg-primary" : "bg-transparent"
            }`}
            title={months[i]}
          />
        ))}
      </div>
      <div className="flex justify-between px-0.5">
        {["Jan", "Dec"].map((m) => (
          <span
            key={m}
            className="text-[9px] font-bold text-muted-foreground/40 uppercase"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

// Helper to render the FOV preview
function FovPreview({
  targetSize,
  telescopeName,
}: {
  targetSize?: number[] | null;
  telescopeName: string;
}) {
  const { data: profilesData } = useProfiles();

  const fov = useMemo(() => {
    if (!profilesData?.profiles || !targetSize || targetSize.length === 0)
      return null;
    const profile = profilesData.profiles.find((p) => p.name === telescopeName);
    if (!profile) return null;

    // Calculate sensor FOV in arcminutes
    // FOV = 2 * arctan(sensor_size / (2 * focal_length))
    const calcFov = (
      sensorPx: number,
      pixelPitchUm: number,
      focalLengthMm: number,
    ) => {
      const sensorSizeMm = (sensorPx * pixelPitchUm) / 1000;
      return (
        2 * Math.atan(sensorSizeMm / (2 * focalLengthMm)) * (180 / Math.PI) * 60
      );
    };

    const fovX = calcFov(
      profile.sensor_x,
      profile.pixel_pitch_um,
      profile.focal_length_mm,
    );
    const fovY = calcFov(
      profile.sensor_y,
      profile.pixel_pitch_um,
      profile.focal_length_mm,
    );

    // Target size (convert degrees from backend to arcminutes)
    const tX = targetSize[0] * 60;
    const tY = (targetSize[1] || targetSize[0]) * 60;

    // Scale for display (container is square, let's assume 100% is the larger of fovX/fovY)
    const maxFov = Math.max(fovX, fovY, tX, tY) * 1.3;

    return {
      sensorW: (fovX / maxFov) * 100,
      sensorH: (fovY / maxFov) * 100,
      targetW: (tX / maxFov) * 100,
      targetH: (tY / maxFov) * 100,
      tX,
    };
  }, [profilesData, targetSize, telescopeName]);

  if (!fov) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
          FOV Scale
        </span>
        <span className="text-[10px] font-black uppercase text-primary tracking-widest">
          {fov.tX.toLocaleString(undefined, { maximumSignificantDigits: 2 })}{" "}
          arcmin
        </span>
      </div>
      <div className="aspect-square w-full bg-background/50 rounded-xl border border-border/50 relative flex items-center justify-center overflow-hidden">
        {/* Target Representation */}
        <div
          className="absolute border-2 border-primary/40 bg-primary/10 rounded-full"
          style={{ width: `${fov.targetW}%`, height: `${fov.targetH}%` }}
        />
        {/* Sensor Frame */}
        <div
          className="absolute border border-white/60 bg-transparent rounded-sm"
          style={{ width: `${fov.sensorW}%`, height: `${fov.sensorH}%` }}
        />
      </div>
    </div>
  );
}

interface TargetLike {
  identifier?: string;
  target_id?: string;
  common_name?: string | null;
  target_type: string;
  constellation: string;
  magnitude?: number | null;
  angular_size?: number[] | null;
  season?: string | null;
  sqs_score?: number | null;
  aqs_score?: number | null;
  oss_score?: number | null;
  exposure?: components["schemas"]["ExposureRecommendation"] | null;
}

export function TargetCard({
  target,
  nightStart,
  nightEnd,
  onTogglePin,
  isPinned,
  variant = "standard",
}: {
  target: TargetLike;
  nightStart: Date | null;
  nightEnd: Date | null;
  onTogglePin?: (id: string) => void;
  isPinned?: boolean;
  variant?: "standard" | "catalog";
}) {
  const { activeTelescope } = useSettings();
  const id = target.target_id || target.identifier || "unknown";

  const { data: posData, isLoading: posLoading } = useTargetPosition(
    id,
    variant === "standard" ? nightStart : null,
    variant === "standard" ? nightEnd : null,
  );

  const transitInfo = useMemo(() => {
    if (!posData?.positions || posData.positions.length === 0) return null;
    const sorted = [...posData.positions].sort((a, b) => b.alt_deg - a.alt_deg);
    const peak = sorted[0];
    return {
      alt: Math.round(peak.alt_deg),
      time: new Date(peak.time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  }, [posData]);

  return (
    <div
      className={`p-5 transition-all border rounded-[2.5rem] bg-card hover:border-primary/40 hover:shadow-xl group relative flex flex-col min-h-[400px] ${
        isPinned
          ? "border-primary shadow-md ring-1 ring-primary/20"
          : "border-border"
      } ${onTogglePin ? "cursor-pointer" : ""}`}
      onClick={() => onTogglePin?.(id)}
    >
      {/* Header Area */}
      <div className="space-y-3 mb-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Telescope className="w-5 h-5 text-primary shrink-0" />
              <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors truncate">
                {target.common_name || id}
              </h3>
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight truncate">
              {target.common_name ? id : target.target_type}
            </p>
          </div>

          {onTogglePin && (
            <Button
              variant="ghost"
              size="icon"
              className={`w-9 h-9 rounded-full shrink-0 transition-all ${
                isPinned
                  ? "bg-primary text-white hover:bg-primary/90 shadow-lg"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(id);
              }}
            >
              {isPinned ? (
                <PinOff className="w-5 h-5" />
              ) : (
                <Pin className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-primary/10 text-primary border border-primary/20">
            {target.target_type}
          </span>
          {target.sqs_score !== undefined && (
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-primary leading-none">
                  {Math.round(target.sqs_score || 0)}
                </span>
                <span className="text-[10px] font-black text-primary/50 uppercase tracking-tighter">
                  REL
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-primary leading-none">
                  {Math.round(target.aqs_score || target.oss_score || 0)}
                </span>
                <span className="text-[10px] font-black text-primary/50 uppercase tracking-tighter">
                  ABS
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col space-y-6">
        {/* Core Discovery Metrics (Vertical Stack) */}
        <div className="space-y-4">
          <FovPreview
            targetSize={target.angular_size}
            telescopeName={activeTelescope}
          />
          <SeasonalBar season={target.season ?? null} />
        </div>

        {/* Technical Specs */}
        <div className="grid grid-cols-1 gap-2">
          <DetailItem
            label="Const"
            value={target.constellation}
            icon={MapPin}
          />
          <DetailItem
            label="Mag"
            value={target.magnitude ?? "N/A"}
            icon={Activity}
          />
        </div>

        {/* Exposure Recommendations */}
        {target.exposure && (
          <div className="grid grid-cols-2 gap-2">
            <DetailItem
              label="Optimal Sub"
              value={`${target.exposure.optimal_sub_s}s`}
              icon={Clock}
            />
            <DetailItem
              label="Target Session"
              value={`${target.exposure.total_integration_h}h`}
              icon={Activity}
            />
          </div>
        )}

        {/* Dynamic Context (Transit or Chart) */}
        <div className="mt-auto pt-4 border-t border-border/50">
          {variant === "catalog" ? (
            transitInfo ? (
              <div className="bg-secondary/30 p-4 rounded-[1.5rem] border border-border/50">
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 leading-none">
                  Tonight's Peak Transit
                </p>
                <p className="text-xl font-black text-primary leading-none">
                  {transitInfo.alt}\u00b0 @ {transitInfo.time}
                </p>
              </div>
            ) : null
          ) : (
            <div className="h-32">
              {posLoading ? (
                <div className="h-full w-full animate-pulse bg-secondary/20 rounded-2xl flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Calculating Orbit...
                  </span>
                </div>
              ) : posData ? (
                <AltitudeChart data={posData.positions} />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground italic">
                  No position data available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-background/50 border border-border/50">
      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase font-black text-muted-foreground leading-none tracking-widest">
          {label}
        </span>
        <span className="text-sm font-black truncate">{value}</span>
      </div>
    </div>
  );
}
