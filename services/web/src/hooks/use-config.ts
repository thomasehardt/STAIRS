import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/api';

// use these types from the schema
type AppConfig = components['schemas']['AppConfig'];
type SettingsUpdate = components['schemas']['SettingsUpdate'];

export function useAppConfig() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get<AppConfig>('/settings/');
      return data;
    }
  })
}

export function useUpdateAppConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: SettingsUpdate) => {
      const {data } = await api.patch<AppConfig>('/settings/', updates);
      return data;
    },
    // on success, we invalidate the settings query so the UI refreshes
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await api.get<components['schemas']['ProfileListResponse']>('/profiles/');
      return data;
    },
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get<components['schemas']['LocationListResponse']>('/locations/');
      return data;
    },
  });
}
