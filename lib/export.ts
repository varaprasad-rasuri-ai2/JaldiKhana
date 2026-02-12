import type { Recipe } from "@/types";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  convertInchesToTwip,
} from "docx";

function recipeToPlainText(recipes: Recipe[]): string {
  return recipes
    .map((r) => {
      const parts = [
        `# ${r.title}`,
        `Time: ${r.time}`,
        "",
        "Ingredients:",
        ...r.ingredients.map((i) => `- ${i}`),
        "",
        "Steps:",
        ...r.steps.map((s, i) => `${i + 1}. ${s}`),
        "",
        `Tips: ${r.tips}`,
        "---",
      ];
      return parts.join("\n");
    })
    .join("\n\n");
}

export function downloadTxt(recipes: Recipe[]): void {
  const text = recipeToPlainText(recipes);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "jaldikhana-recipes.txt");
}

export function downloadPdf(recipes: Recipe[]): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - 2 * margin;
  let y = 20;
  const lineHeight = 6;

  const addText = (text: string, fontSize = 11, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  };

  for (const r of recipes) {
    addText(r.title, 16, true);
    y += 2;
    addText(`Time: ${r.time}`);
    y += 4;
    addText("Ingredients:", 12, true);
    r.ingredients.forEach((i) => addText(`• ${i}`));
    y += 2;
    addText("Steps:", 12, true);
    r.steps.forEach((s, i) => addText(`${i + 1}. ${s}`));
    y += 2;
    addText(`Tips: ${r.tips}`);
    y += 8;
  }

  doc.save("jaldikhana-recipes.pdf");
}

export async function downloadDocx(recipes: Recipe[]): Promise<void> {
  const children: Paragraph[] = [];

  for (const r of recipes) {
    children.push(
      new Paragraph({
        text: r.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: convertInchesToTwip(0.15) },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Time: ${r.time}`, bold: true })],
        spacing: { after: convertInchesToTwip(0.1) },
      }),
      new Paragraph({
        text: "Ingredients",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: convertInchesToTwip(0.08) },
      }),
      ...r.ingredients.map(
        (i) =>
          new Paragraph({
            text: i,
            bullet: { level: 0 },
            spacing: { after: convertInchesToTwip(0.05) },
          })
      ),
      new Paragraph({
        text: "Steps",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: convertInchesToTwip(0.08) },
      }),
      ...r.steps.map(
        (s, idx) =>
          new Paragraph({
            text: `${idx + 1}. ${s}`,
            spacing: { after: convertInchesToTwip(0.05) },
          })
      ),
      new Paragraph({
        children: [
          new TextRun({ text: "Tips: ", bold: true }),
          new TextRun(r.tips),
        ],
        spacing: { after: convertInchesToTwip(0.2) },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "jaldikhana-recipes.docx");
}
