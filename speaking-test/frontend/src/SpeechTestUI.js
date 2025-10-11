import React from "react";

export default function SpeechTestUI({
  partName,
  phase,
  timeLeft,
  progressPercent,
  formatTime,
  questions,
  currentIndex,
  question,
  pictures,
  forList,
  againstList,
  startPreparation,
  manualStop,
}) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h2>{partName}</h2>

      {/* Вопросы */}
      {partName === "Part 2" ? (
        <ul>
          {questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      ) : (
        <h3>
          {partName === "Part 3"
            ? (question || (questions && questions[0]) || "Вопрос отсутствует")
            : (questions && questions.length
                ? questions[currentIndex]
                : "Вопрос отсутствует")}
        </h3>
      )}

      {/* Картинки */}
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
              onError={(e) => (e.currentTarget.style.opacity = 0.6)}
            />
          ))}
        </div>
      )}

      {/* Аргументы для Part 3 */}
      {partName === "Part 3" && (
        <div style={{ marginTop: 16 }}>
          <div>
            <b>For:</b>
            <ul>{forList.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
          <div>
            <b>Against:</b>
            <ul>{againstList.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        </div>
      )}

      {/* Прогресс-бар */}
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
            ? formatTime(timeLeft)
            : phase === "prep"
            ? "Prep"
            : phase === "answer"
            ? "Rec"
            : "Ready"}
        </div>
      </div>

      {/* Кнопки */}
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

      {/* Индикатор текущего вопроса */}
      {partName !== "Part 2" && partName !== "Part 3" && (
        <div style={{ marginTop: 12, fontSize: 14, color: "#555" }}>
          Question {currentIndex + 1} / {questions.length}
        </div>
      )}
    </div>
  );
}
