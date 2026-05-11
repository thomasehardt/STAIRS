import { useSettings } from "@/context/SettingsContext";
import { useProfiles } from "@/hooks/use-config";
import { MapPin, Activity, Telescope, Check, Trash2 } from "lucide-react";
import { useState } from "react";

export function SettingsPage() {
  const {
    config,
    isLoading,
    activeLocation,
    activeTelescope,
    updatePlanning,
    setDefaultLocation,
    addLocation,
    deleteLocation,
    tempUnit,
    updateWeatherUnits,
  } = useSettings();

  // for adding/deleting locations
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLat, setNewLat] = useState("0");
  const [newLon, setNewLon] = useState("0");
  const [newBortle, setNewBortle] = useState("5");

  // fetch the hardware profiles
  const { data: profilesData } = useProfiles();

  if (isLoading)
    return (
      <div className="p-8 animate-pulse text-muted-foreground">
        Loading settings...
      </div>
    );

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-lg">
          Configure application settings
        </p>
      </div>

      {/* location management */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Observation Locations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config?.locations.map((loc) => (
            <div
              key={loc.name}
              className={`p-4 border rounded-2xl text-left transition-all relative group ${
                loc.name === activeLocation?.name
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <div className="flex justify-between items-start">
                <button
                  onClick={() => setDefaultLocation(loc.name)}
                  className="flex-1 text-left"
                >
                  <p className="font-bold text-lg">{loc.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </p>
                </button>

                <div className="flex items-center gap-2">
                  {loc.name === activeLocation?.name ? (
                    <div className="bg-primary text-primary-foreground p-1 rounded-full">
                      <Check className="w-3 h-3" />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLocation(loc.name);
                      }}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p1"
                      title="Delete Location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Bortle {loc.bortle_scale || "?"}
                </span>
              </div>
            </div>
          ))}
          {isAdding ? (
            <div className="p-4 border-2 border-primary/30 rounded-2xl bg-card space-y-3">
              <input
                placeholder="Location Name"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:rung-primary"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                {/* lat */}
                <div className="space-y1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:rung-primary"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                  />
                </div>
                {/* lon */}
                <div className="space-y1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:rung-primary"
                    value={newLon}
                    onChange={(e) => setNewLon(e.target.value)}
                  />
                </div>
                {/* bortle */}
                <div className="space-y1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                    Bortle
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9"
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:rung-primary"
                    value={newBortle}
                    onChange={(e) => setNewBortle(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addLocation({
                      name: newName,
                      latitude: Number(newLat),
                      longitude: Number(newLon),
                      elevation_m: 0,
                      bortle_scale: Number(newBortle),
                      default: false,
                    });
                    setIsAdding(false);
                    setNewName("");
                  }}
                  disabled={!newName}
                  className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Save location
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="p-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-2 h-[145px]"
            >
              <span className="text-sm font-bold">+ Add New Location</span>
            </button>
          )}
        </div>
      </section>

      {/* telescope profiles */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Telescope className="w-5 h-5 text-primary" />
          Telescope Profile
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profilesData?.profiles.map((profile) => (
            <button
              key={profile.name}
              onClick={() =>
                updatePlanning({ default_telescope: profile.name })
              }
              className={`p-4 border rounded-2xl text-left transition-all ${
                profile.name === activeTelescope
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <p className="font-bold">{profile.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase mt-1">
                {profile.aperture_mm}mm / {profile.focal_length_mm}mm
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* planning constraints */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 border rounded-3xl bg-card space-y-8">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Planning Constraints
          </h3>
          <div className="space-y-8">
            {/* min altitude */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Min Altitude
                </label>
                <span className="text-2xl font-black text-primary">
                  {config?.planning.min_altitude}\u00b0
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="5"
                value={config?.planning.min_altitude || 25}
                onChange={(e) =>
                  updatePlanning({ min_altitude: Number(e.target.value) })
                }
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            {/* max altitude */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Max Altitude
                </label>
                <span className="text-2xl font-black text-primary">
                  {config?.planning.max_altitude}\u00b0
                </span>
              </div>
              <input
                type="range"
                min="45"
                max="90"
                step="5"
                value={config?.planning.max_altitude || 75}
                onChange={(e) =>
                  updatePlanning({ max_altitude: Number(e.target.value) })
                }
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>

        <div className="p-8 border rounded-3xl bg-card space-y-8">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Display Units
          </h3>

          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Temperature
            </label>
            <div className="flex gap-2">
              {["C", "F"].map((unit) => (
                <button
                  key={unit}
                  onClick={() => updateWeatherUnits(unit as "C" | "F")}
                  className={`flex-1 py-3 rounded-2xl font-black transition-all border ${
                    tempUnit === unit
                      ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {unit === "C" ? "Celsius (\u00b0C)" : "Fahrenheit (\u00b0F)"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">
              This setting is saved to your global configuration and applies to
              all weather displays.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
