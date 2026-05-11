import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useGeneratePlan, useExportCsv, useExportSkylist } from '@/hooks/use-plan';
import api from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import { usePlan } from '@/context/PlanContext';
import { useSkyQuality } from '@/hooks/use-sky-quality';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Loader2, Clock, Target, Activity, Layers, Star, Pin, PinOff, Telescope } from 'lucide-react';
import { TargetCard } from '@/components/TargetCard';

export function PlanGenerator() {
  const location = useLocation();
  const state = location.state as { initialStartTime?: string; initialLocationName?: string } | null;

  const { config, activeLocation, activeTelescope, minAltitude, setDefaultLocation } = useSettings();
  const { pinnedTargets, togglePin } = usePlan();
  const { data: qualityData } = useSkyQuality();
  const generatePlan = useGeneratePlan();
  const exportCsv = useExportCsv();
  const exportSkylist = useExportSkylist();

  // Initialize startTime state with state from location or default to current local time
  const [startTime, setStartTime] = useState(() => {
    let baseTime: Date;
    if (state?.initialStartTime) {
        baseTime = new Date(state.initialStartTime);
    } else {
        baseTime = new Date();
    }
    // Correct for local timezone offset to get the right numbers for datetime-local input
    const offset = baseTime.getTimezoneOffset() * 60000;
    return new Date(baseTime.getTime() - offset).toISOString().slice(0, 16);
  });
  const [discoveryData, setDiscoveryData] = useState<any>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Effect to update default location if initialLocationName is passed
  useEffect(() => {
    if (state?.initialLocationName && config) {
      const targetLoc = config.locations.find(l => l.name === state.initialLocationName);
      if (targetLoc && targetLoc.name !== activeLocation?.name) {
        setDefaultLocation(targetLoc.name);
      }
    }
  }, [state?.initialLocationName, config, activeLocation?.name, setDefaultLocation]);

  // Timeframe logic for charts
  const points = qualityData?.points || [];
  const nightStart = points[0] ? new Date(points[0].time) : null;
  const nightEnd = points[points.length - 1] ? new Date(points[points.length - 1].time) : null;

  // Helper to get location details, prioritizing state if activeLocation is not ready
  const currentLocation = activeLocation || (state?.initialLocationName ? { name: state.initialLocationName, latitude: 0, longitude: 0, elevation_m: 0, bortle_scale: 0 } : undefined);


  const getRequestParams = (selectedIds?: string[]) => ({
    latitude: currentLocation?.latitude,
    longitude: currentLocation?.longitude,
    location_name: currentLocation?.name,
    telescope_profile_name: activeTelescope,
    min_alt: minAltitude,
    start_time: startTime,
    elevation_m: currentLocation?.elevation_m,
    bortle_scale: currentLocation?.bortle_scale,
    include_targets: selectedIds || pinnedTargets.map(pt => pt.id),
  });

  // Step 1: Browse for targets (Discovery)
  const handleDiscover = async () => {
    // Use currentLocation to check if we have valid location data
    if (!currentLocation) return;
    setIsDiscovering(true);
    try {
        const { data } = await api.post('/plan/generate', getRequestParams([]));
        setDiscoveryData(data);
    } catch (err) {
        console.error("Discovery failed:", err);
    } finally {
        setIsDiscovering(false);
    }
  };

  // Step 2: Optimize the user's specific selection
  const handleOptimize = () => {
    // Use currentLocation for checks
    if (!currentLocation || pinnedTargets.length === 0) return;
    generatePlan.mutate(getRequestParams() as any);
  };

  const handleTogglePin = (id: string) => {
    const isAlreadyPinned = pinnedTargets.some(pt => pt.id === id);
    if (isAlreadyPinned) {
        togglePin({ id } as any);
    } else {
        const targetInfo = discoveryData?.recommendations.find((t: any) => t.target_id === id);
        if (targetInfo) {
            togglePin({
                id,
                common_name: targetInfo.common_name,
                target_type: targetInfo.target_type,
                score: targetInfo.final_score || 0
            });
        }
    }
  };

  const handleExportCsv = () => {
    exportCsv.mutate(getRequestParams() as any);
  };

  const handleExportSkylist = () => {
    exportSkylist.mutate(getRequestParams() as any);
  };

  // Modified to use currentLocation for rendering the loading state message
  if (!currentLocation) {
    return (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-card text-muted-foreground">
          <Loader2 className="w-12 h-12 mb-4 animate-spin opacity-20" />
          <p className="font-medium">Loading session configuration...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-4xl font-black tracking-tight uppercase">Plan Generator</h1>
            <p className="text-muted-foreground text-lg">Create a customized observation schedule for tonight.</p>
        </div>
        {generatePlan.isSuccess && (
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    className="rounded-xl border-primary/20 hover:bg-primary/5"
                    onClick={handleExportCsv}
                    disabled={exportCsv.isPending}
                >
                    {exportCsv.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2 text-primary" />}
                    CSV
                </Button>
                <Button
                    variant="outline"
                    className="rounded-xl border-primary/20 hover:bg-primary/5"
                    onClick={handleExportSkylist}
                    disabled={exportSkylist.isPending}
                >
                    {exportSkylist.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2 text-primary" />}
                    SkySafari
                </Button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 border rounded-3xl bg-card space-y-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Session Config
            </h3>

            <div className="space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Location</p>
                    {/* Display currentLocation.name, which might be from initial prop */}
                    <p className="text-sm font-bold truncate">{currentLocation?.name || 'N/A'}</p>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Equipment</p>
                    <p className="text-sm font-bold truncate">{activeTelescope}</p>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Start Time</p>
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                </div>
            </div>

            <Button
                className="w-full h-12 text-md font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/20"
                onClick={handleDiscover}
                disabled={isDiscovering}
            >
                {isDiscovering ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding Targets...
                </>
                ) : (
                'Discover Targets'
                )}
            </Button>
          </div>

          {/* New Pinned Targets Sidebar Section */}
          {pinnedTargets.length > 0 && (
            <div className="p-6 border rounded-3xl bg-card space-y-4 shadow-sm animate-in slide-in-from-left duration-300">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Pin className="w-4 h-4" />
                    Selected ({pinnedTargets.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                    {pinnedTargets.map(pt => (
                        <div key={pt.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-2xl border border-border/50 group hover:border-primary/30 transition-colors">
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-xs font-black font-mono truncate">{pt.id}</span>
                                {pt.common_name && (
                                    <span className="text-[10px] text-primary font-bold truncate leading-tight mt-0.5">{pt.common_name}</span>
                                )}
                                <span className="text-[9px] text-muted-foreground truncate font-medium uppercase tracking-tight opacity-70">
                                    {pt.target_type || 'Deep Sky Object'}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6 rounded-lg text-destructive hover:bg-destructive/10"
                                onClick={() => handleTogglePin(pt.id)}
                            >
                                <PinOff className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>

                <p className="text-[9px] text-muted-foreground italic text-center">AI will build the optimal timeline for these targets.</p>

                <Button
                    className="w-full h-10 text-xs font-black uppercase tracking-widest rounded-xl bg-primary hover:bg-primary/90 shadow-md"
                    onClick={handleOptimize}
                    disabled={generatePlan.isPending}
                >
                    {generatePlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Optimize Strategy'}
                </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-12 relative">
          {/* Subtle loading indicator overlay for optimization */}
          {generatePlan.isPending && (
                <div className="absolute top-0 right-0 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-primary border border-primary/20 p-3 rounded-2xl flex items-center gap-2 shadow-2xl">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span className="text-[10px] font-black uppercase text-white tracking-widest">Calculating Best Timeline...</span>
                    </div>
                </div>
          )}

          {generatePlan.isSuccess ? (
            <div className="space-y-12">
              <div className="flex items-center justify-between">
                {/* Session Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                    <SummaryCard
                        label="Targets"
                        value={generatePlan.data.timeline.length.toString()}
                        icon={Target}
                    />
                    <SummaryCard
                        label="Session Length"
                        value={generatePlan.data.astronomical_night_start && generatePlan.data.astronomical_night_end
                            ? `${((new Date(generatePlan.data.astronomical_night_end).getTime() - new Date(generatePlan.data.astronomical_night_start).getTime()) / (1000 * 60 * 60)).toFixed(1)}h`
                            : '0h'}
                        icon={Clock}
                    />
                    <SummaryCard
                        label="Dusk"
                        value={generatePlan.data.astronomical_night_start
                            ? new Date(generatePlan.data.astronomical_night_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'N/A'}
                        icon={Calendar}
                    />
                    <SummaryCard
                        label="Dawn"
                        value={generatePlan.data.astronomical_night_end
                            ? new Date(generatePlan.data.astronomical_night_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'N/A'}
                        icon={Calendar}
                    />
                </div>
              </div>

              {/* Generated Timeline Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black flex items-center gap-2">
                        <Clock className="w-6 h-6 text-primary" />
                        Optimal Imaging Strategy
                    </h3>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase bg-secondary px-3 py-1 rounded-full">
                        AI Optimized
                    </div>
                </div>
                <div className="relative">
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-border to-transparent" />

                    <div className="space-y-6 relative">
                        {generatePlan.data.timeline.map((block, i) => (
                        <div key={i} className="flex gap-8 group">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 relative group-hover:scale-110 transition-transform shadow-sm">
                                    <span className="text-[10px] font-black text-primary">{i + 1}</span>
                                </div>
                            </div>

                            <div className="flex-1 pb-2">
                                <div className="p-5 border rounded-3xl bg-card hover:border-primary/40 transition-all hover:shadow-md group/card">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <p className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                    {new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                    {new Date(block.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                {block.target_type && (
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-60">
                                                        {block.target_type}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black tracking-tight group-hover/card:text-primary transition-colors">{block.target_id}</h4>
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    {block.common_name || 'Deep Sky Object'}
                                                    {block.constellation && ` • ${block.constellation}`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 self-end md:self-center">
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Imaging Score</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-3xl font-black ${block.oss_score > 80 ? 'text-primary' : 'text-foreground'}`}>
                                                        {Math.round(block.oss_score)}
                                                    </span>
                                                    <span className="text-xs font-bold text-muted-foreground">/100</span>
                                                </div>
                                            </div>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${block.oss_score > 80 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                                <Activity className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Discovery Results Area */}
          {discoveryData && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black flex items-center gap-2">
                        <Star className="w-6 h-6 text-primary fill-primary/20" />
                        Target Discovery
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Top targets for your location</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {discoveryData.recommendations
                        .filter((t: any) => !pinnedTargets.some(pt => pt.id === t.target_id))
                        .map((target: any) => (
                        <TargetCard
                            key={target.target_id}
                            target={target as any}
                            onTogglePin={handleTogglePin}
                            isPinned={false}
                            nightStart={nightStart}
                            nightEnd={nightEnd}
                        />
                    ))}
                </div>
            </div>
          )}

          {!discoveryData && !generatePlan.isSuccess && (
            <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-card/50 text-muted-foreground group">
              <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Telescope className="w-10 h-10 opacity-20" />
              </div>
              <p className="font-bold text-lg text-foreground">Discovery Phase</p>
              <p className="text-sm max-w-xs text-center mt-2 opacity-60">Click "Discover Targets" to find the best objects visible tonight, or use the search to add specific ones.</p>
            </div>
          )}

          {generatePlan.isError && (
             <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-destructive/20 rounded-3xl bg-destructive/5 text-destructive p-8 text-center">
                <p className="font-black text-xl uppercase tracking-tight mb-2">Algorithm Halted</p>
                <p className="text-sm font-medium opacity-80 max-w-md">{(generatePlan.error as any)?.response?.data?.detail || generatePlan.error.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }: any) {
    return (
        <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">{label}</p>
                <p className="text-lg font-black">{value}</p>
            </div>
        </div>
    );
}
