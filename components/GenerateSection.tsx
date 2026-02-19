"use client";

import { flushSync } from "react-dom";
import { useStore } from "@/store/store";

export function GenerateSection() {
  const {
    inputText,
    loading,
    setLoading,
    setRecipes,
    setError,
    clear,
  } = useStore();

  const handleGenerate = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setError("Please enter ingredients or a cooking prompt");
      return;
    }
    // Force React to commit loading state and paint the overlay before we block on fetch
    flushSync(() => {
      setLoading(true);
      setError(null);
    });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 300));

    const startTime = Date.now();
    const minDuration = 1500; // Show loader for at least 1.5s
    let errorMessage: string | null = null;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate recipes");
      }
      if (!Array.isArray(data.recipes)) {
        throw new Error("Invalid response from server");
      }
      setRecipes(data.recipes);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Something went wrong";
    } finally {
      // Keep spinner visible for at least minDuration so user always sees it
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);
      setTimeout(() => {
        setLoading(false);
        if (errorMessage) setError(errorMessage);
      }, remaining);
    }
  };


  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-spice-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-spice-600 hover:shadow-lg active:shadow-sm disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none sm:flex-initial"
      >
        {loading ? (
          <>
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-4 border-white border-t-spice-200" />
            <span>Generating…</span>
          </>
        ) : (
          "Generate Recipe"
        )}
      </button>
      <button
        type="button"
        onClick={clear}
        disabled={loading}
        className="min-h-[48px] cursor-pointer rounded-lg border-2 border-spice-300 bg-white px-6 py-3 font-semibold text-spice-600 transition hover:bg-spice-50 hover:border-spice-400 active:bg-spice-100 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-initial"
      >
        Clear
      </button>
    </div>
  );
}
