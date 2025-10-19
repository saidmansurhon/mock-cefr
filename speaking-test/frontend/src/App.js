import React, { useEffect, useState } from "react";
import SpeechTest from "./SpeechTestLogic";

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [parts, setParts] = useState([]);
  const [currentPart, setCurrentPart] = useState(0);
  const [finalResult, setFinalResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/start")
      .then((res) => res.json())
      .then((data) => {
        setSessionId(data.sessionId);
        const formattedParts = (data.parts || []).map((part) => {
          const payload = part.payload || part;
          return {
            name: part.name ?? "Unknown",
            questions: payload.questions ?? [],
            pictures: payload.pictures ?? [],
            question: payload.question ?? "",
            For: payload.For ?? [],
            Against: payload.Against ?? [],
          };
        });
        setParts(formattedParts);
      })
      .catch((err) => setError("Ошибка загрузки теста"))
      .finally(() => setLoading(false));
  }, []);

  async function handleAnswer(blob, partName, qIndex) {
    const formData = new FormData();
    formData.append("audio", blob, "speech.webm");
    formData.append("sessionId", sessionId);
    formData.append("part", partName);
    formData.append("qIndex", qIndex);

    const res = await fetch("http://localhost:5000/api/speech", { method: "POST", body: formData });
    const data = await res.json();
    if (data.final) {
      setFinalResult(data.final);
    }
  }

  async function handlePartComplete() {
    if (currentPart < parts.length - 1) {
      setCurrentPart((i) => i + 1);
    } else {
      console.log("✅ Все части пройдены");
      if (!finalResult) {
        const res = await fetch(`http://localhost:5000/api/final?sessionId=${sessionId}`);
        const data = await res.json();
        setFinalResult(data.final);
      }
    }
  }

  if (loading) return <p>⏳ Загрузка...</p>;
  if (error) return <p>❌ {error}</p>;

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

  const part = parts[currentPart];

  return (
    <SpeechTest
      partName={part.name}
      questions={part.questions}
      pictures={part.pictures}
      question={part.question}
      forList={part.For}
      againstList={part.Against}
      onAnswerComplete={handleAnswer}
      onPartComplete={handlePartComplete}
    />
  );
}

export default App;
