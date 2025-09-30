const { MongoClient } = require("mongodb");
const fs = require("fs");
require("dotenv").config();

const uri = process.env.MONGO_URI; // строка подключения из .env
const client = new MongoClient(uri);

async function loadData() {
  try {
    await client.connect();
    const db = client.db("cefr_speaking"); // база
    const collection = db.collection("tests"); // коллекция

    // читаем вопросы из JSON
    const data = JSON.parse(fs.readFileSync("questions.json", "utf-8"));

    // очищаем коллекцию перед загрузкой (чтобы не было дублей)
    await collection.deleteMany({});
    console.log("🗑 Коллекция очищена");

    // загружаем новые вопросы
    if (Array.isArray(data)) {
      await collection.insertMany(data);
    } else {
      await collection.insertOne(data);
    }

    console.log("✅ Вопросы успешно загружены в MongoDB Atlas!");
  } catch (err) {
    console.error("❌ Ошибка загрузки:", err);
  } finally {
    await client.close();
  }
}

loadData();
