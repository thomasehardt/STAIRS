import { useState } from "react";
import { TargetCard } from "@/components/TargetCard";
import {
  Search,
  Loader2,
  Filter,
  Eraser,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePlan } from "@/hooks/use-plan-context";
import { useSkyQuality } from "@/hooks/use-sky-quality";
import { useTargets } from "@/hooks/use-targets";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";

const TARGET_TYPES = [
  "All Types",
  "Galaxy",
  "Emission Nebula",
  "Planetary Nebula",
  "Reflection Nebula",
  "Dark Nebula",
  "Globular Cluster",
  "Open Cluster",
  "Star Cluster",
  "Asterism",
  "Double star",
  "Star",
  "Quasar",
];

const CONSTELLATIONS = [
  "All Constellations",
  "Andromeda",
  "Antlia",
  "Apus",
  "Aquarius",
  "Aquila",
  "Ara",
  "Aries",
  "Auriga",
  "Bootes",
  "Caelum",
  "Camelopardalis",
  "Cancer",
  "Canes Venatici",
  "Canis Major",
  "Canis Minor",
  "Capricornus",
  "Carina",
  "Cassiopeia",
  "Centaurus",
  "Cepheus",
  "Cetus",
  "Chamaeleon",
  "Circinus",
  "Columba",
  "Coma Berenices",
  "Corona Australis",
  "Corona Borealis",
  "Corvus",
  "Crater",
  "Crux",
  "Cygnus",
  "Delphinus",
  "Dorado",
  "Draco",
  "Equuleus",
  "Eridanus",
  "Fornax",
  "Gemini",
  "Grus",
  "Hercules",
  "Horologium",
  "Hydra",
  "Hydrus",
  "Indus",
  "Lacerta",
  "Leo",
  "Leo Minor",
  "Lepus",
  "Libra",
  "Lupus",
  "Lynx",
  "Lyra",
  "Mensa",
  "Microscopium",
  "Monoceros",
  "Musca",
  "Norma",
  "Octans",
  "Ophiuchus",
  "Orion",
  "Pavo",
  "Pegasus",
  "Perseus",
  "Phoenix",
  "Pictor",
  "Pisces",
  "Piscis Austrinus",
  "Puppis",
  "Pyxis",
  "Reticulum",
  "Sagitta",
  "Sagittarius",
  "Scorpius",
  "Sculptor",
  "Scutum",
  "Serpens",
  "Sextans",
  "Taurus",
  "Telescopium",
  "Triangulum",
  "Triangulum Australe",
  "Tucana",
  "Ursa Major",
  "Ursa Minor",
  "Vela",
  "Virgo",
  "Volans",
  "Vulpecula",
];

const CATALOGS = ["Messier", "NGC", "IC", "Caldwell"];

export function CatalogsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [catalog, setCatalog] = useState("Messier");
  const [targetType, setTargetType] = useState("All Types");
  const [constellation, setConstellation] = useState("All Constellations");
  const [maxMagnitude, setMaxMagnitude] = useState(20);
  const [limit, setLimit] = useState(50);
  const [showFilters, setShowFilters] = useState(false);

  const { pinnedTargets, togglePin } = usePlan();
  const { data: qualityData } = useSkyQuality();

  // Timeframe logic for charts
  const points = qualityData?.points || [];
  const nightStart = points[0] ? new Date(points[0].time) : null;
  const nightEnd = points[points.length - 1]
    ? new Date(points[points.length - 1].time)
    : null;

  const {
    data: targets,
    isLoading,
    isFetching,
  } = useTargets({
    search: debouncedSearch,
    catalog,
    type: targetType,
    constellation,
    maxMagnitude,
    limit,
  });

  const handleTogglePin = (id: string) => {
    const targetInfo = targets?.results.find((t) => t.identifier === id);
    if (targetInfo) {
      togglePin({
        id: targetInfo.identifier,
        common_name: targetInfo.common_name,
        target_type: targetInfo.target_type,
        score: 0,
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTargetType("All Types");
    setConstellation("All Constellations");
    setMaxMagnitude(20);
    setLimit(50);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase">
            Deep Sky Catalogs
          </h1>
          <p className="text-muted-foreground text-lg">
            Discovery and exploration of the visible universe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && (
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                Searching...
              </span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-xl gap-2 ${
              showFilters ? "bg-primary/10 border-primary/40" : ""
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Search & Tabs */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by name or identifier (e.g. M42, Orion)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex bg-secondary/50 p-1 rounded-2xl border border-border/50">
            {CATALOGS.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCatalog(cat);
                  setSearch("");
                }}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  catalog === cat && !search
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-8 bg-card border border-border rounded-[2.5rem] shadow-sm animate-in slide-in-from-top-4 duration-300">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Object Type
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Constellation
              </label>
              <select
                value={constellation}
                onChange={(e) => setConstellation(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {CONSTELLATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex justify-between">
                <span>Max Magnitude</span>
                <span className="font-mono text-foreground">
                  {maxMagnitude}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={maxMagnitude}
                onChange={(e) => setMaxMagnitude(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={clearFilters}
                className="w-full rounded-xl gap-2 uppercase text-[10px] font-black tracking-widest"
              >
                <Eraser className="w-4 h-4" />
                Clear All
              </Button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">
            Accessing Star Maps...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {targets?.results.map((target) => (
              <TargetCard
                key={target.identifier}
                target={target}
                onTogglePin={handleTogglePin}
                isPinned={pinnedTargets.some(
                  (pt) => pt.id === target.identifier,
                )}
                nightStart={nightStart}
                nightEnd={nightEnd}
                variant="catalog"
              />
            ))}
          </div>

          {targets?.results.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2.5rem] bg-card text-muted-foreground">
              <p className="font-black uppercase tracking-widest">
                No cosmic matches found
              </p>
              <p className="text-sm mt-2 opacity-60 italic">
                Try adjusting your filters or search query.
              </p>
            </div>
          ) : targets?.results.length === limit ? (
            <div className="flex justify-center pt-8 border-t border-border/50">
              <Button
                onClick={() => setLimit((prev) => prev + 50)}
                className="px-12 rounded-full uppercase text-xs font-black tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
              >
                Load More Targets
              </Button>
            </div>
          ) : (
            <div className="text-center pt-8 border-t border-border/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                End of catalog results
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
