import { useQuery } from "@tanstack/react-query";
import { fetchMenuInsights, fetchHiddenStars, fetchRiskItems } from "@/services/api";

export function useMenuInsights() {
  return useQuery({
    queryKey: ["menuInsights"],
    queryFn: fetchMenuInsights,
  });
}

export function useHiddenStars() {
  return useQuery({
    queryKey: ["hiddenStars"],
    queryFn: fetchHiddenStars,
  });
}

export function useRiskItems() {
  return useQuery({
    queryKey: ["riskItems"],
    queryFn: fetchRiskItems,
  });
}
