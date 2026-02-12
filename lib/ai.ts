import type { Recipe } from "@/types";

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
  // Remove trailing commas before } or ] (invalid in JSON)
  s = s.replace(/,(\s*[}\]])/g, "$1");
  // Remove newlines that appear between JSON tokens
  s = s.replace(/(\s*\n\s*)/g, " ");
  // Remove multiple spaces
  s = s.replace(/\s+/g, " ");
  // Fix missing comma between properties: "title":"x" "time" → "title":"x", "time"
  s = s.replace(/"(\s+)"(\s*:)/g, '", $2');
  return s;
}

/**
 * Repair JSON broken by AI: literal newlines, unescaped quotes, missing commas, etc.
 * "Unterminated string" usually means the model put a newline or " inside a value.
 */
function repairJsonStringValues(s: string): string {
  let out = "";
  let i = 0;
  let inString = false;
  let escape = false;

  function peekAhead(from: number): string {
    let j = from;
    while (j < s.length && /[\s\n\r]/.test(s[j])) j++;
    return s[j] ?? "";
  }

  while (i < s.length) {
    const c = s[i];
    if (escape) {
      if (c === "\n" || c === "\r") {
        out += "\\n";
      } else {
        out += c;
      }
      escape = false;
      i++;
      continue;
    }
    if (c === "\\") {
      out += c;
      escape = true;
      i++;
      continue;
    }
    if (c === '"' && !inString) {
      inString = true;
      out += c;
      i++;
      continue;
    }
    if (c === '"' && inString) {
      const next = peekAhead(i + 1);
      if (next === "" || next === ":" || next === "," || next === "}" || next === "]" || next === '"') {
        inString = false;
        out += c;
        i++;
        continue;
      }
      // Unescaped quote inside string - escape it
      out += '\\"';
      i++;
      continue;
    }
    if (inString) {
      if (c === "\n" || c === "\r") {
        out += "\\n";
        i++;
        continue;
      }
      // Handle backslash before special chars inside strings
      if (c === "\\") {
        const next = s[i + 1];
        if (next === '"' || next === "n" || next === "r" || next === "\\") {
          out += c;
          i++;
          continue;
        }
        // Remove stray backslashes that break JSON
        i++;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    // Add missing commas between properties (e.g., "title":"x" "time":"y" → "title":"x", "time":"y")
    if (c === '"' && i > 0) {
      const prev = s[i - 1];
      const next = peekAhead(i);
      if (prev === '"' && (next === '"' || next === '{' || next === '[')) {
        out = out.slice(0, -1) + '",';
        out += '"';
        i++;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

function parseRecipeJson(text: string): Recipe[] {
  const sanitized = sanitizeJson(text);
  const jsonStr = repairJsonStringValues(sanitized);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Log the problematic JSON for debugging
    console.error("JSON parsing failed. Sanitized JSON:", jsonStr);
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

  // gemini-2.5-flash: stable, good free-tier quota (separate from 2.0-flash)
  const model = "gemini-2.5-flash";
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
    model: "grok-3-fast",
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

export async function generateRecipes(userInput: string): Promise<Recipe[]> {
  const trimmed = userInput.trim();
  if (!trimmed) {
    throw new Error("Please enter ingredients or a cooking prompt");
  }

  try {
    if (process.env.GEMINI_KEY ?? process.env.NEXT_PUBLIC_GEMINI_KEY) {
      return await generateWithGemini(trimmed);
    }
    if (process.env.GROK_KEY ?? process.env.NEXT_PUBLIC_GROK_KEY) {
      return await generateWithGrok(trimmed);
    }
    throw new Error("No AI API key configured. Add GEMINI_KEY or GROK_KEY in .env.local");
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
