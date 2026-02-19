'use client';

import { GenerateSection } from "@/components/GenerateSection";
import { InputBox } from "@/components/InputBox";
import { ResultsSection } from "@/components/ResultsSection";
import { useEffect } from "react";
import { useStore } from "@/store/store";

export default function Home() {
  const { inputText, setInputText, loading } = useStore();

  useEffect(() => {
    setInputText("I have rice, dal, onion, etc. Need lunch in 20 minutes.");
  }, [setInputText]);

  return (
    <div className="min-h-screen w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 relative">
      {loading && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          role="status"
          aria-label="Generating recipes"
        >
          <div className="rounded-2xl bg-white px-10 py-16 shadow-2xl">
            <div className="flex flex-col items-center gap-8">
              <div
                className="h-20 w-20 rounded-full border-4 border-gray-200 border-t-spice-500 border-r-spice-500"
                style={{
                  animation: "spinner-rotate 0.9s linear infinite",
                  flexShrink: 0,
                }}
              />
              <div>
                <p className="text-center text-xl font-bold text-spice-600">
                  Generating Recipes
                </p>
                <p className="mt-2 text-center text-sm text-gray-500">
                  Finding the perfect recipe for you...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="mb-6 text-center sm:mb-8">
        <h1 className="text-2xl font-bold text-spice-700 sm:text-4xl">
          JaldiKhana
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Quick Indian recipes from your ingredients=12333
        </p>
      </header>

      <section className="mb-6 sm:mb-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-spice-700 sm:text-sm">
          What do you have?
        </h2>
        <InputBox />
        <div className="mt-4">
          <GenerateSection />
        </div>
      </section>

      <ResultsSection />

      <footer className="mt-12 border-t border-spice-200 pt-6 text-center text-xs text-gray-500 sm:mt-16 sm:text-sm">
        JaldiKhana - Easy Indian recipes in minutes.
      </footer>
    </div>
  );
}
