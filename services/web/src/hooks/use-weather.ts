import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/api';

export function useWeather(latitude: number, longitude: number) {
  return useQuery({
    queryKey: ['weather', latitude, longitude],
    queryFn: async () => {
      const timestamp = new Date().toISOString();
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        timestamp,
      });
      const { data } = await api.get<components['schemas']['ForecastData']>(`/weather/?${params}`);
      return data;
    },
  });
}
