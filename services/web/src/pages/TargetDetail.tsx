import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { components } from "@/types/api";
import { AltitudeChart } from "@/components/AltitudeChart";
import { useTargetPosition } from "@/hooks/use-target-position";
import { useSettings } from "@/context/SettingsContext";
import { usePlan } from "@/context/PlanContext";
import { useSkyQuality } from "@/hooks/use-sky-quality";
import { useTargetLogs, useCreateLog, useDeleteLog } from "@/hooks/use-logs";
import {
  Telescope,
  MapPin,
  Activity,
  Ruler,
  Info,
  Loader2,
  Pin,
  PinOff,
  Calendar,
  Plus,
  Star,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FovSimulator } from "@/components/FovSimulator";

type TargetDetail = components["schemas"]["TargetDetail"];

export function TargetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activeTelescope } = useSettings();
  const { pinnedTargets, togglePin } = usePlan();
  const { data: qualityData } = useSkyQuality();

  // Timeframe logic for charts
  const points = qualityData?.points || [];
  const nightStart = points[0] ? new Date(points[0].time) : null;
  const nightEnd = points[points.length - 1]
    ? new Date(points[points.length - 1].time)
    : null;

  const { data: target, isLoading: targetLoading } = useQuery({
    queryKey: ["target", id],
    queryFn: async () => {
      const { data } = await api.get<TargetDetail>(
        `/targets/${id}?profile_name=${activeTelescope}`,
      );
      return data;
    },
    enabled: !!id,
  });

  const { data: posData, isLoading: posLoading } = useTargetPosition(
    id || "",
    nightStart,
    nightEnd,
  );

  // Logging Data
  const { data: logs, isLoading: logsLoading } = useTargetLogs(id || "");
  const createLogMutation = useCreateLog();
  const deleteLogMutation = useDeleteLog();

  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newLogNotes, setNewLogNotes] = useState("");
  const [newLogRating, setNewLogRating] = useState(3);

  const isPinned = pinnedTargets.some((pt) => pt.id === id);

  const handleTogglePin = () => {
    if (!target) return;
    togglePin({
      id: target.identifier,
      common_name: target.common_name,
      target_type: target.target_type,
      score: 0,
    });
  };

  const handleSaveLog = () => {
    if (!id) return;
    createLogMutation.mutate(
      {
        target_id: id,
        notes: newLogNotes,
        rating: newLogRating,
        status: "Captured",
        session_date: new Date().toISOString().split("T")[0],
      },
      {
        onSuccess: () => {
          setIsAddingLog(false);
          setNewLogNotes("");
          setNewLogRating(3);
        },
      },
    );
  };

  if (targetLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!target) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-border rounded-3xl bg-card text-muted-foreground">
        Target not found.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 rounded-full">
              {target.target_type}
            </span>
            <span className="text-muted-foreground font-mono text-sm">
              {target.catalog_id}
            </span>
          </div>
          <h1 className="text-5xl font-black tracking-tight">
            {target.common_name || target.identifier}
          </h1>
          <p className="text-2xl text-muted-foreground font-medium">
            {target.common_name ? target.identifier : target.target_type}
          </p>
        </div>

        <div className="flex gap-4 self-stretch md:self-auto">
          <button
            onClick={handleTogglePin}
            className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2 ${
              isPinned
                ? "bg-secondary text-foreground hover:bg-secondary/80"
                : "bg-primary text-primary-foreground shadow-primary/20"
            }`}
          >
            {isPinned ? (
              <>
                <PinOff className="w-5 h-5" /> Remove from Plan
              </>
            ) : (
              <>
                <Pin className="w-5 h-5" /> Add to Tonight's Plan
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="p-8 border rounded-[2.5rem] bg-card space-y-6 shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Altitude Tonight
            </h3>
            <div className="h-80 w-full">
              {posLoading ? (
                <div className="h-full w-full bg-secondary/20 animate-pulse rounded-xl" />
              ) : posData ? (
                <AltitudeChart data={posData.positions} />
              ) : null}
            </div>
          </div>

          <div className="p-8 border rounded-[2.5rem] bg-card space-y-6 shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Object Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <DetailItem
                label="Constellation"
                value={target.constellation || "N/A"}
                icon={MapPin}
              />
              <DetailItem
                label="Magnitude"
                value={target.magnitude?.toString() || "N/A"}
                icon={Activity}
              />
              <DetailItem
                label="Size"
                value={
                  target.angular_size
                    ? `${target.angular_size[0]}' \u00d7 ${target.angular_size[1]}'`
                    : "N/A"
                }
                icon={Ruler}
              />
              <DetailItem
                label="Distance"
                value={target.distance ? `${target.distance} kly` : "N/A"}
                icon={Telescope}
              />
              {target.exposure && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-1 space-y-8">
          <div className="p-8 border rounded-[2.5rem] bg-card space-y-6 shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Telescope className="w-5 h-5 text-primary" />
              FOV Simulator
            </h3>
            <FovSimulator
              targetSize={target.angular_size || [10]}
              targetName={target.identifier}
              defaultTelescopeName={activeTelescope}
              imageUrl={target.image_url}
              imageFov={target.image_fov_deg}
            />
          </div>

          {/* Observation Logs Section */}
          <div className="p-8 border rounded-[2.5rem] bg-card space-y-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Observations
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                onClick={() => setIsAddingLog(!isAddingLog)}
              >
                {isAddingLog ? (
                  <PinOff className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>

            {isAddingLog && (
              <div className="p-4 bg-secondary/20 rounded-2xl border border-border space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Log New Session
                </h4>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewLogRating(star)}
                        className={`p-1 transition-colors ${
                          newLogRating >= star
                            ? "text-amber-400"
                            : "text-muted-foreground/30 hover:text-amber-400/50"
                        }`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Notes
                  </label>
                  <textarea
                    value={newLogNotes}
                    onChange={(e) => setNewLogNotes(e.target.value)}
                    placeholder="Equipment used, conditions, post-processing thoughts..."
                    className="w-full h-24 bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 rounded-xl font-bold bg-primary text-primary-foreground"
                    onClick={handleSaveLog}
                    disabled={createLogMutation.isPending}
                  >
                    {createLogMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Save Log"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-border hover:bg-secondary/50"
                    onClick={() => setIsAddingLog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs && logs.length > 0 ? (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 bg-background/50 rounded-2xl border border-border/50 space-y-2 group relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {new Date(log.session_date).toLocaleDateString()}
                      </span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < (log.rating ?? 0)
                                ? "text-amber-400 fill-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {log.notes && (
                      <p className="text-sm italic text-foreground/80">
                        {log.notes}
                      </p>
                    )}
                    <span className="inline-block px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-secondary text-muted-foreground rounded-md">
                      {log.status}
                    </span>

                    <button
                      onClick={() => deleteLogMutation.mutate(log.id!)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                      title="Delete Log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    No logs yet.
                  </p>
                  <p className="text-xs text-muted-foreground px-4">
                    Record your first observation of this target.
                  </p>
                </div>
              )}
            </div>
          </div>
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
  value: string;
  icon: any;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}
