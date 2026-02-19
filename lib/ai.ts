import type { Recipe } from "@/types";
import { jsonrepair } from "jsonrepair";

const BASE_PROMPT = `You are an Indian home cook. Suggest 2-3 easy recipes in 10-30 minutes using ONLY the ingredients provided by the user. Do NOT add any extra ingredients. Make it kid-friendly. Return only valid JSON array, no other text.

CRITICAL CONSTRAINTS:
1. Each recipe MUST be completable within 30 minutes of cooking time
2. If an ingredient (like mutton, chicken, mushrooms) requires longer than 30 minutes to cook, EXCLUDE it from the recipe
3. Suggest only recipes using the remaining ingredients that CAN be cooked in 30 minutes
4. Every recipe MUST have a "tips" field with practical, non-empty cooking advice`;

const EXPECTED_JSON_SCHEMA = `[
  {
    "title": "string",
    "time": "string (e.g. 20 mins)",
    "ingredients": ["string"],
    "steps": ["string"],
    "tips": "string (useful cooking tip or variation)"
  }
]`;

function buildPrompt(userInput: string): string {
  return `${BASE_PROMPT}

Format exactly like this (JSON array only):
${EXPECTED_JSON_SCHEMA}

IMPORTANT REQUIREMENTS:
1. Use ONLY the ingredients mentioned by the user. Do NOT add any extra ingredients.
2. MUST include a non-empty "tips" field for EACH recipe with a helpful cooking tip or variation.
3. Include time in format like "20 mins" or "30 mins".

User request: ${userInput}`;
}

/** Strip markdown code fences and fix common JSON issues from AI output */
function sanitizeJson(raw: string): string {
  let s = raw.trim();
  // Normalize line endings and remove control chars that break JSON
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Remove ```json ... ``` or ``` ... ```
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)```\s*$/;
  const m = s.match(codeBlock);
  if (m) s = m[1].trim();
  // Extract first [...] array if there's extra text
  const arrayMatch = s.match(/\[[\s\S]*\]/);
  if (arrayMatch) s = arrayMatch[0];
  return s;
}

function parseRecipeJson(text: string): Recipe[] {
  const sanitized = sanitizeJson(text);
  // Use jsonrepair library to fix any JSON issues
  const repaired = jsonrepair(sanitized);
  let parsed: unknown;
  try {
    parsed = JSON.parse(repaired);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("JSON parsing failed. Repaired JSON:", repaired);
    throw new Error(`Invalid recipe JSON from AI: ${msg}`);
  }
  return normalizeParsedRecipes(parsed);
}

/** Get string from object with possible key names (case-insensitive) */
function getStr(obj: Record<string, unknown>, keys: string[]): string {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") lower[k.toLowerCase()] = v;
  }
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v != null) return v;
  }
  return "";
}

/** Get string array from object */
function getArr(obj: Record<string, unknown>, keys: string[]): string[] {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    lower[k.toLowerCase()] = v;
  }
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (Array.isArray(v)) return v.map(String);
  }
  return [];
}

function normalizeParsedRecipes(parsed: unknown): Recipe[] {
  if (!Array.isArray(parsed)) {
    throw new Error("AI did not return a JSON array");
  }

  const recipes: Recipe[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const title = getStr(obj, ["title", "name", "recipe"]);
    if (!title) continue;

    const time = getStr(obj, ["time", "duration", "cooking_time", "prep_time"]);
    const ingredients = getArr(obj, ["ingredients", "ingredient"]);
    const steps = getArr(obj, ["steps", "instructions", "method", "directions"]);
    const tips = getStr(obj, ["tips", "tip", "notes", "note"]);

    if (steps.length === 0 && ingredients.length === 0) continue;

    recipes.push({
      title,
      time: time || "—",
      ingredients,
      steps: steps.length ? steps : ["See ingredients and prepare as desired."],
      tips: tips || "",
    });
  }

  if (recipes.length === 0) {
    const snippet = JSON.stringify(parsed).slice(0, 300);
    throw new Error(`No valid recipes in AI response. Raw snippet: ${snippet}…`);
  }

  return recipes;
}

export async function generateWithOpenAI(userInput: string): Promise<Recipe[]> {
  const key = process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set in .env.local");
  }

  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: buildPrompt(userInput) },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} - ${bodyText.slice(0, 200)}`);
  }

  const data = JSON.parse(bodyText) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("OpenAI returned no content");
  }
  return parseRecipeJson(text);
}

export async function generateWithGemini(userInput: string): Promise<Recipe[]> {
  const key = process.env.GEMINI_KEY ?? process.env.NEXT_PUBLIC_GEMINI_KEY;
  if (!key) {
    throw new Error("GEMINI_KEY is not set in .env.local");
  }

  // Use gemini-2.0-flash-exp: Free, experimental, best performance for free
  const model = "gemini-2.0-flash-exp";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: buildPrompt(userInput) }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Recipe name" },
            time: { type: "string", description: "e.g. 20 mins" },
            ingredients: {
              type: "array",
              items: { type: "string" },
              description: "List of ingredients",
            },
            steps: {
              type: "array",
              items: { type: "string" },
              description: "Cooking steps",
            },
            tips: { type: "string", description: "Optional tips" },
          },
          required: ["title", "time", "ingredients", "steps", "tips"],
        },
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} - ${bodyText.slice(0, 200)}`);
  }

  const data = JSON.parse(bodyText) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) {
    throw new Error("Gemini returned no text");
  }

  return parseRecipeJson(text);
}

export async function generateWithMistral(userInput: string): Promise<Recipe[]> {
  const key = process.env.MISTRAL_API_KEY ?? process.env.NEXT_PUBLIC_MISTRAL_API_KEY;
  if (!key) {
    throw new Error("MISTRAL_API_KEY is not set in .env.local");
  }

  const url = "https://api.mistral.ai/v1/chat/completions";
  const body = {
    model: "mistral-small-latest",
    messages: [
      { role: "user", content: buildPrompt(userInput) },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Mistral API error: ${res.status} - ${bodyText.slice(0, 200)}`);
  }

  const data = JSON.parse(bodyText) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("Mistral returned no content");
  }

  return parseRecipeJson(text);
}

export async function generateWithGrok(userInput: string): Promise<Recipe[]> {
  const key = process.env.GROK_KEY ?? process.env.NEXT_PUBLIC_GROK_KEY;
  if (!key) {
    throw new Error("GROK_KEY is not set in .env.local");
  }

  const url = "https://api.x.ai/v1/chat/completions";
  const body = {
    model: "grok-3-fast",
    messages: [
      { role: "user", content: buildPrompt(userInput) },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Grok API error: ${res.status} - ${bodyText.slice(0, 200)}`);
  }

  const data = JSON.parse(bodyText) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("Grok returned no content");
  }
  return parseRecipeJson(text);
}

export async function generateRecipes(userInput: string): Promise<Recipe[]> {
  const trimmed = userInput.trim();
  if (!trimmed) {
    throw new Error("Please enter ingredients or a cooking prompt");
  }

  const hasGemini = !!(process.env.GEMINI_KEY ?? process.env.NEXT_PUBLIC_GEMINI_KEY);
  const hasMistral = !!(process.env.MISTRAL_API_KEY ?? process.env.NEXT_PUBLIC_MISTRAL_API_KEY);
  const hasOpenAI = !!(process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY);
  const hasGrok = !!(process.env.GROK_KEY ?? process.env.NEXT_PUBLIC_GROK_KEY);

  if (!hasGemini && !hasMistral && !hasOpenAI && !hasGrok) {
    throw new Error(
      "No AI API key configured. For free, add GEMINI_KEY from https://aistudio.google.com/app/apikey. Optionally: MISTRAL_API_KEY, OPENAI_API_KEY, or GROK_KEY."
    );
  }

  // Fallback order: Mistral → Gemini → OpenAI → Grok
  const providers = [
    { name: "Mistral", fn: generateWithMistral, enabled: hasMistral },
    { name: "Gemini", fn: generateWithGemini, enabled: hasGemini },
    { name: "OpenAI", fn: generateWithOpenAI, enabled: hasOpenAI },
    { name: "Grok", fn: generateWithGrok, enabled: hasGrok },
  ];

  let lastError: Error | null = null;
  const tried: string[] = [];
  const errors: Array<{ provider: string; error: string }> = [];

  for (const provider of providers) {
    if (!provider.enabled) {
      console.log(`⏭️  Skipping ${provider.name} (no API key)`);
      continue;
    }

    tried.push(provider.name);
    try {
      console.log(`🔄 Trying ${provider.name}...`);
      const result = await provider.fn(trimmed);
      console.log(`✅ ${provider.name} succeeded!`);
      return result;
    } catch (err) {
      if (err instanceof Error) {
        lastError = err;
        const errorMsg = err.message;
        errors.push({ provider: provider.name, error: errorMsg });
        console.warn(`❌ ${provider.name} failed:`);
        console.warn(`   Error: ${errorMsg}`);
        console.log(`   → Trying next provider...\n`);
      }
    }
  }

  // All providers failed - throw detailed error
  console.error(`\n❌ All providers failed!`);
  console.error(`Tried: ${tried.join(" → ")}\n`);
  
  // Show detailed errors for each provider
  for (const err of errors) {
    console.error(`${err.provider}: ${err.error}`);
  }

  if (lastError) {
    if (lastError.message.includes("fetch") || lastError.message.includes("network")) {
      throw new Error("No internet or server unreachable. Check your connection.");
    }
    const isCreditsError =
      lastError.message.includes("403") ||
      lastError.message.includes("credits") ||
      lastError.message.includes("permission");
    const geminiWasTried = tried.some((t) => t.toLowerCase().includes("gemini"));
    if (isCreditsError && !geminiWasTried) {
      throw new Error(
        "No working AI credits. Use a free key: add GEMINI_KEY in .env.local from https://aistudio.google.com/app/apikey"
      );
    }
    throw lastError;
  }


  throw new Error("All AI providers failed. Check browser console for details.");
}

