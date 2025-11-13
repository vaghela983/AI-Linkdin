import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/generate", async (req, res) => {
  try {
    const { topic, tone } = req.body;

    // Best free instruction-following model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite"
    });

    // ===================== PROMPT =====================
    const prompt = `
You are a STRICT HTML generator. Follow ALL rules exactly.

FORBIDDEN OUTPUT:
- "html"
- "HTML"
- "\n"
- ANY text before <h1>
- ANY unclosed tags

HARD RULES:
1. Output ONLY valid HTML.
2. Allowed tags: <h1>, <h2>, <h3>, <ul>, <li>, <p>, <div>.
3. ALL tags MUST be closed: </h1>, </h2>, </h3>, </li>, </p>, </div>.
4. No markdown (** * ##).
5. No attributes allowed.
6. Exactly 3 emojis total:
   - 1 in <h1>
   - 1 in FIRST <li>
   - 1 in CTA <p>
7. At least 20 lines of HTML.
8. Only the structure below is allowed.

STRUCTURE:

<h1>[Hook — EXACTLY 1 emoji]</h1>

<h2>[Insight 1 — EXACTLY 2 sentences]</h2>
<h3>[Insight 2 — EXACTLY 2 sentences]</h3>

<ul>
  <li>[Bullet 1 — EXACTLY 1 emoji — EXACTLY 2 sentences]</li>
  <li>[Bullet 2 — EXACTLY 2 sentences]</li>
  <li>[Bullet 3 — EXACTLY 2 sentences]</li>
  <li>[Bullet 4 — EXACTLY 2 sentences]</li>
  <li>[Bullet 5 — EXACTLY 2 sentences]</li>
</ul>

<p>[CTA — EXACTLY 1 emoji — EXACTLY 2 sentences]</p>

<div>[Hashtags one line]</div>

TOPIC: "${topic}"
TONE: "${tone || "professional, clean, modern"}"

NOW OUTPUT ONLY THE HTML. NOTHING ELSE.
`;
    // ====================================================

    const result = await model.generateContent(prompt);

    // Extract raw output
    let raw =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

   // ===================== FINAL SANITIZER (NO \n ANYWHERE) =====================

// 1. Remove unwanted prefixes
raw = raw
  .replace(/^html/i, "")
  .replace(/^HTML/i, "")
  .replace(/\\n/g, "")     // remove literal "\n"
  .replace(/\n/g, "")      // remove real newline characters
  .trim();

// 2. Remove disallowed tags
raw = raw.replace(
  /<\/?(?!h1|h2|h3|ul|li|p|div)[^>]*>/gi,
  ""
);

// 3. Auto-close missing heading tags
raw = raw.replace(/<h1>([^<]*?)(?=<h2>|$)/g, "<h1>$1</h1>");
raw = raw.replace(/<h2>([^<]*?)(?=<h3>|$)/g, "<h2>$1</h2>");
raw = raw.replace(/<h3>([^<]*?)(?=<ul>|$)/g, "<h3>$1</h3>");

// 4. Auto-close <p> and <div>
raw = raw.replace(/<p>([^<]*?)(?=<div>|$)/g, "<p>$1</p>");
raw = raw.replace(/<div>([^<]*?)(?=$)/g, "<div>$1</div>");

// 5. Auto-fix <li> closing
raw = raw.replace(/<li>([^<]+?)(?=<li>|<\/ul>)/g, "<li>$1</li>");

// 6. Remove empty repeated <div></div>
raw = raw.replace(/(<div><\/div>){2,}/g, "<div></div>");

// 7. Remove markdown symbols
raw = raw.replace(/[*_`]/g, "");

// 8. Remove ALL remaining newline characters (FINAL HARD CLEAN)
raw = raw.replace(/[\r\n]+/g, "");

// 9. Remove accidental spaces before/after tags
raw = raw.replace(/\s+</g, "<").replace(/>\s+/g, ">");

// =================== END SANITIZER ===================

    res.json({ post: raw });
  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

app.listen(5000, () =>
  console.log("API running → http://localhost:5000/generate")
);

