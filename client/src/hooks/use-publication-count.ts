import { useQuery } from "@tanstack/react-query";
import type { EnhancedPublication } from "@/lib/types";

export function usePublicationCount(researchActivityId: number | null | undefined) {
  const { data: publications } = useQuery<EnhancedPublication[]>({
    queryKey: ['/api/publications'],
    enabled: !!researchActivityId,
  });
  
  if (!researchActivityId || !publications) {
    return { count: 0, isLoading: false };
  }
  
  // Count publications with the matching research activity ID
  const count = publications.filter(
    pub => pub.researchActivityId === researchActivityId
  ).length;
  
  return { count, isLoading: false };
}