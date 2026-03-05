import { useQuery } from "@tanstack/react-query";
import { fetchKPIs } from "@/services/api";

export function useKPI() {
  return useQuery({
    queryKey: ["kpis"],
    queryFn: fetchKPIs,
  });
}
