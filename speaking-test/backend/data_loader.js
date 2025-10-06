const { MongoClient, GridFSBucket } = require("mongodb");
const fs = require("fs");
require("dotenv").config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function loadData() {
  try {
    await client.connect();
    const db = client.db("cefr_speaking");
    const collection = db.collection("tests");

    // создаём bucket для картинок
    const bucket = new GridFSBucket(db, { bucketName: "pictures" });

    // читаем JSON
    const data = JSON.parse(fs.readFileSync("questions.json", "utf-8"));

    // функция для загрузки картинки в GridFS и возврата fileId
    async function uploadImage(path) {
      return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(path.split("/").pop());
        fs.createReadStream(`.${path}`)
          .pipe(uploadStream)
          .on("error", reject)
          .on("finish", () => resolve(uploadStream.id));
      });
    }

    // рекурсивно заменяем пути картинок на fileId
    async function processItem(item) {
      if (item.pictures && Array.isArray(item.pictures)) {
        const ids = [];
        for (const pic of item.pictures) {
          const fileId = await uploadImage(pic);
          ids.push(fileId);
        }
        item.pictures = ids;
      }
      if (item.questions) {
        for (const q of Object.values(item.questions)) {
          if (typeof q === "object") await processItem(q);
        }
      }
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        await processItem(item);
      }
    } else {
      await processItem(data);
    }

    // очищаем коллекцию
    await collection.deleteMany({});
    console.log("🗑 Коллекция очищена");

    // сохраняем обновлённые данные
    if (Array.isArray(data)) {
      await collection.insertMany(data);
    } else {
      await collection.insertOne(data);
    }

    console.log("✅ Вопросы + картинки успешно загружены в MongoDB Atlas!");
  } catch (err) {
    console.error("❌ Ошибка загрузки:", err);
  } finally {
    await client.close();
  }
}

loadData();
