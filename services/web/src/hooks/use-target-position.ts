import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import type { components } from '@/types/api';

type PositionSeries = components['schemas']['TargetPositionSeries'];

export function useTargetPosition(id: string, start?: Date | null, end?: Date | null) {
  const { activeLocation } = useSettings();

  return useQuery({
    queryKey: ['position', id, activeLocation?.name, start?.toISOString(), end?.toISOString()],
    enabled: !!id && !!activeLocation && !!start && !!end,
    queryFn: async () => {
      if (!activeLocation || !start || !end) throw new Error('Missing Parameters');

      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      const params = new URLSearchParams({
        latitude: activeLocation.latitude.toString(),
        longitude: activeLocation.longitude.toString(),
        start_time: start.toISOString(),
        hours: durationHours.toString()
      });

      const { data } = await api.get<PositionSeries>(`/targets/${id}/position?${params}`);
      return data;
    },
  });
}
