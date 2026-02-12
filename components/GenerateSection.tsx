"use client";

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
    setLoading(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-spice-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-spice-600 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Generating…
          </>
        ) : (
          "Generate Recipe"
        )}
      </button>
      <button
        type="button"
        onClick={clear}
        disabled={loading}
        className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        Clear
      </button>
    </div>
  );
}
