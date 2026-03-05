import { useQuery } from "@tanstack/react-query";
import { fetchTopCombos } from "@/services/api";

export function useCombos() {
  return useQuery({
    queryKey: ["combos"],
    queryFn: fetchTopCombos,
  });
}
