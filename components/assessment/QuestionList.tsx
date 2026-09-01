"use client";

import { useState } from "react";
import { Question } from "@/lib/types";
import { MappedQuestion, UnmatchedAnswer } from "@/lib/mapping/types";
import { mockScores } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

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

interface StatusBadgeProps {
  status: "answered" | "unanswered" | "ambiguous";
  method?: string;
  confidence?: number;
}

function StatusBadge({ status, method, confidence }: StatusBadgeProps) {
  if (status === "answered") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Answered</span>
        {method === "semantic" && <span className="text-[9px] opacity-75">(Semantic)</span>}
      </span>
    );
  }

  if (status === "ambiguous") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>Multiple Attempts</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      <span>Unanswered</span>
    </span>
  );
}

interface DisplayQuestionItem {
  id: string;
  number: string;
  text: string;
  order: number;
  parentNumber?: string;
  partLabel?: string;
  maxMarks?: number;
  status: "answered" | "unanswered" | "ambiguous";
  mappedData?: MappedQuestion;
}

interface QuestionItemProps {
  question: DisplayQuestionItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function QuestionItem({ question, isSelected, onSelect }: QuestionItemProps) {
  const [expanded, setExpanded] = useState(isSelected);
  const { mappedData, status } = question;

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-150 overflow-hidden mb-2",
        isSelected
          ? "border-[#E85D27] shadow-sm bg-orange-50/20"
          : "border-gray-200 hover:border-gray-300 bg-white"
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
            "min-w-[28px] h-7 px-1.5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
            isSelected
              ? "bg-[#E85D27]"
              : status === "answered"
              ? "bg-gray-800"
              : status === "ambiguous"
              ? "bg-amber-600"
              : "bg-gray-400"
          )}
        >
          {question.number}
        </div>

        {/* Text */}
        <span className="flex-1 text-sm text-gray-800 leading-snug line-clamp-2">
          {question.text}
        </span>

        {/* Status + Chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge
            status={status}
            method={mappedData?.matchMethod}
            confidence={mappedData?.confidence}
          />
          <span className="text-gray-400">
            <ChevronDownIcon open={expanded && isSelected} />
          </span>
        </div>
      </button>

      {/* Expanded Transcribed Answer Preview */}
      {isSelected && expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50 text-xs">
          {mappedData && mappedData.answerText ? (
            <div>
              <div className="flex items-center justify-between font-semibold text-gray-700 mb-1">
                <span>Matched Student Answer:</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {mappedData.regions.length} region(s) on p.{mappedData.regions.map((r) => r.page).join(", ")}
                </span>
              </div>
              <p className="text-gray-700 bg-white p-2.5 rounded-md border border-gray-200 leading-relaxed font-sans whitespace-pre-wrap">
                {mappedData.answerText}
              </p>
              <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                <span>Method: <strong>{mappedData.matchMethod}</strong></span>
                <span>Confidence: <strong>{Math.round(mappedData.confidence * 100)}%</strong></span>
              </div>
            </div>
          ) : status === "unanswered" ? (
            <div className="text-gray-500 italic py-1">
              No matching student answer detected on the uploaded answer sheet.
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">AI Feedback</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {mockScores[question.id]?.feedback || "Answer mapped successfully."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface QuestionListProps {
  questions: Question[];
  mappedQuestions?: MappedQuestion[];
  unmatchedAnswers?: UnmatchedAnswer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectUnmatched?: (answerId: string) => void;
}

export default function QuestionList({
  questions,
  mappedQuestions,
  unmatchedAnswers = [],
  selectedId,
  onSelect,
  onSelectUnmatched,
}: QuestionListProps) {
  const displayedList: DisplayQuestionItem[] = mappedQuestions && mappedQuestions.length > 0
    ? mappedQuestions.map((mq) => ({
        id: mq.questionId,
        number: String(mq.questionNumber),
        text: mq.text,
        order: mq.order,
        parentNumber: mq.parentNumber ?? undefined,
        partLabel: mq.partLabel ?? undefined,
        maxMarks: mq.maxMarks ?? 2,
        status: mq.mappingStatus,
        mappedData: mq,
      }))
    : questions.map((q, idx) => ({
        id: q.id,
        number: String(q.number),
        text: q.text,
        order: q.order ?? (idx + 1),
        parentNumber: q.parentNumber ?? undefined,
        partLabel: q.partLabel ?? undefined,
        maxMarks: q.maxMarks ?? 2,
        status: (q.status as "answered" | "unanswered" | "ambiguous") || "answered",
        mappedData: undefined,
      }));

  const answeredCount = displayedList.filter((q) => q.status === "answered").length;
  const unansweredCount = displayedList.filter((q) => q.status === "unanswered").length;
  const ambiguousCount = displayedList.filter((q) => q.status === "ambiguous").length;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with summary chips */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900">
            Questions ({displayedList.length})
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-700 font-semibold">{answeredCount} Answered</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">{unansweredCount} Unanswered</span>
            {ambiguousCount > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-amber-700 font-semibold">{ambiguousCount} Ambiguous</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Questions list */}
      <div className="flex-1 overflow-y-auto p-3">
        {displayedList.map((q) => (
          <QuestionItem
            key={q.id}
            question={q}
            isSelected={selectedId === q.id}
            onSelect={onSelect}
          />
        ))}

        {/* Unmatched Answers Section */}
        {unmatchedAnswers && unmatchedAnswers.length > 0 && (
          <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                Unmatched Student Answers ({unmatchedAnswers.length})
              </h3>
              <span className="text-[10px] text-gray-500">Not found in question paper</span>
            </div>
            {unmatchedAnswers.map((u) => (
              <div
                key={u.answerId}
                onClick={() => onSelectUnmatched && onSelectUnmatched(u.answerId)}
                className="p-3 mb-2 rounded-xl bg-purple-50/60 border border-purple-200 cursor-pointer hover:border-purple-400 transition-colors text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-purple-950">
                    {u.detectedQuestionNumber ? `Student labeled "Q${u.detectedQuestionNumber}"` : "Unlabelled Answer"}
                  </span>
                  <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-mono">
                    p.{u.regions.map((r) => r.page).join(",")}
                  </span>
                </div>
                <p className="text-gray-700 line-clamp-2 italic mb-1">
                  &ldquo;{u.text}&rdquo;
                </p>
                <span className="text-[10px] text-purple-600">
                  {u.reason}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
