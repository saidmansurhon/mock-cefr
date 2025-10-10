import React, { useState, useEffect, useRef } from "react";

export default function SpeechTest({
  partName,
  questions = [],
  pictures = [],
  onAnswerComplete,
  onPartComplete,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | prep | answer
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const beepRef = useRef(null);

  // --- очистка таймера
  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // --- запуск стабильного таймера
  const startTimer = (seconds, onDone) => {
    clearTimer();
    const endTime = Date.now() + seconds * 1000;

    setTotalTime(seconds);
    setTimeLeft(seconds);

    timerRef.current = setInterval(() => {
      const diff = Math.round((endTime - Date.now()) / 1000);
      if (diff <= 0) {
        clearTimer();
        setTimeLeft(0);
        if (onDone) onDone();
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
  };

  // --- стоп микрофона
  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // --- beep
  const playBeep = async () => {
    try {
      if (!beepRef.current) beepRef.current = new Audio("/beep.mp3");
      await beepRef.current.play();
    } catch {}
  };

  // --- подготовка
  const startPreparation = (index = currentIndex) => {
    if (phase !== "idle") return;
    setPhase("prep");

    let prepTime = 5;
    if (partName === "1.2" && index === 0) prepTime = 10;
    if (partName === "2" || partName === "3") prepTime = 60;

    startTimer(prepTime, () => startRecording(index));
  };

  // --- запись
  const startRecording = async (index = currentIndex) => {
    setPhase("answer");
    chunksRef.current = [];

    await playBeep();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        setPhase("idle");
        stopMediaTracks();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        try {
          await onAnswerComplete(blob, partName, index);
        } catch (err) {
          console.error("onAnswerComplete error:", err);
        }

        if (index < questions.length - 1) {
          const next = index + 1;
          setCurrentIndex(next);
          setTimeout(() => startPreparation(next), 250);
        } else {
          if (onPartComplete) onPartComplete();
        }
      };

      mr.start();

      let answerTime = 30;
      if (partName === "1.2" && index === 0) answerTime = 45;
      if (partName === "2" || partName === "3") answerTime = 120;

      startTimer(answerTime, () => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      });
    } catch (err) {
      console.error("Microphone error:", err);
      setPhase("idle");
      stopMediaTracks();
      clearTimer();
    }
  };

  // --- ручной стоп
  const manualStop = () => {
    clearTimer();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      setPhase("idle");
    }
  };

  // --- очистка при размонтировании
  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      stopMediaTracks();
    };
  }, []);

  const question = questions[currentIndex] || "Вопрос отсутствует";
  const progressPercent =
    totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h2>Part {partName}</h2>
      <h3>{question}</h3>

      {/* картинки */}
  {pictures && pictures.length > 0 && (
  <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
    {pictures.map((src, i) => (
      <img
        key={i}
        src={src}
        alt={`pic${i}`}
        style={{
          width: "200px",
          height: "auto",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        }}
      />
    ))}
  </div>
)}


      {/* прогрессбар */}
      <div
        style={{
          position: "relative",
          height: 24,
          background: "#eee",
          borderRadius: 12,
          overflow: "hidden",
          margin: "16px 0",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: phase === "prep" ? "#ff9800" : "#4caf50",
            transition: "width 1s linear",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            fontWeight: "bold",
            lineHeight: "24px",
          }}
        >
          {timeLeft > 0
            ? `${timeLeft}s`
            : phase === "prep"
            ? "Prep"
            : phase === "answer"
            ? "Rec"
            : "Ready"}
        </div>
      </div>

      {/* кнопки */}
      {phase === "idle" && (
        <button
          onClick={() => startPreparation(currentIndex)}
          style={{
            padding: "12px 20px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 6,
          }}
        >
          ▶️ Start
        </button>
      )}
      {(phase === "prep" || phase === "answer") && (
        <button
          onClick={manualStop}
          style={{
            padding: "12px 20px",
            background: "#d32f2f",
            color: "#fff",
            border: "none",
            borderRadius: 6,
          }}
        >
          ⏹ Stop
        </button>
      )}

      <div style={{ marginTop: 12, fontSize: 14, color: "#555" }}>
        Question {currentIndex + 1} / {questions.length}
      </div>
    </div>
  );
}
