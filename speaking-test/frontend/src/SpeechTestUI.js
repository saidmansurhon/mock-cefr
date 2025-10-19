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
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
        color: "#222",
      }}
    >
      {/* Заголовок */}
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        {partName}
      </h2>

      {/* Вопросы */}
      {partName === "Part 2" ? (
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          {questions.map((q, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {q}
            </li>
          ))}
        </ul>
      ) : (
        <h3 style={{ fontSize: 18, fontWeight: 500, marginTop: 8 }}>
          {question ||
            (questions?.length ? questions[currentIndex] : "Вопрос отсутствует")}
        </h3>
      )}

      {/* Картинки */}
      {pictures && pictures.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          {pictures.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`pic${i}`}
              style={{
                width: "200px",
                height: "auto",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                objectFit: "cover",
                transition: "transform 0.3s",
              }}
              onError={(e) => (e.currentTarget.style.opacity = 0.6)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          ))}
        </div>
      )}

      {/* Аргументы для Part 3 */}
      {partName === "Part 3" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <b>For:</b>
            <ul>{forList.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b>Against:</b>
            <ul>{againstList.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        </div>
      )}

      {/* Круговой прогресс-бар */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          margin: "24px 0",
        }}
      >
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r="62"
              stroke="#eee"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="70"
              cy="70"
              r="62"
              stroke={phase === "prep" ? "#ff9800" : "#4caf50"}
              strokeWidth="10"
              fill="none"
              strokeDasharray={2 * Math.PI * 62}
              strokeDashoffset={2 * Math.PI * 62 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 1s linear, stroke 0.3s ease",
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
              }}
            />
          </svg>

          {/* Центр с текстом */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              animation:
                phase === "answer"
                  ? "pulse 1s infinite ease-in-out"
                  : "none",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: "bold" }}>
              {timeLeft > 0
                ? formatTime(timeLeft)
                : phase === "prep"
                ? "Prep"
                : phase === "answer"
                ? "Rec"
                : "Ready"}
            </div>
          </div>
        </div>

        {/* Название фазы под кругом */}
        <div style={{ marginTop: 10, fontSize: 15, color: "#555" }}>
          {phase === "prep"
            ? "Preparation"
            : phase === "answer"
            ? "Recording"
            : "Idle"}
        </div>
      </div>

      {/* Кнопки */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        {phase === "idle" ? (
          <button
            onClick={() => startPreparation(currentIndex)}
            style={{
              padding: "12px 24px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              cursor: "pointer",
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1565c0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1976d2")}
          >
            ▶️ Start
          </button>
        ) : (
          <button
            onClick={manualStop}
            style={{
              padding: "12px 24px",
              background: "#d32f2f",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              cursor: "pointer",
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#b71c1c")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#d32f2f")}
          >
            ⏹ Stop
          </button>
        )}
      </div>

      {/* Индикатор текущего вопроса */}
      {partName !== "Part 2" && partName !== "Part 3" && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {questions.map((_, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: i === currentIndex ? "#1976d2" : "#ccc",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
      )}

      {/* Анимация для записи */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
