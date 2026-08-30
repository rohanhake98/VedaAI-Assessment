"use client";

import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import QuestionList from "@/components/assessment/QuestionList";
import AnswerViewer from "@/components/answer-viewer/AnswerViewer";
import { mockQuestions, mockAnswers } from "@/lib/mock-data";
import { Question, Answer } from "@/lib/types";
import { useAssessment } from "@/lib/assessment-context";

export default function AssessmentPage() {
  const { processingResult, extractedQuestions, extractionResult } = useAssessment();

  // Convert real extracted questions into UI Question format, or fallback to mock data
  const displayedQuestions: Question[] = useMemo(() => {
    if (extractedQuestions && extractedQuestions.length > 0) {
      return extractedQuestions.map((eq) => ({
        id: eq.id,
        number: eq.number,
        text: eq.text,
        order: eq.order,
        parentNumber: eq.parentNumber ?? undefined,
        partLabel: eq.partLabel ?? undefined,
        maxMarks: eq.maxMarks ?? 2,
        status: "answered",
      }));
    }
    return mockQuestions;
  }, [extractedQuestions]);

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    return displayedQuestions[0]?.id ?? "q1";
  });

  const isRealExtraction = extractedQuestions && extractedQuestions.length > 0;
  const selectedQuestion =
    displayedQuestions.find((q) => q.id === selectedId) ?? displayedQuestions[0] ?? null;

  const selectedAnswer: Answer | null = selectedQuestion
    ? (mockAnswers.find((a) => a.mappedQuestionId === selectedQuestion.id) ??
       mockAnswers.find((a) => a.detectedQuestionNumber === selectedQuestion.number) ??
       null)
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage="Exams" />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar breadcrumb="Exams" backHref="/" />

        {/* Real metadata & AI extraction banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 bg-gradient-to-r from-orange-50/80 via-white to-green-50/80 border-b border-gray-200 text-xs">
          <div className="flex items-center gap-3">
            {isRealExtraction ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-semibold border border-orange-200">
                <span>✦</span> Real AI Questions Extracted ({displayedQuestions.length})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium border border-gray-200">
                Demo Questions (14)
              </span>
            )}

            {processingResult && (
              <span className="text-gray-600 hidden md:inline">
                QP: <strong>{processingResult.questionPaper.originalFileName}</strong> ({processingResult.questionPaper.pageCount}p) | AS: <strong>{processingResult.answerSheet.originalFileName}</strong> ({processingResult.answerSheet.pageCount}p)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded text-[11px]">
              Note: Answer mapping &amp; highlights are mock (Phase 5 &amp; 6)
            </span>
          </div>
        </div>

        {/* Split layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Question List */}
          <div className="w-[520px] min-w-[360px] max-w-[560px] flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col bg-white">
            <QuestionList
              questions={displayedQuestions}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          {/* Right: Answer Sheet Viewer */}
          <div className="flex-1 overflow-hidden">
            <AnswerViewer
              answer={selectedAnswer}
              questionNumber={selectedQuestion?.number}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
