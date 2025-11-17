import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/generate", async (req, res) => {
  try {
    const {
      topic,
      tone,
      industry,
      audience,
      length,
      keywords,
      hashtags,
      engaging,
      stats,
      emojis,
      cta
    } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite"
    });

    // =============== UPDATED FULL PROMPT ===============
    const prompt = `
You are a STRICT HTML generator. Follow ALL rules exactly.

FORBIDDEN OUTPUT:
- "html"
- "HTML"
- "\\n"
- ANY text before <h1>
- ANY unclosed tags
- ANY attributes inside tags

HARD RULES:
1. Output ONLY valid HTML.
2. Allowed tags: <h1>, <h2>, <h3>, <ul>, <li>, <p>, <div>.
3. All tags MUST be properly closed.
4. No markdown allowed.
5. Total emojis allowed: EXACTLY 3.
   - 1 emoji in <h1>
   - 1 emoji in FIRST <li>
   - 1 emoji in CTA <p>
6. At least 20 HTML lines.
7. Must follow the structure below.
8. Must integrate ALL user inputs: topic, tone, industry, audience, length, keywords, hashtags, toggles.

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

<div>[Hashtags one line — space separated — no emojis]</div>

USER INPUTS:
TOPIC: "${topic}"
TONE: "${tone}"
INDUSTRY: "${industry}"
AUDIENCE: "${audience}"
POST LENGTH (characters): "${length}"
KEYWORDS: "${keywords}"
CUSTOM HASHTAGS: "${hashtags}"
ENGAGING QUESTION ENABLED: "${engaging}"
INCLUDE STATS: "${stats}"
INCLUDE EMOJIS: "${emojis}"
INCLUDE CTA: "${cta}"

Final Output Requirement:
→ OUTPUT ONLY THE HTML. NO OTHER TEXT.
→ No extra spaces or blank lines.
→ No comments or explanations.
    `;
    // ====================================================

    const result = await model.generateContent(prompt);

    let raw =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // ===================== SANITIZER =====================
    raw = raw
      .replace(/^html/i, "")
      .replace(/^HTML/i, "")
      .replace(/\\n/g, "")
      .replace(/\n/g, "")
      .trim();

    raw = raw.replace(
      /<\/?(?!h1|h2|h3|ul|li|p|div)[^>]*>/gi,
      ""
    );

    raw = raw.replace(/<h1>([^<]*?)(?=<h2>|$)/g, "<h1>$1</h1>");
    raw = raw.replace(/<h2>([^<]*?)(?=<h3>|$)/g, "<h2>$1</h2>");
    raw = raw.replace(/<h3>([^<]*?)(?=<ul>|$)/g, "<h3>$1</h3>");

    raw = raw.replace(/<p>([^<]*?)(?=<div>|$)/g, "<p>$1</p>");
    raw = raw.replace(/<div>([^<]*?)(?=$)/g, "<div>$1</div>");

    raw = raw.replace(/<li>([^<]+?)(?=<li>|<\/ul>)/g, "<li>$1</li>");

    raw = raw.replace(/(<div><\/div>){2,}/g, "<div></div>");

    raw = raw.replace(/[*_`]/g, "");

    raw = raw.replace(/[\r\n]+/g, "");

    raw = raw.replace(/\s+</g, "<").replace(/>\s+/g, ">");
    // =====================================================

    res.json({ post: raw });

  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

app.listen(5000, () =>
  console.log("API running → http://localhost:5000/generate")
);
