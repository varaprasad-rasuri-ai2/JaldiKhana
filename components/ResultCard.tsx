"use client";

import type { Recipe } from "@/types";

interface ResultCardProps {
  recipe: Recipe;
  index: number;
}

export function ResultCard({ recipe, index }: ResultCardProps) {
  return (
    <article
      className="rounded-2xl border border-spice-200 bg-white p-6 shadow-sm transition hover:shadow-md"
      data-recipe-index={index}
    >
      <h3 className="text-xl font-bold text-spice-800">{recipe.title}</h3>
      <p className="mt-1 text-sm font-medium text-spice-600">
        ⏱ {recipe.time}
      </p>

      <section className="mt-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-spice-700">
          Ingredients
        </h4>
        <ul className="mt-2 list-inside list-disc space-y-1 text-gray-700">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-spice-700">
          Steps
        </h4>
        <ol className="mt-2 list-inside list-decimal space-y-2 text-gray-700">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {recipe.tips && (
        <section className="mt-4 rounded-lg bg-spice-50 p-3">
          <h4 className="text-sm font-semibold text-spice-700">Tips</h4>
          <p className="mt-1 text-sm text-gray-700">{recipe.tips}</p>
        </section>
      )}
    </article>
  );
}
