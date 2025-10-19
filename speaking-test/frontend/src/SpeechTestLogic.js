import React, { useState, useEffect, useRef } from "react";
import SpeechTestUI from "./SpeechTestUI";

export default function SpeechTest({
  partName,
  questions = [],
  pictures = [],
  question = "",
  forList = [],
  againstList = [],
  onAnswerComplete,
  onPartComplete,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const beepRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

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

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const playBeep = async () => {
    try {
      if (!beepRef.current) beepRef.current = new Audio("/beep.mp3");
      await beepRef.current.play();
    } catch (e) {
      console.warn("beep play fail:", e?.message || e);
    }
  };

  const startPreparation = (index = currentIndex) => {
    if (phase !== "idle") return;
    setPhase("prep");

    let prepTime = 5;
    if (partName === "Part 1.2" && index === 0) prepTime = 10;
    if (partName === "Part 2" || partName === "Part 3") prepTime = 60;

    startTimer(prepTime, () => startRecording(index));
  };

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

        const qLen = Array.isArray(questions) ? questions.length : 0;
        if (partName !== "Part 2" && index < qLen - 1) {
  setCurrentIndex(index + 1);
} else {
  // ✅ Даем серверу 0.5 секунды, чтобы успеть вернуть результат
  setTimeout(() => {
    if (onPartComplete) onPartComplete();
  }, 500);
}

      };

      mr.start();

      let answerTime = 30;
      if (partName === "Part 1.2" && index === 0) answerTime = 45;
      if (partName === "Part 2" || partName === "Part 3") answerTime = 120;

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

  useEffect(() => {
    if (phase === "idle" && currentIndex > 0 && currentIndex < (questions?.length || 0)) {
      startPreparation(currentIndex);
    }
  }, [currentIndex]);

  const manualStop = () => {
    clearTimer();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      setPhase("idle");
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      stopMediaTracks();
    };
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
    setPhase("idle");
    setTimeLeft(0);
    setTotalTime(0);
  }, [partName]);

  const formatTime = (seconds) => {
    if (partName === "Part 2" || partName === "Part 3") {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    }
    return `${seconds}s`;
  };

  const progressPercent = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const absolutePictures = (pictures || []).map((p) =>
    p.startsWith("http://") || p.startsWith("https://")
      ? p
      : `http://localhost:5000${p}`
  );

  return (
    <SpeechTestUI
      partName={partName}
      phase={phase}
      timeLeft={timeLeft}
      progressPercent={progressPercent}
      formatTime={formatTime}
      questions={questions}
      currentIndex={currentIndex}
      question={question}
      pictures={absolutePictures}
      forList={forList}
      againstList={againstList}
      startPreparation={startPreparation}
      manualStop={manualStop}
    />
  );
}
