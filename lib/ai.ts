import type { Recipe } from "@/types";
import { jsonrepair } from "jsonrepair";

const BASE_PROMPT = `You are an Indian home cook. Suggest 2-3 easy recipes in 10-30 minutes using ONLY the ingredients provided by the user. Do NOT add any extra ingredients. Make it kid-friendly. Return only valid JSON, no other text.`;

const EXPECTED_JSON_SCHEMA = `[
  {
    "title": "string",
    "time": "string (e.g. 20 mins)",
    "ingredients": ["string"],
    "steps": ["string"],
    "tips": "string"
  }
]`;

function buildPrompt(userInput: string): string {
  return `${BASE_PROMPT}

Format exactly like this (JSON array only):
${EXPECTED_JSON_SCHEMA}

IMPORTANT: Use ONLY the ingredients mentioned by the user. Do NOT add any extra ingredients.

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

function normalizeParsedRecipes(parsed: unknown): Recipe[] {

  if (!Array.isArray(parsed)) {
    throw new Error("AI did not return a JSON array");
  }

  const recipes: Recipe[] = [];
  for (const item of parsed) {
    if (
      item &&
      typeof item === "object" &&
      "title" in item &&
      "time" in item &&
      "ingredients" in item &&
      "steps" in item &&
      "tips" in item
    ) {
      recipes.push({
        title: String(item.title),
        time: String(item.time),
        ingredients: Array.isArray(item.ingredients)
          ? item.ingredients.map(String)
          : [],
        steps: Array.isArray(item.steps) ? item.steps.map(String) : [],
        tips: String(item.tips),
      });
    }
  }

  if (recipes.length === 0) {
    throw new Error("No valid recipes in AI response");
  }

  return recipes;
}

export async function generateWithGemini(userInput: string): Promise<Recipe[]> {
  const key = process.env.GEMINI_KEY ?? process.env.NEXT_PUBLIC_GEMINI_KEY;
  if (!key) {
    throw new Error("GEMINI_KEY is not set in .env.local");
  }

  // gemini-2.5-flash-lite: free tier, optimized for cost/latency
  const model = "gemini-2.5-flash-lite";
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
    if (res.status === 429) {
      const grokKey = process.env.GROK_KEY ?? process.env.NEXT_PUBLIC_GROK_KEY;
      if (grokKey) {
        console.warn("Gemini quota exceeded (429). Falling back to Grok.");
        return await generateWithGrok(userInput);
      }
      throw new Error(
        "Gemini quota exceeded. Wait a minute and try again, or add GROK_KEY in .env.local to use Grok as backup."
      );
    }
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

export async function generateWithGrok(userInput: string): Promise<Recipe[]> {
  const key = process.env.GROK_KEY ?? process.env.NEXT_PUBLIC_GROK_KEY;
  if (!key) {
    throw new Error("GROK_KEY is not set in .env.local");
  }

  const url = "https://api.x.ai/v1/chat/completions";
  const body = {
    model: "grok-3-mini",
    messages: [
      {
        role: "system",
        content: BASE_PROMPT + "\n\nReturn only a JSON array. No markdown, no explanation.",
      },
      { role: "user", content: userInput },
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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Grok API error: ${res.status} - ${errText}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("Grok returned no content");
  }

  return parseRecipeJson(text);
}

export async function generateWithOpenAI(userInput: string): Promise<Recipe[]> {
  const key = process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set in .env.local");
  }

  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: "gpt-4o-mini", // cheapest OpenAI model (no free API tier)
    messages: [
      {
        role: "system",
        content: BASE_PROMPT + "\n\nReturn only a JSON array. No markdown, no explanation.",
      },
      { role: "user", content: userInput },
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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${res.status} - ${errText}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("OpenAI returned no content");
  }

  return parseRecipeJson(text);
}

function isQuotaError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return msg.includes("quota") || msg.includes("429") || msg.includes("rate limit");
}

export async function generateRecipes(userInput: string): Promise<Recipe[]> {
  const trimmed = userInput.trim();
  if (!trimmed) {
    throw new Error("Please enter ingredients or a cooking prompt");
  }

  const hasGemini = !!(process.env.GEMINI_KEY ?? process.env.NEXT_PUBLIC_GEMINI_KEY);
  const hasGrok = !!(process.env.GROK_KEY ?? process.env.NEXT_PUBLIC_GROK_KEY);
  const hasOpenAI = !!(process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY);

  if (!hasGemini && !hasGrok && !hasOpenAI) {
    throw new Error("No AI API key configured. Add GEMINI_KEY, GROK_KEY, or OPENAI_API_KEY in .env.local");
  }

  const tryFallbacks = async (lastErr: unknown): Promise<Recipe[]> => {
    if (hasGrok) {
      try {
        return await generateWithGrok(trimmed);
      } catch (e) {
        if (hasOpenAI) {
          try {
            return await generateWithOpenAI(trimmed);
          } catch {
            throw lastErr;
          }
        }
        throw lastErr;
      }
    }
    if (hasOpenAI) return await generateWithOpenAI(trimmed);
    throw lastErr;
  };

  try {
    if (hasGemini) {
      try {
        return await generateWithGemini(trimmed);
      } catch (geminiErr) {
        if ((hasGrok || hasOpenAI) && geminiErr instanceof Error && isQuotaError(geminiErr)) {
          return await tryFallbacks(geminiErr);
        }
        throw geminiErr;
      }
    }
    if (hasGrok) {
      try {
        return await generateWithGrok(trimmed);
      } catch (grokErr) {
        if (hasOpenAI && grokErr instanceof Error && isQuotaError(grokErr)) {
          return await generateWithOpenAI(trimmed);
        }
        throw grokErr;
      }
    }
    return await generateWithOpenAI(trimmed);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("fetch") || err.message.includes("network")) {
        throw new Error("No internet or server unreachable. Check your connection.");
      }
      throw err;
    }
    throw new Error("Something went wrong. Please try again.");
  }
}
