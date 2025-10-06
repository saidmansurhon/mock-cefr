// backend/index.js
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";
import crypto from "crypto";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use("/images", express.static(path.join(process.cwd(), "public/images")));

// --- Загружаем JSON с тестами
const testsPath = path.join(process.cwd(), "questions_final_fixed.json");
const tests = fs.existsSync(testsPath) ? JSON.parse(fs.readFileSync(testsPath, "utf-8")) : {};
const testKeys = Object.keys(tests);
const TEST_KEY = testKeys.length > 0 ? testKeys[0] : null;
const FIXED_TEST = TEST_KEY ? tests[TEST_KEY] : null;

const sessions = {};
const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Deepgram transcription helper
async function transcribeWithDeepgram(filePath) {
  const stream = fs.createReadStream(filePath);
  const resp = await fetch("https://api.deepgram.com/v1/listen", {
    method: "POST",
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
    body: stream,
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Deepgram error ${resp.status}: ${txt}`);
  }
  return await resp.json();
}

// ----------------------
// API: старт теста
// ----------------------
app.get("/api/start", (req, res) => {
  if (!FIXED_TEST) {
    return res.status(500).json({ error: "No tests available on server." });
  }

  const sessionId = crypto.randomUUID();

  // 🔹 Жёстко берём только то, что есть в JSON
  const parts = Object.entries(FIXED_TEST.parts).map(([name, payload]) => ({
    name,
    payload: {
      questions: payload.questions || [],
      question: payload.question || null,
      For: payload.For || [],
      Against: payload.Against || [],
      pictures: Array.isArray(payload.pictures) ? [...payload.pictures] : [],
    },
  }));

  sessions[sessionId] = {
    answers: {},
    received: 0,
    total: parts.length,
    createdAt: Date.now(),
  };

  res.json({ sessionId, testTitle: FIXED_TEST.title || TEST_KEY, parts });
});

// ----------------------
// API: приём аудио
// ----------------------
app.post("/api/speech", upload.single("audio"), async (req, res) => {
  try {
    const { sessionId, part } = req.body;
    if (!sessionId || !part) return res.status(400).json({ error: "sessionId and part are required" });
    if (!sessions[sessionId]) return res.status(400).json({ error: "Invalid sessionId" });
    if (!req.file) return res.status(400).json({ error: "Audio file is required" });

    let dgJson;
    try {
      dgJson = await transcribeWithDeepgram(req.file.path);
    } catch (e) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(500).json({ error: "Deepgram transcription failed", detail: String(e) });
    }

    const transcript = dgJson.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    sessions[sessionId].answers[part] = transcript;
    sessions[sessionId].received += 1;

    try { fs.unlinkSync(req.file.path); } catch {}

    if (sessions[sessionId].received < sessions[sessionId].total) {
      return res.json({ ok: true, transcription: transcript });
    }

    // 🔹 Итоговая оценка
    const orderedParts = Object.entries(FIXED_TEST.parts).map(([name]) => name);
    const combined = orderedParts
      .map((pn) => `--- ${pn} ---\nQuestion(s): ${JSON.stringify(FIXED_TEST.parts[pn])}\nAnswer: ${sessions[sessionId].answers[pn] || ""}`)
      .join("\n\n");

    const systemPrompt = `
You are an experienced English teacher and CEFR rater.
You will receive the student's answers to a multi-part speaking test.
Provide a JSON object with EXACT fields: level, explanation, tip.
    `.trim();

    const userPrompt = `Student responses:\n\n${combined}`;

    let chatResponse;
    try {
      chatResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });
    } catch (err) {
      delete sessions[sessionId];
      return res.status(500).json({ error: "OpenAI error", detail: String(err) });
    }

    const aiText = chatResponse.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(aiText.match(/\{[\s\S]*\}/)[0]);
    } catch {
      parsed = { level: "Unknown", explanation: aiText, tip: "" };
    }

    delete sessions[sessionId];
    return res.json({ final: parsed, raw: aiText });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ----------------------
app.listen(port, () => {
  console.log(`✅ Backend запущен: http://localhost:${port}`);
});


