"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error(
  props: { error: Error & { digest?: string }; reset: () => void }
) {
  const { error, reset } = props;
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
