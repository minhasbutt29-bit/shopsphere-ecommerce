"use client";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted-foreground">An unexpected error occurred. Please try again.{error.digest ? ` (ref ${error.digest})` : ""}</p>
      <Button className="mt-8" onClick={reset}>Try again</Button>
    </div>
  );
}
