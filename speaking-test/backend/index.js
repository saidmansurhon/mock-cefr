import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";
import crypto from "crypto";
import { MongoClient, GridFSBucket } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// ============================
// 📦 Подключение MongoDB
// ============================
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
let testsCollection;
let bucket;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("cefr_speaking");
    testsCollection = db.collection("tests");
    bucket = new GridFSBucket(db, { bucketName: "pictures" });
    console.log("✅ Подключено к MongoDB Atlas");
  } catch (err) {
    console.error("❌ Ошибка подключения к MongoDB:", err);
  }
}
connectDB();

// ============================
// 📷 Раздача картинок из GridFS
// ============================
app.get("/images/:filename", (req, res) => {
  try {
    const downloadStream = bucket.openDownloadStreamByName(req.params.filename);
    res.set("Content-Type", "image/png");
    downloadStream.on("error", () => res.status(404).json({ error: "Image not found" }));
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Ошибка при загрузке изображения" });
  }
});

// ============================
// 🔑 API ключи
// ============================
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🎧 Deepgram — распознавание речи
async function transcribeWithDeepgram(filePath) {
  const stream = fs.createReadStream(filePath);
  const resp = await fetch("https://api.deepgram.com/v1/listen", {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": "audio/webm",
    },
    body: stream,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Deepgram error ${resp.status}: ${txt}`);
  }
  return await resp.json();
}

// ============================
// 🧠 Сессии
// ============================
const sessions = {}; // { sessionId: { answers, total, received, testTitle, finalResult? } }

// ============================
// 🎬 API: старт теста
// ============================
app.get("/api/start", async (req, res) => {
  try {
    const count = await testsCollection.countDocuments();
    if (count === 0) return res.status(404).json({ error: "No tests in database." });

    const randomIndex = Math.floor(Math.random() * count);
    const testCursor = await testsCollection.find().skip(randomIndex).limit(1).toArray();
    const test = testCursor[0];

    if (!test?.parts) {
      return res.status(500).json({ error: "Invalid test format in database" });
    }

    const sessionId = crypto.randomUUID();

    const parts = Object.entries(test.parts).map(([name, payload]) => ({
      name,
      questions: payload.questions || (payload.question ? [payload.question] : []),
      pictures: payload.pictures || [],
      For: payload.For || [],
      Against: payload.Against || [],
    }));

    const totalQuestions = parts.reduce(
      (acc, p) => acc + (p.questions?.length || 0),
      0
    );

    sessions[sessionId] = {
      answers: {},
      received: 0,
      total: totalQuestions,
      createdAt: Date.now(),
      testTitle: test.title,
    };

    res.json({ sessionId, testTitle: test.title, parts });
  } catch (err) {
    console.error("Ошибка /api/start:", err);
    res.status(500).json({ error: "Ошибка при загрузке теста" });
  }
});

// ============================
// 🎤 API: загрузка аудио
// ============================
app.post("/api/speech", upload.single("audio"), async (req, res) => {
  try {
    const { sessionId, part, qIndex } = req.body;
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

    if (!sessions[sessionId].answers[part]) {
      sessions[sessionId].answers[part] = [];
    }
    sessions[sessionId].answers[part].push({ qIndex: Number(qIndex), answer: transcript });

    sessions[sessionId].received += 1;
    try { fs.unlinkSync(req.file.path); } catch {}

    // Когда все ответы собраны — сразу считаем финальный результат (1 вызов OpenAI)
    if (sessions[sessionId].received >= sessions[sessionId].total) {
      const final = await getFinalResult(sessionId);
      sessions[sessionId].finalResult = final; // 🧠 кешируем
      return res.json({ final });
    }

    res.json({ ok: true, transcription: transcript });
  } catch (err) {
    console.error("Ошибка /api/speech:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ============================
// 🏁 API: получить финальный результат (без лишнего вызова OpenAI)
// ============================
app.get("/api/final", async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId || !sessions[sessionId]) {
      return res.status(400).json({ error: "Invalid sessionId" });
    }

    // 🧠 Если финальный результат уже есть — просто вернуть
    if (sessions[sessionId].finalResult) {
      return res.json({ final: sessions[sessionId].finalResult, cached: true });
    }

    // 🆕 Если нет — вызвать OpenAI 1 раз
    const final = await getFinalResult(sessionId);
    sessions[sessionId].finalResult = final;
    res.json({ final, cached: false });

  } catch (err) {
    console.error("Ошибка /api/final:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ============================
// 🧠 Функция для финальной оценки
// ============================
async function getFinalResult(sessionId) {
  const sess = sessions[sessionId];
  const test = await testsCollection.findOne({ title: sess.testTitle });
  const orderedParts = Object.entries(test.parts).map(([name]) => name);

  const combined = orderedParts
    .map((pn) => {
      const qs = test.parts[pn].questions || (test.parts[pn].question ? [test.parts[pn].question] : []);
      const ans = sess.answers[pn] || [];
      return `--- ${pn} ---\nQuestions: ${JSON.stringify(qs)}\nAnswers: ${JSON.stringify(ans)}`;
    })
    .join("\n\n");

  const systemPrompt = `
You are an experienced English teacher and CEFR rater.
You will receive the student's answers to a multi-part speaking test.
Provide a JSON object with EXACT fields: level, explanation, tip.
`.trim();

  const userPrompt = `Student responses:\n\n${combined}`;

  const chatResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 500,
  });

  const aiText = chatResponse.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(aiText.match(/\{[\s\S]*\}/)[0]);
  } catch {
    parsed = { level: "Unknown", explanation: aiText, tip: "" };
  }

  return parsed;
}

// ============================
// 🚀 Запуск сервера
// ============================
app.listen(port, () => {
  console.log(`✅ Сервер запущен: http://localhost:${port}`);
});
