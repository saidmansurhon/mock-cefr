import React, { useState, useEffect, useRef } from "react";

function SpeechTest() {
  const [test, setTest] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [response, setResponse] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 📥 Загружаем случайный тест при загрузке страницы
  useEffect(() => {
    fetch("http://localhost:5000/api/tests/random")
      .then((res) => res.json())
      .then((data) => setTest(data))
      .catch((err) => console.error("Ошибка загрузки теста:", err));
  }, []);

  // 🎤 Начать запись
  const startRecording = async () => {
    setTranscription("");
    setResponse("");
    setRecording(true);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);

    audioChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = handleStop;
    mediaRecorderRef.current.start();
  };

  // 🛑 Остановить запись
  const stopRecording = () => {
    setRecording(false);
    mediaRecorderRef.current.stop();
  };

  // 📤 Отправляем запись на backend
  const handleStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", audioBlob, "speech.webm");

    try {
      const res = await fetch("http://localhost:5000/api/speech", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setTranscription(data.transcription);
      setResponse(data.feedback);
    } catch (err) {
      console.error("Ошибка при отправке аудио:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🎤 English Speaking Test</h2>

      {/* 📌 Вопросы и картинки */}
      {test && (
        <>
          <h3>{test.title}</h3>
          {Object.entries(test.parts).map(([partName, part]) => (
            <div key={partName} style={{ marginBottom: "20px" }}>
              <h4>{partName}</h4>

              {/* Вопросы */}
              {part.questions &&
                part.questions.map((q, i) => <p key={i}>❓ {q}</p>)}

              {/* Фото */}
              {part.pictures &&
                part.pictures.map((pic, i) => (
                  <img
                    key={i}
                    src={`http://localhost:5000${pic}`}
                    alt={`pic-${i}`}
                    width="200"
                    style={{ margin: "10px" }}
                  />
                ))}

              {/* Part 3 — вопрос + аргументы */}
              {part.question && <p><b>❓ {part.question}</b></p>}
              {part.For && (
                <>
                  <p>✅ For:</p>
                  <ul>
                    {part.For.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
              {part.Against && (
                <>
                  <p>❌ Against:</p>
                  <ul>
                    {part.Against.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </>
      )}

      {/* 🎙️ Кнопка записи */}
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? "🛑 Stop Recording" : "🎙️ Start Recording"}
      </button>

      {/* Результаты */}
      {transcription && (
        <div>
          <h3>📝 Ваш текст:</h3>
          <p>{transcription}</p>
        </div>
      )}

      {response && (
        <div>
          <h3>📊 Оценка уровня:</h3>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

export default SpeechTest;
