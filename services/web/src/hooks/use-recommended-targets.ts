import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import type { components } from "@/types/api";

type TargetRecommendation = components["schemas"]["TargetRecommendation"];

export function useRecommendedTargets() {
  const { activeLocation, activeTelescope, minAltitude } = useSettings();

  return useQuery({
    queryKey: [
      "recommendations",
      activeLocation?.name,
      activeTelescope,
      minAltitude,
    ],
    enabled: !!activeLocation && !!activeTelescope,
    queryFn: async () => {
      if (!activeLocation) return [];
      const { data } = await api.post<TargetRecommendation[]>(
        "/plan/recommend",
        {
          latitude: activeLocation.latitude,
          longitude: activeLocation.longitude,
          elevation_m: activeLocation.elevation_m,
          location_name: activeLocation.name,
          telescope_profile_name: activeTelescope,
          min_alt: minAltitude,
          bortle_scale: activeLocation.bortle_scale,
        },
      );
      return data;
    },
  });
}
