import { type ReactNode } from "react";
import { useAppConfig, useUpdateAppConfig } from "@/hooks/use-config";
import type { components } from "@/types/api";
import { SettingsContext } from "./SettingsContext.context";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: config, isLoading } = useAppConfig();
  const updateMutation = useUpdateAppConfig();

  // find the default location - either marked as such for the first one
  const activeLocation =
    config?.locations.find((loc) => loc.default) || config?.locations[0];

  // find the default telescope
  const activeTelescope = config?.planning.default_telescope || "Seestar S50";

  // convenience accessors for planning constraints
  const minAltitude = config?.planning.min_altitude ?? 25;
  const maxAltitude = config?.planning.max_altitude ?? 75;

  // temperature unit preference (default to C if not specified)
  const tempUnit = (config?.integrations.weather.units as "C" | "F") || "C";

  // helper for updating planning settings (min altitude, etc.)
  const updatePlanning = (
    updates: Partial<components["schemas"]["PlanningSettings"]>,
  ) => {
    if (!config) return;
    updateMutation.mutate({
      planning: { ...config.planning, ...updates },
    });
  };

  // helper for updating weather units
  const updateWeatherUnits = (unit: "C" | "F") => {
    if (!config) return;
    updateMutation.mutate({
      integrations: {
        ...config.integrations,
        weather: { ...config.integrations.weather, units: unit },
      },
    });
  };

  // helper for updating default location
  const setDefaultLocation = (locationName: string) => {
    if (!config) return;
    const newLocations = config.locations.map((loc) => ({
      ...loc,
      default: loc.name === locationName,
    }));
    updateMutation.mutate({
      locations: newLocations,
    });
  };

  // helper for adding location
  const addLocation = (
    newLocation: components["schemas"]["LocationConfig"],
  ) => {
    if (!config) return;
    const existingLocations = newLocation.default
      ? config.locations.map((loc) => ({ ...loc, default: false }))
      : config.locations;
    updateMutation.mutate({
      locations: [...existingLocations, newLocation],
    });
  };

  // helper for removing location
  const deleteLocation = (locationName: string) => {
    if (!config) return;

    const newLocations = config.locations.filter(
      (loc) => loc.name !== locationName,
    );
    updateMutation.mutate({
      locations: newLocations,
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        config,
        isLoading,
        activeLocation,
        activeTelescope,
        minAltitude,
        maxAltitude,
        tempUnit,
        updatePlanning,
        updateWeatherUnits,
        setDefaultLocation,
        addLocation,
        deleteLocation,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
