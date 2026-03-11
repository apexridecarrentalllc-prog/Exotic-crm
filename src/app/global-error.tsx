"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Application error</h1>
        <p className="text-gray-600 text-sm mb-4 max-w-md text-center">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
