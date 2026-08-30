"use client";

import { Question } from "@/lib/types";
import { mockScores } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useState } from "react";

const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
  >
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ExpandAllIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

interface ScoreBadgeProps {
  obtained: number;
  max: number;
}

function ScoreBadge({ obtained, max }: ScoreBadgeProps) {
  const isPerfect = obtained === max;
  const isZero = obtained === 0;
  return (
    <span
      className={cn(
        "text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap",
        isPerfect ? "bg-green-100 text-green-700" :
        isZero    ? "bg-red-100 text-red-600" :
                    "bg-orange-100 text-orange-600"
      )}
    >
      {obtained}/{max}
    </span>
  );
}

interface QuestionItemProps {
  question: Question;
  isSelected: boolean;
  onSelect: (id: string) => void;
  score?: { obtained: number; max: number; feedback?: string };
}

function QuestionItem({ question, isSelected, onSelect, score }: QuestionItemProps) {
  const [expanded, setExpanded] = useState(isSelected);

  const numberLabel = question.partLabel
    ? `${question.number}   ${question.partLabel}.`
    : `${question.number}`;

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-150 overflow-hidden mb-2",
        isSelected
          ? "border-[#E85D27] shadow-sm"
          : "border-gray-200 hover:border-gray-300"
      )}
    >
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => {
          onSelect(question.id);
          setExpanded(!expanded);
        }}
      >
        {/* Number badge */}
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
            isSelected ? "bg-[#E85D27]" : "bg-gray-800"
          )}
        >
          {question.number}
          {question.partLabel && (
            <span className="ml-0.5 text-[9px]">{question.partLabel}</span>
          )}
        </div>

        {/* Text */}
        <span className="flex-1 text-sm text-gray-700 leading-snug line-clamp-2">
          {question.text}
        </span>

        {/* Score + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {score && question.status !== "unanswered" && (
            <ScoreBadge obtained={score.obtained} max={score.max} />
          )}
          {question.status === "unanswered" && (
            <span className="text-xs text-gray-400">Unanswered</span>
          )}
          <span className="text-gray-400">
            <ChevronDownIcon open={expanded && isSelected} />
          </span>
        </div>
      </button>

      {/* Expanded AI feedback */}
      {isSelected && expanded && score?.feedback && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">AI Feedback</p>
            <p className="text-xs text-gray-600 leading-relaxed">{score.feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuestionListProps {
  questions: Question[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function QuestionList({ questions, selectedId, onSelect }: QuestionListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">
          Extracted Questions <span className="text-gray-400 font-normal">(from question paper)</span>
        </h2>
        <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-2 py-1">
          <ExpandAllIcon />
          Expand All
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3">
        {questions.map((q) => (
          <QuestionItem
            key={q.id}
            question={q}
            isSelected={selectedId === q.id}
            onSelect={onSelect}
            score={mockScores[q.id]}
          />
        ))}
      </div>
    </div>
  );
}
