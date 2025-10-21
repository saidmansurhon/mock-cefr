import React, { useEffect, useState } from "react";
import styles from "./SpeechTestUI.module.css";

export default function SpeechTestUI({
  phase,
  timeLeft,
  progressPercent,
  formatTime,
  questions,
  currentIndex,
  question,
  pictures,
  startPreparation,
  manualStop,
  partName, // 👈 добавляем сюда
}) {
  const [fadeClass, setFadeClass] = useState(styles.fadeIn);

  // 🪄 Плавный переход между вопросами
  useEffect(() => {
    setFadeClass(styles.fadeOut);
    const timeout = setTimeout(() => {
      setFadeClass(styles.fadeIn);
    }, 200);
    return () => clearTimeout(timeout);
  }, [currentIndex]);

  // 🧭 Список уровней (должен совпадать с partName в родителе)
  const levels = ["Part 1.1", "Part 1.2", "Part 2", "Part 3"];

  return (
    <div className={styles.container}>
      {/* 🔝 Верхняя часть: уровни + заголовок */}
      <div className={styles.topSection}>
        <div className={styles.levels}>
          {levels.map((level, idx) => (
            <div
              key={idx}
              className={`${styles.levelBadge} ${
                partName === level ? styles.activeLevel : styles.pendingLevel
              }`}
            >
              {level.replace("Part ", "")}
            </div>
          ))}
        </div>

        <div className={styles.questionHeader}>
          QUESTION {currentIndex + 1}
        </div>
      </div>

      {/* 📸 Фото */}
      {pictures && pictures.length > 0 && (
        <div className={styles.imageWrapper}>
          <img
            src={pictures[currentIndex] || pictures[0]}
            alt={`question-${currentIndex + 1}`}
            className={styles.image}
          />
        </div>
      )}

      {/* ❓ Вопрос */}
      <h3 className={`${styles.question} ${fadeClass}`}>
        {question ||
          (questions?.length ? questions[currentIndex] : "Вопрос отсутствует")}
      </h3>

      {/* 🎤 Кнопка */}
      <div className={styles.buttonWrapper}>
        {phase === "idle" ? (
          <button
            className={styles.waveBtn}
            onClick={() => startPreparation(currentIndex)}
          >
            ▶️ Start
          </button>
        ) : (
          <button
            className={`${styles.waveBtn} ${styles.stopBtn} ${
              phase === "answer" ? styles.recording : ""
            }`}
            onClick={manualStop}
          >
            {phase === "answer" && (
              <>
                <div className={styles.micWrapper}>
                  <img
                    src="/microphone.png"
                    alt="microphone"
                    className={styles.micIcon}
                  />
                </div>
                <span className={styles.wave}></span>
                <span className={`${styles.wave} ${styles.wave2}`}></span>
                <span className={`${styles.wave} ${styles.wave3}`}></span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 🕒 Таймер */}
      <div className={styles.timerContainer}>
        <div className={styles.timerCircle}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="62" stroke="#eee" strokeWidth="10" fill="none" />
            <circle
              cx="70"
              cy="70"
              r="62"
              stroke={phase === "prep" ? "#ff9800" : "#d32f2f"}
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

          <div
            className={`${styles.timerCenter} ${
              phase === "answer" ? styles.pulsing : ""
            }`}
          >
            <div className={styles.timerText}>
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
      </div>
    </div>
  );
}
