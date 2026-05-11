import { useMemo, useState } from "react";
import { RotateCw, Maximize2, Minimize2, Telescope } from "lucide-react";
import { useProfiles } from "@/hooks/use-config";

interface FovSimulatorProps {
  targetSize: number[]; // [width, height] in arcminutes
  targetName: string;
  defaultTelescopeName: string;
}

export function FovSimulator({
  targetSize,
  targetName,
  defaultTelescopeName,
}: FovSimulatorProps) {
  const { data: profilesData } = useProfiles();
  const [selectedTelescopeName, setSelectedTelescopeName] =
    useState(defaultTelescopeName);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const selectedTelescope = useMemo(() => {
    return (
      profilesData?.profiles.find((p) => p.name === selectedTelescopeName) ||
      profilesData?.profiles.find((p) => p.name === defaultTelescopeName) ||
      profilesData?.profiles[0]
    );
  }, [profilesData, selectedTelescopeName, defaultTelescopeName]);

  const fov = useMemo(() => {
    if (!selectedTelescope || !targetSize || targetSize.length === 0)
      return null;

    // Calculate sensor FOV in arcminutes
    // FOV = 2 * arctan(sensor_size_mm / (2 * focal_length_mm))
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
      selectedTelescope.sensor_x,
      selectedTelescope.pixel_pitch_um,
      selectedTelescope.focal_length_mm,
    );
    const fovY = calcFov(
      selectedTelescope.sensor_y,
      selectedTelescope.pixel_pitch_um,
      selectedTelescope.focal_length_mm,
    );

    const tX = targetSize[0];
    const tY = targetSize[1] || targetSize[0];

    // Scaling for the view area
    // We want the larger of FOV or Target to fit nicely with some padding
    const baseScale = Math.max(fovX, fovY, tX, tY) * 1.3;
    const viewScale = baseScale / zoom;

    return {
      sensorW: (fovX / viewScale) * 100,
      sensorH: (fovY / viewScale) * 100,
      targetW: (tX / viewScale) * 100,
      targetH: (tY / viewScale) * 100,
      fovX,
      fovY,
      tX,
      tY,
      fits: tX <= fovX && tY <= fovY, // Simplified check
    };
  }, [selectedTelescope, targetSize, zoom]);

  if (!fov || !selectedTelescope) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative aspect-square w-full max-w-[500px] mx-auto bg-slate-950 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden group">
        {/* Background Star Pattern (Simulated) */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* The Viewport */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          {/* Target Representation */}
          <div
            className="absolute border-2 border-primary/30 bg-primary/5 rounded-full transition-all duration-500 flex items-center justify-center"
            style={{ width: `${fov.targetW}%`, height: `${fov.targetH}%` }}
          >
            <span className="text-[10px] font-black uppercase text-primary/40 tracking-tighter text-center px-2">
              {targetName}
            </span>
          </div>

          {/* Sensor Frame (Rotatable) */}
          <div
            className="absolute border-2 border-white/60 bg-white/5 rounded shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300 ease-out flex items-center justify-center overflow-hidden"
            style={{
              width: `${fov.sensorW}%`,
              height: `${fov.sensorH}%`,
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {/* Crosshair */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-1/2 left-0 w-full h-px bg-white" />
              <div className="absolute left-1/2 top-0 h-full w-px bg-white" />
            </div>
            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest pointer-events-none">
              Sensor Field
            </span>
          </div>
        </div>

        {/* Legend / Overlay */}
        <div className="absolute top-6 left-6 space-y-1">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">
            Field of View
          </p>
          <p className="text-xl font-black text-white">
            {selectedTelescope.name}
          </p>
        </div>

        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  fov.fits
                    ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                }`}
              />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                {fov.fits ? "Framing Optimal" : "Clipping Detected"}
              </span>
            </div>
            <p className="text-[9px] font-medium text-white/60 leading-none">
              Target: {fov.tX.toFixed(1)}' \u00d7 {fov.tY.toFixed(1)}'
            </p>
            <p className="text-[9px] font-medium text-white/60 leading-none">
              Sensor: {fov.fovX.toFixed(1)}' \u00d7 {fov.fovY.toFixed(1)}'
            </p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-black text-white leading-none">
              {rotation}\u00b0
            </p>
            <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">
              Rotation
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-card border border-border rounded-2xl space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Telescope className="w-3.5 h-3.5" /> Hardware Profile
              </label>
            </div>
            <select
              value={selectedTelescopeName}
              onChange={(e) => setSelectedTelescopeName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {profilesData?.profiles.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-card border border-border rounded-2xl space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5" /> Sensor Rotation
              </label>
              <span className="text-xs font-mono font-bold text-primary">
                {rotation}\u00b0
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              step="1"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-2xl space-y-4">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Maximize2 className="w-3.5 h-3.5" /> Digital Zoom
            </label>
            <span className="text-xs font-mono font-bold text-primary">
              {zoom.toFixed(1)}x
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Minimize2 className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
