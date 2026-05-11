import { useQueries } from "@tanstack/react-query";
import api from "@/lib/api";
import type { components } from "@/types/api";
import { useSettings } from "@/context/SettingsContext";

type TargetPositionSeries = components["schemas"]["TargetPositionSeries"];

export function useMultiTargetPosition(
  ids: string[] | undefined,
  nightStart: Date | null,
  nightEnd: Date | null,
) {
  const { activeLocation } = useSettings();

  const posQueries = (ids || []).map((id) => ({
    queryKey: [
      "target-position",
      id,
      activeLocation?.name,
      nightStart?.toISOString(),
    ],
    queryFn: async () => {
      if (!activeLocation || !nightStart || !nightEnd) return null;

      const durationHours =
        (nightEnd.getTime() - nightStart.getTime()) / (1000 * 60 * 60);

      const params = new URLSearchParams();
      params.append("latitude", activeLocation.latitude.toString());
      params.append("longitude", activeLocation.longitude.toString());
      params.append("start_time", nightStart.toISOString());
      params.append("hours", durationHours.toString());

      const { data } = await api.get<TargetPositionSeries>(
        `/targets/${id}/position?${params.toString()}`,
      );
      return data;
    },
    enabled: !!activeLocation && !!nightStart && !!nightEnd && !!id,
  }));

  return useQueries({ queries: posQueries });
}
