import React, { useState, useEffect, useRef } from "react";

function SpeakingTest() {
  const [sessionId, setSessionId] = useState(null);
  const [parts, setParts] = useState([]);
  const [partIndex, setPartIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/start")
      .then((res) => res.json())
      .then((data) => {
        setSessionId(data.sessionId);
        setParts(data.parts);
      })
      .catch((err) => console.error("Ошибка загрузки теста:", err));
  }, []);

  const startRecording = async () => {
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = handleStop;
    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    setRecording(false);
    mediaRecorderRef.current.stop();
  };

  const handleStop = async () => {
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "speech.webm");
    formData.append("sessionId", sessionId);
    formData.append("part", parts[partIndex].name);

    try {
      const res = await fetch("http://localhost:5000/api/speech", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.final) {
        setFinalResult(data.final);
      } else {
        setPartIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Ошибка отправки аудио:", err);
    }
  };

  if (!parts.length) return <p>Загрузка...</p>;
  const currentPart = parts[partIndex];

  return (
    <div style={{ padding: 20 }}>
      <h2>🎤 English Speaking Mock Test</h2>
      <h3>{currentPart?.name}</h3>

      {/* Вопросы */}
      {currentPart?.payload?.questions?.map((q, i) => <p key={i}>❓ {q}</p>)}
      {currentPart?.payload?.question && <p>❓ {currentPart.payload.question}</p>}

      {/* For/Against (Part 3) */}
      {currentPart?.payload?.For && (
        <div>
          <h4>For:</h4>
          <ul>{currentPart.payload.For.map((f, i) => <li key={i}>✅ {f}</li>)}</ul>
        </div>
      )}
      {currentPart?.payload?.Against && (
        <div>
          <h4>Against:</h4>
          <ul>{currentPart.payload.Against.map((a, i) => <li key={i}>❌ {a}</li>)}</ul>
        </div>
      )}

      {/* Картинки */}
      {currentPart?.payload?.pictures?.map((pic, i) => (
        <img key={i} src={`http://localhost:5000${pic}`} alt="" width="200" style={{ margin: "10px" }} />
      ))}

      {/* Кнопка записи */}
      <button
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: recording ? "red" : "green",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? "🛑 Stop Recording" : "🎙️ Answer"}
      </button>

      {/* Итог */}
      {finalResult && (
        <div style={{ marginTop: 30 }}>
          <h3>📊 Final Result:</h3>
          <p>Level: {finalResult.level}</p>
          <p>{finalResult.explanation}</p>
          <p>💡 {finalResult.tip}</p>
        </div>
      )}
    </div>
  );
}

export default SpeakingTest;

