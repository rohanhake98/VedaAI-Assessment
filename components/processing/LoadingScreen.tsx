"use client";

import { useEffect, useState } from "react";

const stages = [
  "Uploading files",
  "Reading question paper",
  "Extracting questions",
  "Reading answer sheet",
  "Detecting handwritten answers",
  "Mapping answers to questions",
  "Detecting answer regions",
  "Preparing review",
];

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (stageIndex >= stages.length) {
      const t = setTimeout(() => onComplete?.(), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setStageIndex((i) => i + 1),
      900
    );
    return () => clearTimeout(t);
  }, [stageIndex, onComplete]);

  const currentStage = stages[Math.min(stageIndex, stages.length - 1)];
  const isDone = stageIndex >= stages.length;

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white">
      {/* Animated sparkle stars */}
      <div className="relative flex items-center justify-center mb-8">
        {/* SVG sparkles matching the Figma orange multi-star design */}
        <div className="animate-pulse">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            {/* Large center sparkle */}
            <path
              d="M60 20 L65 55 L100 60 L65 65 L60 100 L55 65 L20 60 L55 55 Z"
              fill="#E85D27"
              className="animate-spin"
              style={{ transformOrigin: "60px 60px", animationDuration: "3s" }}
            />
            {/* Small top-right sparkle */}
            <path
              d="M88 18 L90 28 L100 30 L90 32 L88 42 L86 32 L76 30 L86 28 Z"
              fill="#E85D27"
              opacity="0.8"
            />
            {/* Small bottom-left sparkle */}
            <path
              d="M32 75 L34 83 L42 85 L34 87 L32 95 L30 87 L22 85 L30 83 Z"
              fill="#E85D27"
              opacity="0.6"
            />
            {/* Dot accents */}
            <circle cx="95" cy="58" r="3" fill="#E85D27" opacity="0.5"/>
            <circle cx="25" cy="60" r="2.5" fill="#E85D27" opacity="0.4"/>
            <circle cx="62" cy="15" r="2" fill="#E85D27" opacity="0.5"/>
          </svg>
        </div>
      </div>

      {/* Text */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isDone ? "Done!" : "Extracting..."}
      </h2>
      <p className="text-gray-500 text-base mb-8">This may take a while</p>

      {/* Stage progress */}
      <div className="flex flex-col gap-2 w-72">
        {stages.map((stage, i) => {
          const isCompleted = i < stageIndex;
          const isCurrent = i === stageIndex && !isDone;
          return (
            <div key={stage} className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full flex-shrink-0 transition-all duration-300 ${
                  isCompleted
                    ? "bg-orange-500"
                    : isCurrent
                    ? "bg-orange-300 animate-pulse"
                    : "bg-gray-200"
                }`}
              />
              <span
                className={`text-sm transition-colors ${
                  isCompleted
                    ? "text-gray-400 line-through"
                    : isCurrent
                    ? "text-gray-900 font-medium"
                    : "text-gray-300"
                }`}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
