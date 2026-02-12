import { InputBox } from "@/components/InputBox";
import { GenerateSection } from "@/components/GenerateSection";
import { ResultsSection } from "@/components/ResultsSection";

export default function Home() {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-spice-700 sm:text-4xl">
          JaldiKhana
        </h1>
        <p className="mt-1 text-gray-600">
          Quick Indian recipes from your ingredients
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-spice-700">
          What do you have?
        </h2>
        <InputBox />
        <div className="mt-4">
          <GenerateSection />
        </div>
      </section>

      <ResultsSection />

      <footer className="mt-16 border-t border-spice-200 pt-6 text-center text-sm text-gray-500">
        JaldiKhana – Quick Indian Recipes. For learning use.
      </footer>
    </div>
  );
}
