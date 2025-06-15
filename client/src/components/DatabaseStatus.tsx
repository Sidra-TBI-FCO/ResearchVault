import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export function DatabaseStatus() {
  const { data: isOnline, isLoading } = useQuery({
    queryKey: ['/api/health/database'],
    retry: false,
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  if (isLoading) {
    return (
      <Alert className="mb-4 border-blue-200 bg-blue-50">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-800">
          Checking database connection...
        </AlertDescription>
      </Alert>
    );
  }

  if (isOnline === false) {
    return (
      <Alert className="mb-4 border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Database Offline:</strong> The database connection is temporarily unavailable. 
          Data may not display correctly until the connection is restored. Please try refreshing the page in a few minutes.
        </AlertDescription>
      </Alert>
    );
  }

  if (isOnline === true) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Database connection restored. All features are now available.
        </AlertDescription>
      </Alert>
    );
  }

  // Default case - don't show anything if status is unclear
  return null;
}