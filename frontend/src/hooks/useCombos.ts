import { useQuery } from "@tanstack/react-query";
import { fetchTopCombos, fetchUpsell, fetchUpsellBatch } from "@/services/api";

export function useCombos(category?: string) {
  return useQuery({
    queryKey: ["combos", category],
    queryFn: () => fetchTopCombos(category),
  });
}

export function useUpsell(itemId: number | null) {
  return useQuery({
    queryKey: ["upsell", itemId],
    queryFn: () => fetchUpsell(itemId!),
    enabled: itemId !== null,
  });
}

export function useUpsellBatch(itemIds: number[]) {
  return useQuery({
    queryKey: ["upsell-batch", itemIds],
    queryFn: () => fetchUpsellBatch(itemIds),
    enabled: itemIds.length > 0,
  });
}
