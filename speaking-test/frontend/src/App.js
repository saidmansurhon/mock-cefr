import React, { useEffect, useState } from "react";
import SpeechTest from "./SpeechTestLogic";

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

        // ✅ Правильная нормализация структуры частей
        const formattedParts = (data.parts || []).map((part) => {
  const payload = part.payload || part; // ✅ добавлено: чтобы брать поля напрямую, если payload нет
  return {
    name: part.name,
    questions: payload.questions || [],
    pictures: payload.pictures || [],
    question: payload.question || "", // ✅ теперь Part 3 получит свой вопрос
    For: payload.For || [],
    Against: payload.Against || []
  };
});



        setParts(formattedParts);
        console.log("✅ LOADED PARTS:", formattedParts)
        
      })
      .catch((err) => console.error("Ошибка загрузки теста:", err));
  }, []);

  async function handleAnswer(blob, partName, qIndex) {
    const formData = new FormData();
    formData.append("audio", blob, "speech.webm");
    formData.append("sessionId", sessionId);
    formData.append("part", partName);
    formData.append("qIndex", qIndex);

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
        <p>
          <b>Level:</b> {finalResult.level}
        </p>
        <p>{finalResult.explanation}</p>
        <p>💡 {finalResult.tip}</p>
      </div>
    );
  }

  if (!parts.length) return <p>Загрузка...</p>;

  const part = parts[currentPart];

  return (
    <SpeechTest
      partName={part.name}
      questions={part.questions || []}
      pictures={part.pictures || []}
      question={part.question} // 👈 для Part 3
      forList={part.For || []} // 👈 для Part 3
      againstList={part.Against || []} // 👈 для Part 3
      onAnswerComplete={handleAnswer}
      onPartComplete={handlePartComplete}
    />
  );
}

export default App;
