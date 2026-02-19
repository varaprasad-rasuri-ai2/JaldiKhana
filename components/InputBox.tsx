"use client";

import { useStore } from "@/store/store";

const PLACEHOLDER =
  "e.g. I have rice, dal, onion. Need lunch in 20 minutes";
const MAX_LENGTH = 1000;

export function InputBox() {
  const { inputText, setInputText, error, loading } = useStore();

  return (
    <div className="w-full">
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={PLACEHOLDER}
        maxLength={MAX_LENGTH}
        rows={4}
        disabled={loading}
        className="min-h-[7rem] w-full resize-y rounded-lg border-2 border-spice-300 bg-white px-4 py-3 text-base text-gray-800 placeholder-gray-400 shadow-sm transition focus:border-spice-500 focus:outline-none focus:ring-2 focus:ring-spice-400/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:opacity-60 sm:min-h-[8rem] sm:px-5 sm:py-4"
        aria-label="Ingredients or cooking prompt"
      />
      <div className="mt-1 flex justify-between text-xs sm:text-sm">
        <span className={error ? "text-red-600" : "text-gray-500"}>
          {error || `${inputText.length}/${MAX_LENGTH} characters`}
        </span>
      </div>
    </div>
  );
}
