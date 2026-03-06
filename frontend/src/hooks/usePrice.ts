import { useQuery } from "@tanstack/react-query";
import { fetchPriceRecommendations, fetchPriceSummary } from "@/services/api";

export function usePriceRecommendations(opts?: {
  category?: string;
  action?: string;
  priority?: string;
}) {
  return useQuery({
    queryKey: ["price-recommendations", opts],
    queryFn: () => fetchPriceRecommendations(opts),
  });
}

export function usePriceSummary() {
  return useQuery({
    queryKey: ["price-summary"],
    queryFn: fetchPriceSummary,
  });
}
