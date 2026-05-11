import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/api';

type PlanRequest = components['schemas']['PlanRequest'];
type PlanResponse = components['schemas']['PlanResponse'];

export function useGeneratePlan() {
  return useMutation({
    mutationFn: async (request: PlanRequest) => {
      const { data } = await api.post<PlanResponse>('/plan/generate', request);
      return data;
    },
  });
}

export function useExportCsv() {
    return useMutation({
        mutationFn: async (request: PlanRequest) => {
            const { data, headers } = await api.post('/plan/export/csv', request, {
                responseType: 'blob'
            });

            const filename = headers['content-disposition']?.split('filename=')[1] || 'plan.csv';
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename.replace(/"/g, ''));
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    });
}

export function useExportSkylist() {
    return useMutation({
        mutationFn: async (request: PlanRequest) => {
            const { data, headers } = await api.post('/plan/export/skylist', request, {
                responseType: 'blob'
            });

            const filename = headers['content-disposition']?.split('filename=')[1] || 'plan.skylist';
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename.replace(/"/g, ''));
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    });
}

export function useForecast(params: { latitude?: number; longitude?: number; location_name?: string; days?: number }) {
  return useQuery({
    queryKey: ['forecast', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.latitude) queryParams.append('latitude', params.latitude.toString());
      if (params.longitude) queryParams.append('longitude', params.longitude.toString());
      if (params.location_name) queryParams.append('location_name', params.location_name);
      if (params.days) queryParams.append('days', params.days.toString());

      const { data } = await api.get<components['schemas']['ForecastResponse']>(`/plan/forecast?${queryParams}`);
      return data;
    },
  });
}
