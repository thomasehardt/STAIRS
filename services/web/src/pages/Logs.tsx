import { useMemo, useState } from "react";
import { useLogs, useDeleteLog, useCreateLog } from "@/hooks/use-logs";
import {
  ClipboardList,
  Star,
  Trash2,
  Calendar,
  Target,
  Clock,
  Activity,
  Loader2,
  Plus,
  X,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function LogsPage() {
  const { data: logs, isLoading } = useLogs();
  const createLogMutation = useCreateLog();
  const deleteLogMutation = useDeleteLog();

  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newLogTarget, setNewLogTarget] = useState("");
  const [newLogNotes, setNewLogNotes] = useState("");
  const [newLogRating, setNewLogRating] = useState(3);
  const [newLogStatus, setNewLogStatus] = useState<
    "Captured" | "Attempted" | "Planned"
  >("Captured");
  const [newLogDate, setNewLogDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const stats = useMemo(() => {
    if (!logs || logs.length === 0)
      return { total: 0, captured: 0, attempted: 0, avgRating: 0 };

    const captured = logs.filter((l) => l.status === "Captured").length;
    const attempted = logs.filter((l) => l.status === "Attempted").length;

    const ratedLogs = logs.filter((l) => (l.rating ?? 0) > 0);
    const avgRating =
      ratedLogs.length > 0
        ? (
            ratedLogs.reduce((acc, l) => acc + (l.rating || 0), 0) /
            ratedLogs.length
          ).toFixed(1)
        : "0.0";

    return { total: logs.length, captured, attempted, avgRating };
  }, [logs]);

  const handleSaveLog = () => {
    if (!newLogTarget) return;
    createLogMutation.mutate(
      {
        target_id: newLogTarget,
        notes: newLogNotes,
        rating: newLogRating,
        status: newLogStatus,
        session_date: newLogDate,
      },
      {
        onSuccess: () => {
          setIsAddingLog(false);
          setNewLogTarget("");
          setNewLogNotes("");
          setNewLogRating(3);
          setNewLogStatus("Captured");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">
            Observation Logs
          </h1>
          <p className="text-muted-foreground">
            Review your past imaging sessions.
          </p>
        </div>
        <Button
          className="rounded-xl font-bold gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          onClick={() => setIsAddingLog(!isAddingLog)}
        >
          {isAddingLog ? (
            <X className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isAddingLog ? "Cancel" : "New Log Entry"}
        </Button>
      </div>

      {/* New Log Form */}
      {isAddingLog && (
        <div className="bg-card border border-primary/30 rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Record New Session
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Target Identifier
                </label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    value={newLogTarget}
                    onChange={(e) => setNewLogTarget(e.target.value)}
                    placeholder="e.g. M42, NGC 7000..."
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Status
                  </label>
                  <select
                    value={newLogStatus}
                    onChange={(e) => setNewLogStatus(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Captured">Captured</option>
                    <option value="Attempted">Attempted</option>
                    <option value="Planned">Planned</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newLogDate}
                    onChange={(e) => setNewLogDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Quality Rating
                </label>
                <div className="flex gap-2 bg-background p-3 rounded-xl border border-border">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewLogRating(star)}
                      className={`p-1 transition-all hover:scale-110 ${
                        newLogRating >= star
                          ? "text-amber-400"
                          : "text-muted-foreground/20"
                      }`}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          newLogRating >= star ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Notes & Details
                </label>
                <textarea
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  placeholder="Atmospheric conditions, equipment issues, processing notes..."
                  className="w-full h-[184px] bg-background border border-border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-mono"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 rounded-xl font-bold bg-primary text-primary-foreground h-12 shadow-lg shadow-primary/20"
                  onClick={handleSaveLog}
                  disabled={createLogMutation.isPending || !newLogTarget}
                >
                  {createLogMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Save Log Entry"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-border hover:bg-secondary/50 h-12"
                  onClick={() => setIsAddingLog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-black">{stats.total}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Total Sessions
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-black">{stats.captured}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Captured
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-black">{stats.attempted}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Attempted
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-black">{stats.avgRating}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Avg Rating
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {!logs || logs.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-card/50 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No logs found</h3>
          <p className="text-sm max-w-xs text-center mt-2">
            Your observation logs will appear here. Go to a Target's detail page
            or click "New Log Entry" to record a session.
          </p>
          <Link
            to="/catalogs"
            className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-sm transition-all hover:bg-primary/90"
          >
            Browse Catalogs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col md:flex-row gap-6 relative group transition-all hover:border-primary/40"
            >
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <Link
                        to={`/targets/${log.target_id}`}
                        className="font-black text-xl hover:text-primary transition-colors"
                      >
                        {log.target_id}
                      </Link>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md ${
                          log.status === "Captured"
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : log.status === "Attempted"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(log.session_date).toLocaleDateString(
                        undefined,
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < (log.rating ?? 0)
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {log.notes && (
                  <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                    <p className="text-sm text-foreground/90 italic">
                      "{log.notes}"
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => deleteLogMutation.mutate(log.id!)}
                className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                title="Delete Log"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
