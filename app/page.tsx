'use client';

import { GenerateSection } from "@/components/GenerateSection";
import { InputBox } from "@/components/InputBox";
import { ResultsSection } from "@/components/ResultsSection";
import { useEffect } from "react";
import { useStore } from "@/store/store";

export default function Home() {
  const { inputText, setInputText, error } = useStore();

  useEffect(() => {
    setInputText("I have rice, dal, onion, etc. Need lunch in 20 minutes.");
  }, []);

  return (
    <div className="min-h-screen w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 text-center sm:mb-8">
        <h1 className="text-2xl font-bold text-spice-700 sm:text-4xl">
          JaldiKhana
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Quick Indian recipes from your ingredients
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
