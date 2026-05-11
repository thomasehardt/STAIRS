import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { components } from "@/types/api";
import { useSettings } from "@/context/SettingsContext";

type SkyViewResponse = components["schemas"]["SkyViewResponse"];

export function useSkyView(
  targetIds: string[] | undefined,
  startTime: string | null = null,
) {
  const { activeLocation } = useSettings();

  return useQuery({
    queryKey: [
      "sky-view",
      activeLocation?.name,
      targetIds?.join(","),
      startTime,
    ],
    queryFn: async () => {
      if (!activeLocation) return null;

      const params = new URLSearchParams({
        latitude: activeLocation.latitude.toString(),
        longitude: activeLocation.longitude.toString(),
        location_name: activeLocation.name,
      });

      if (startTime) params.append("start_time", startTime);
      if (targetIds?.length) params.append("target_ids", targetIds.join(","));

      const { data } = await api.get<SkyViewResponse>(
        `/plan/sky-view?${params.toString()}`,
      );
      return data;
    },
    enabled: !!activeLocation,
  });
}
