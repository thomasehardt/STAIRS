import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { components } from "@/types/api";

type TargetSearchResponse = components["schemas"]["TargetSearchResponse"];

export interface TargetFilterOptions {
  search?: string;
  catalog?: string;
  type?: string;
  maxMagnitude?: number;
  constellation?: string;
  limit?: number;
}

export function useTargets(options: TargetFilterOptions = {}) {
  const {
    search,
    catalog,
    type,
    maxMagnitude,
    constellation,
    limit = 50,
  } = options;

  return useQuery({
    queryKey: [
      "targets",
      search,
      catalog,
      type,
      maxMagnitude,
      constellation,
      limit,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();

      // If search is empty but a catalog is selected, we want to browse that catalog.
      // We'll mimic catalog browsing by searching for the catalog prefix (e.g., 'M' for Messier)
      // if no search query is provided.
      let q = search || "";
      if (!q && catalog) {
        if (catalog === "Messier") q = "M";
        else if (catalog === "NGC") q = "NGC";
        else if (catalog === "IC") q = "IC";
        else if (catalog === "Caldwell") q = "C";
      }

      params.append("q", q);
      if (type && type !== "All Types") params.append("target_type", type);
      if (constellation && constellation !== "All Constellations")
        params.append("constellation", constellation);
      if (maxMagnitude !== undefined && maxMagnitude !== 20)
        params.append("max_magnitude", maxMagnitude.toString());
      params.append("limit", limit.toString());

      const { data } = await api.get<TargetSearchResponse>(
        `/targets/search?${params.toString()}`,
      );
      return data;
    },
    enabled: true, // Always enabled so we can browse
  });
}
