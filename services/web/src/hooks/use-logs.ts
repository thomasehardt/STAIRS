import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/api';

type ObservationLogItem = components['schemas']['ObservationLogItem'];
type ObservationLogCreate = components['schemas']['ObservationLogCreate'];

export function useLogs() {
  return useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      const { data } = await api.get<components['schemas']['ObservationLogListResponse']>('/logs/');
      return data.logs;
    },
  });
}

export function useTargetLogs(targetId: string) {
  return useQuery({
    queryKey: ['logs', 'target', targetId],
    queryFn: async () => {
      const { data } = await api.get<components['schemas']['ObservationLogListResponse']>(`/logs/target/${targetId}`);
      return data.logs;
    },
    enabled: !!targetId,
  });
}

export function useCreateLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newLog: ObservationLogCreate) => {
      const { data } = await api.post<ObservationLogItem>('/logs/', newLog);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      if (data.target_id) {
        queryClient.invalidateQueries({ queryKey: ['logs', 'target', data.target_id] });
      }
    },
  });
}

export function useDeleteLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: number) => {
      await api.delete(`/logs/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
}
