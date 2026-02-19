"use client";

import { useStore } from "@/store/store";
import { ResultCard } from "@/components/ResultCard";
import { DownloadButtons } from "@/components/DownloadButtons";

export function ResultsSection() {
  const { recipes, loading } = useStore();

  if (recipes.length === 0) return null;

  return (
    <section className={`mb-8 transition-opacity ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-spice-800 sm:text-lg">
          Your recipes
        </h2>
        <DownloadButtons loading={loading} />
      </div>
      <ul className="space-y-4 sm:space-y-6">
        {recipes.map((recipe, index) => (
          <li key={index}>
            <ResultCard recipe={recipe} index={index} />
          </li>
        ))}
      </ul>
    </section>
  );
}
