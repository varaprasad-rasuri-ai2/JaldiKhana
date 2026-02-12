"use client";

import { useStore } from "@/store/store";
import { ResultCard } from "@/components/ResultCard";
import { DownloadButtons } from "@/components/DownloadButtons";

export function ResultsSection() {
  const { recipes } = useStore();

  if (recipes.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-spice-800">
          Your recipes
        </h2>
        <DownloadButtons />
      </div>
      <ul className="space-y-6">
        {recipes.map((recipe, index) => (
          <li key={index}>
            <ResultCard recipe={recipe} index={index} />
          </li>
        ))}
      </ul>
    </section>
  );
}
