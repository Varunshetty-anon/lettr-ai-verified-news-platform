"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Author Page Error:", error);
    
    // ChunkLoadError can happen after deployment. Hard reload to fetch new assets.
    if (error.name === "ChunkLoadError" || error.message.includes("Loading chunk")) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h2 className="type-headline-md text-on-surface mb-3">Something went wrong!</h2>
      <p className="type-body-lg text-on-surface-variant mb-6 max-w-md">
        We encountered an error loading this profile.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="type-label-md bg-primary text-white px-5 py-3 hover:bg-transparent hover:text-primary border-2 border-primary transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => router.back()}
          className="type-label-md border-2 border-on-surface px-5 py-3 text-on-surface hover:bg-on-surface hover:text-surface transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
