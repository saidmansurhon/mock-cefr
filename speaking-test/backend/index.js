import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = 5000;

// ============================
// 🔧 Настройка
// ============================

// Разрешаем запросы с фронтенда (React на 3000)
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Раздаём картинки
app.use("/images", express.static("public/images"));

// ============================
// 📂 Тесты (из JSON)
// ============================
const tests = JSON.parse(
  fs.readFileSync(path.join("questions_final_fixed.json"), "utf-8")
);

// Все тесты
app.get("/api/tests", (req, res) => {
  res.json(Object.keys(tests));
});

// Один тест по ID
app.get("/api/tests/:id", (req, res) => {
  const id = req.params.id;
  if (tests[id]) {
    res.json(tests[id]);
  } else {
    res.status(404).json({ error: "Test not found" });
  }
});

// 🎲 Случайный тест
app.get("/api/tests/random", (req, res) => {
  const keys = Object.keys(tests);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  res.json(tests[randomKey]);
});

// ============================
// 🎤 Работа с аудио
// ============================
const upload = multer({ dest: "uploads/" });

// Настройка OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API для загрузки аудио
app.post("/api/speech", upload.single("audio"), async (req, res) => {
  try {
    const audioFile = fs.createReadStream(req.file.path);

    // 1. Отправляем аудио в Deepgram
    const dgResponse = await fetch("https://api.deepgram.com/v1/listen", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/webm",
      },
      body: audioFile,
    });

    const dgData = await dgResponse.json();
    const userText =
      dgData.results?.channels[0]?.alternatives[0]?.transcript || "";

    console.log("📝 Распознанный текст (Deepgram):", userText);

    if (!userText) {
      return res.status(400).json({ error: "Не удалось распознать речь" });
    }

    // 2. Отправляем текст в OpenAI
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an English teacher. The user will speak in English. " +
            "Your task is to: " +
            "1) evaluate their CEFR speaking level (A1–C2), " +
            "2) give a short explanation why (vocabulary, grammar, fluency), " +
            "3) suggest one improvement tip.",
        },
        { role: "user", content: userText },
      ],
    });

    const aiAnswer = chatResponse.choices[0].message.content;

    // 3. Возвращаем результат
    res.json({
      transcription: userText,
      feedback: aiAnswer,
    });

    // Удаляем временный файл
    fs.unlinkSync(req.file.path);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    res.status(500).json({ error: "Ошибка при обработке аудио" });
  }
});

// ============================
// 🚀 Запуск сервера
// ============================
app.listen(port, () => {
  console.log(`✅ Backend запущен: http://localhost:${port}`);
});
