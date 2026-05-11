import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import type { components } from "@/types/api";

type QualitySeriesResponse = components['schemas']['QualitySeriesResponse'];

export function useSkyQuality(locationName?: string, startTime?: string) {
    const { activeLocation } = useSettings();
    const name = locationName || activeLocation?.name;

    return useQuery({
        queryKey: ['sky-quality', name, startTime],
        enabled: !!name,
        queryFn: async () => {
            if (!name) return null;
            const params = new URLSearchParams();
            params.append('location_name', name);
            if (startTime) {
                params.append('start_time', startTime);
            }
            const { data } = await api.get<QualitySeriesResponse>(`/plan/quality-series?${params.toString()}`);
            return data;
        },
    })
}
