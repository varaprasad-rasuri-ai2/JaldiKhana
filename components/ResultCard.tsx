"use client";

import type { Recipe } from "@/types";

interface ResultCardProps {
  recipe: Recipe;
  index: number;
}

export function ResultCard({ recipe, index }: ResultCardProps) {
  return (
    <article
      className="rounded-xl border border-spice-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:rounded-2xl sm:p-6"
      data-recipe-index={index}
    >
      <h3 className="text-lg font-bold leading-snug text-spice-800 break-words sm:text-xl">
        {recipe.title}
      </h3>
      <p className="mt-1 text-sm font-medium text-spice-600">
        ⏱ {recipe.time}
      </p>

      <section className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-spice-700 sm:text-sm">
          Ingredients
        </h4>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700 break-words sm:text-base">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-spice-700 sm:text-sm">
          Steps
        </h4>
        <ol className="mt-2 list-inside list-decimal space-y-2 text-sm text-gray-700 break-words sm:text-base">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {recipe.tips && (
        <section className="mt-4 rounded-lg bg-spice-50 p-3">
          <h4 className="text-xs font-semibold text-spice-700 sm:text-sm">Tips</h4>
          <p className="mt-1 text-sm text-gray-700 break-words">{recipe.tips}</p>
        </section>
      )}
    </article>
  );
}
