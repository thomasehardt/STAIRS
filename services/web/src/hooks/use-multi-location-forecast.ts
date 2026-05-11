import { useQueries } from "@tanstack/react-query";
import api from "@/lib/api";
import type { components } from "@/types/api";

export type LocationConfig = components["schemas"]["LocationConfig"];

export interface ForecastDay {
  date: string;
  astronomical_night_start: string | null;
  astronomical_night_end: string | null;
  total_dark_hours: number;
  effective_hours: number;
  quality_score: number;
  relative_quality: number;
  absolute_quality: number;
  note: string | null;
}

export interface ForecastResponse {
  location_name: string;
  days: ForecastDay[];
}

export interface MultiForecastResult {
  locationName: string;
  forecastData: ForecastResponse;
}

export function useMultiLocationForecast(
  locations: LocationConfig[] | undefined,
  days: number,
) {
  const forecastQueries = (locations || []).map((location) => ({
    queryKey: ["forecast", location.name, days],
    queryFn: async () => {
      const queryParams = new URLSearchParams();

      // Prioritize location_name to ensure the backend loads the full profile (Bortle, etc.) from DB
      if (location.name) {
        queryParams.append("location_name", location.name);
      } else {
        queryParams.append("latitude", location.latitude.toString());
        queryParams.append("longitude", location.longitude.toString());
      }

      queryParams.append("days", days.toString());

      const { data } = await api.get<ForecastResponse>(
        `/plan/forecast?${queryParams}`,
      );
      return { locationName: location.name, forecastData: data };
    },
    enabled: !!locations && locations.length > 0 && days > 0,
  }));

  return useQueries({ queries: forecastQueries });
}
