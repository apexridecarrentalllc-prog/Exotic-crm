"use client";

import { useCallback, useState } from "react";

export interface DocumentViewerProps {
  /** URL to the document (e.g. /api/documents/[id]/view) */
  url: string;
  mimeType: string;
  fileName?: string;
  onClose?: () => void;
}

export function DocumentViewer({ url, mimeType, fileName }: DocumentViewerProps) {
  const [error, setError] = useState(false);

  const isPdf = mimeType === "application/pdf";
  const isImage =
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/jpg";

  const handleLoad = useCallback(() => setError(false), []);
  const handleError = useCallback(() => setError(true), []);

  if (error) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 rounded border bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">Unable to display this file.</p>
        <a
          href={url}
          download={fileName}
          className="text-sm text-primary hover:underline"
        >
          Download instead
        </a>
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={url}
        title={fileName ?? "Document"}
        className="h-full min-h-[500px] w-full rounded border bg-white"
        onLoad={handleLoad}
        onError={handleError}
      />
    );
  }

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dynamic URL from API
      <img
        src={url}
        alt={fileName ?? "Document"}
        className="max-h-[80vh] w-auto rounded border object-contain"
        onLoad={handleLoad}
        onError={handleError}
      />
    );
  }

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 rounded border bg-muted/30 p-4 text-center">
      <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
      <a
        href={url}
        download={fileName}
        className="text-sm text-primary hover:underline"
      >
        Download file
      </a>
    </div>
  );
}
