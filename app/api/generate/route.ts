import { NextResponse } from "next/server";
import { generateRecipes } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json(
        { error: "Please enter ingredients or a cooking prompt" },
        { status: 400 }
      );
    }
    const recipes = await generateRecipes(prompt);
    return NextResponse.json({ recipes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate recipes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
