"use client";

import { Button } from "@/components/ui/Button";
import { FileText } from "lucide-react";

export interface StatementGeneratorProps {
  companyId: string;
  companyName?: string;
  onGenerate?: () => void;
  loading?: boolean;
}

export function StatementGenerator({
  companyId,
  onGenerate,
  loading,
}: StatementGeneratorProps) {
  const handleClick = () => {
    if (onGenerate) {
      onGenerate();
      return;
    }
    window.open(`/companies/${companyId}?tab=ledger`, "_blank");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      <FileText className="h-4 w-4 mr-2" />
      {loading ? "Generating..." : "Generate Statement"}
    </Button>
  );
}
