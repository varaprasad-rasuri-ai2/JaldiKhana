# JaldiKhana

A single-page web app that suggests **quick Indian recipes** from ingredients or a short prompt, powered by AI (Gemini, Grok, or OpenAI). Results can be downloaded as TXT, PDF, or DOCX.

## Demo

Try it at [jaldikhana.vercel.app](https://jaldikhana.vercel.app/).

## Tech stack

- **Next.js** (App Router), **TypeScript**, **Zustand**, **Tailwind CSS**, PWA manifest

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`
   - Add at least one key:
     - **Gemini:** [Get key](https://aistudio.google.com/apikey) → `GEMINI_KEY=your_key`
     - **Grok:** [Get key](https://console.x.ai) → `GROK_KEY=your_key`
     - **OpenAI:** [Get key](https://platform.openai.com/api-keys) → `OPENAI_API_KEY=your_key`

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Flow

1. Enter ingredients or a prompt (e.g. *"I have rice, dal, onion. Need lunch in 20 minutes"*).
2. Click **Generate Recipe**.
3. View recipe cards; use **Download TXT / PDF / DOCX** to save.

## Project structure

```
/app
  page.tsx           # Main page
  layout.tsx
  api/generate/      # POST API for AI
/components
  InputBox.tsx
  ResultCard.tsx
  DownloadButtons.tsx
  GenerateSection.tsx
  ResultsSection.tsx
/store
  store.ts           # Zustand
/lib
  ai.ts              # Gemini, Grok, OpenAI
  export.ts          # TXT, PDF, DOCX
/types
  index.ts           # Recipe type
```

## Deployment (e.g. Vercel)

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Add `GEMINI_KEY`, `GROK_KEY`, and/or `OPENAI_API_KEY` in Vercel → Settings → Environment Variables.
4. Deploy.

## PWA

`public/manifest.json` is linked from the layout. Add `icon-192.png` and `icon-512.png` in `public/` for full PWA icons (optional).

## License

For learning use.
