"use client";

import { useStore } from "@/store/store";
import { downloadTxt, downloadPdf, downloadDocx } from "@/lib/export";
import { useState } from "react";

export function DownloadButtons() {
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

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleTxt}
        className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
      >
        Download TXT
      </button>
      <button
        type="button"
        onClick={handlePdf}
        disabled={downloading !== null}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {downloading === "pdf" ? "..." : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={handleDocx}
        disabled={downloading !== null}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {downloading === "docx" ? "..." : "Download DOCX"}
      </button>
    </div>
  );
}
