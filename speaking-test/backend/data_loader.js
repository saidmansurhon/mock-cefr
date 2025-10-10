import { MongoClient, GridFSBucket } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function loadData() {
  try {
    await client.connect();
    const db = client.db("cefr_speaking");
    const collection = db.collection("tests");
    const bucket = new GridFSBucket(db, { bucketName: "pictures" });

    // читаем JSON
    const data = JSON.parse(fs.readFileSync("questions.json", "utf-8"));

    for (const [key, value] of Object.entries(data)) {
      if (!value.parts) continue;

      // обновляем тест или вставляем новый
      await collection.updateOne(
        { title: value.title || key },
        { $set: { title: value.title || key, parts: value.parts } },
        { upsert: true }
      );

      // загружаем картинки, если их ещё нет
      for (const part of Object.values(value.parts)) {
        if (Array.isArray(part.pictures)) {
          for (const pic of part.pictures) {
            const cleanPath = pic.replace(/^\/images\//, "");
            const filePath = path.join("images", cleanPath);

            if (fs.existsSync(filePath)) {
              // проверяем, есть ли уже такая картинка в GridFS
              const existing = await db.collection("pictures.files").findOne({ filename: cleanPath });
              if (!existing) {
                const uploadStream = bucket.openUploadStream(cleanPath);
                fs.createReadStream(filePath).pipe(uploadStream);
                console.log(`✅ Загружено новое изображение: ${cleanPath}`);
              } else {
                console.log(`ℹ️ Уже существует: ${cleanPath}`);
              }
            } else {
              console.warn(`⚠️ Файл не найден локально: ${filePath}`);
            }
          }
        }
      }
    }

    console.log("🎉 Загрузка завершена (новые тесты и фото добавлены)");

  } catch (err) {
    console.error("❌ Ошибка загрузки:", err);
  } finally {
    await client.close();
  }
}

loadData();


