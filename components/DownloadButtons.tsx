"use client";

import { useStore } from "@/store/store";
import { downloadTxt, downloadPdf, downloadDocx } from "@/lib/export";
import { useState } from "react";

export function DownloadButtons({ loading }: { loading: boolean }) {
  const { recipes } = useStore();
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);

  if (recipes.length === 0) return null;

  const handleTxt = () => {
    downloadTxt(recipes);
  };

  const handlePdf = () => {
    setDownloading("pdf");
    try {
      downloadPdf(recipes);
    } finally {
      setDownloading(null);
    }
  };

  const handleDocx = async () => {
    setDownloading("docx");
    try {
      await downloadDocx(recipes);
    } finally {
      setDownloading(null);
    }
  };

  const isDisabled = loading || downloading !== null;

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      <button
        type="button"
        onClick={handleTxt}
        disabled={isDisabled}
        className="min-h-[44px] flex-1 rounded-lg bg-gray-700 px-3 py-2.5 text-sm font-medium text-white transition hover:cursor-pointer hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4"
      >
        Download TXT
      </button>
      <button
        type="button"
        onClick={handlePdf}
        disabled={isDisabled}
        className="min-h-[44px] flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition hover:cursor-pointer hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4"
      >
        {downloading === "pdf" ? "..." : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={handleDocx}
        disabled={isDisabled}
        className="min-h-[44px] flex-1 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition hover:cursor-pointer hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4"
      >
        {downloading === "docx" ? "..." : "Download DOCX"}
      </button>
    </div>
  );
}
