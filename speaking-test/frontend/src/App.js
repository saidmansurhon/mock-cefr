import React, { useEffect, useState } from "react";
import SpeechTest from "./SpeechTest";

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [parts, setParts] = useState([]);
  const [currentPart, setCurrentPart] = useState(0);
  const [finalResult, setFinalResult] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/start")
      .then((res) => res.json())
      .then((data) => {
        setSessionId(data.sessionId);
        setParts(data.parts);
      })
      .catch((err) => console.error("Ошибка загрузки теста:", err));
  }, []);

  async function handleAnswer(blob, partName, qIndex) {
    const formData = new FormData();
    formData.append("audio", blob, "speech.webm");
    formData.append("sessionId", sessionId);
    formData.append("part", partName);
    formData.append("qIndex", qIndex); // 👈 теперь передаем номер вопроса

    const res = await fetch("http://localhost:5000/api/speech", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.final) {
      setFinalResult(data.final);
    }
  }

  function handlePartComplete() {
    if (currentPart < parts.length - 1) {
      setCurrentPart((i) => i + 1);
    } else {
      console.log("✅ Все части пройдены");
    }
  }

  if (finalResult) {
    return (
      <div style={{ padding: 20 }}>
        <h2>📊 Final Result</h2>
        <p><b>Level:</b> {finalResult.level}</p>
        <p>{finalResult.explanation}</p>
        <p>💡 {finalResult.tip}</p>
      </div>
    );
  }

  if (!parts.length) return <p>Загрузка...</p>;

  return (
    <SpeechTest
      partName={parts[currentPart].name}
      questions={parts[currentPart].payload.questions || []}
      pictures={parts[currentPart].payload.pictures || []} // 👈 добавил сюда
      onAnswerComplete={handleAnswer}
      onPartComplete={handlePartComplete}
    />
  );
}

export default App;

