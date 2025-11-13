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

    // BEST FREE-TIER MODEL FOR INSTRUCTION FOLLOWING
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a LinkedIn post generator.

OUTPUT RULES (MUST FOLLOW EXACTLY):
- Output ONLY VALID HTML.
- Allowed tags: <p>, <ul>, <li>, <div>.
- NO markdown (**text**, ## headings, etc.).
- NO emojis.
- NO additional commentary.
- NO attributes.
- DO NOT wrap with <html>, <head>, <body>.
- DO NOT output backticks.

STRUCTURE TO FOLLOW EXACTLY:
<p>[Hook — short, scroll-stopping]</p>

<p>[Short insight — 1]</p>
<p>[Short insight — 2]</p>

<ul>
  <li>• [bullet point 1]</li>
  <li>• [bullet point 2]</li>
  <li>• [bullet point 3]</li>
  <li>• [bullet point 4]</li>
</ul>

<p>[Closing CTA or takeaway]</p>

<div>[Hashtags on one line]</div>

TOPIC: "${topic}"
TONE: "${tone || "professional, concise, clean"}"

NOW OUTPUT ONLY THE HTML.`;

    const result = await model.generateContent(prompt);

    const raw =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "";

    // REMOVE MARKDOWN BY FORCE
    const cleaned = raw
      .replace(/^\s*##\s*/gm, "")       // remove markdown headings
      .replace(/\*\*/g, "")            // remove bold markdown
      .replace(/[*_`]/g, "")           // remove more markdown symbols
      .replace(/<\/?(?!p|ul|li|div)[^>]*>/g, ""); // remove all other tags

    res.json({ post: cleaned });
  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: "Failed to generate" });
  }
});

app.listen(5000, () =>
  console.log("Local API running at http://localhost:5000/generate")
);
