import type { components } from "@/types/api";

export type AppConfig = components["schemas"]["AppConfig"];
export type LocationConfig = components["schemas"]["LocationConfig"];

export interface SettingsContextType {
  config: AppConfig | undefined;
  isLoading: boolean;

  // the active (current) settings come from config
  activeLocation: LocationConfig | undefined;
  activeTelescope: string;
  minAltitude: number;
  maxAltitude: number;
  tempUnit: "C" | "F";

  // actions
  updatePlanning: (
    updates: Partial<components["schemas"]["PlanningSettings"]>,
  ) => void;
  updateWeatherUnits: (unit: "C" | "F") => void;
  setDefaultLocation: (locationName: string) => void;
  addLocation: (location: components["schemas"]["LocationConfig"]) => void;
  deleteLocation: (locationName: string) => void;
}
