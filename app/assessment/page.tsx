"use client";

import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import QuestionList from "@/components/assessment/QuestionList";
import AnswerViewer from "@/components/answer-viewer/AnswerViewer";
import { mockQuestions, mockAnswers } from "@/lib/mock-data";
import { Question, Answer } from "@/lib/types";
import { useAssessment } from "@/lib/assessment-context";
import { MappedQuestion, UnmatchedAnswer } from "@/lib/mapping/types";

export default function AssessmentPage() {
  const {
    processingResult,
    extractedQuestions,
    extractedAnswers,
    mappingResult,
  } = useAssessment();

  // Fallback demo questions if no real extraction
  const fallbackQuestions: Question[] = useMemo(() => {
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

  const hasRealMapping = mappingResult && mappingResult.mappedQuestions && mappingResult.mappedQuestions.length > 0;

  // Selected item state (can be a question ID or an unmatched answer ID)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (hasRealMapping && mappingResult.mappedQuestions[0]) {
      return mappingResult.mappedQuestions[0].questionId;
    }
    return fallbackQuestions[0]?.id ?? "q1";
  });

  const [selectedUnmatchedId, setSelectedUnmatchedId] = useState<string | null>(null);

  const selectedMappedQuestion: MappedQuestion | null = useMemo(() => {
    if (!hasRealMapping) return null;
    return mappingResult.mappedQuestions.find((q) => q.questionId === selectedId) ?? mappingResult.mappedQuestions[0] ?? null;
  }, [hasRealMapping, mappingResult, selectedId]);

  const selectedUnmatchedAnswer: UnmatchedAnswer | null = useMemo(() => {
    if (!selectedUnmatchedId || !mappingResult?.unmatchedAnswers) return null;
    return mappingResult.unmatchedAnswers.find((u) => u.answerId === selectedUnmatchedId) ?? null;
  }, [selectedUnmatchedId, mappingResult]);

  const selectedFallbackQuestion = useMemo(() => {
    return fallbackQuestions.find((q) => q.id === selectedId) ?? fallbackQuestions[0] ?? null;
  }, [fallbackQuestions, selectedId]);

  const selectedFallbackAnswer: Answer | null = selectedFallbackQuestion
    ? (mockAnswers.find((a) => a.mappedQuestionId === selectedFallbackQuestion.id) ??
       mockAnswers.find((a) => a.detectedQuestionNumber === selectedFallbackQuestion.number) ??
       null)
    : null;

  const handleSelectQuestion = (id: string) => {
    setSelectedId(id);
    setSelectedUnmatchedId(null);
  };

  const handleSelectUnmatched = (answerId: string) => {
    setSelectedUnmatchedId(answerId);
    setSelectedId(null);
  };

  const pageCount = processingResult?.answerSheet.pageCount || 4;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage="Exams" />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar breadcrumb="Exams" backHref="/" />

        {/* Real metadata & AI mapping metrics banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 bg-gradient-to-r from-orange-50/90 via-white to-emerald-50/90 border-b border-gray-200 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {hasRealMapping ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shadow-sm">
                  <span>✦</span> Real AI Mapping: {mappingResult.answeredCount}/{mappingResult.totalQuestions} Answered
                </span>
                {mappingResult.unansweredCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium border border-gray-200">
                    {mappingResult.unansweredCount} Unanswered
                  </span>
                )}
                {mappingResult.ambiguousCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium border border-amber-200">
                    {mappingResult.ambiguousCount} Ambiguous
                  </span>
                )}
                {mappingResult.unmatchedAnswerCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium border border-purple-200">
                    {mappingResult.unmatchedAnswerCount} Unmatched Student Answers
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium border border-gray-200">
                Demo Assessment Data (Upload files to run Real Mapping)
              </span>
            )}

            {processingResult && (
              <span className="text-gray-500 hidden xl:inline font-mono text-[11px]">
                QP: <strong>{processingResult.questionPaper.originalFileName}</strong> ({processingResult.questionPaper.pageCount}p) | AS: <strong>{processingResult.answerSheet.originalFileName}</strong> ({processingResult.answerSheet.pageCount}p)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold">
              Phase 7: Exact Region Highlighting Active
            </span>
          </div>
        </div>

        {/* Split layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Question List */}
          <div className="w-[520px] min-w-[360px] max-w-[560px] flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col bg-white">
            <QuestionList
              questions={fallbackQuestions}
              mappedQuestions={mappingResult?.mappedQuestions}
              unmatchedAnswers={mappingResult?.unmatchedAnswers}
              selectedId={selectedId}
              onSelect={handleSelectQuestion}
              onSelectUnmatched={handleSelectUnmatched}
            />
          </div>

          {/* Right: Answer Sheet Viewer */}
          <div className="flex-1 overflow-hidden">
            {selectedUnmatchedAnswer ? (
              <AnswerViewer
                questionNumber={`Unmatched: ${selectedUnmatchedAnswer.detectedQuestionNumber || "?"}`}
                status="unmatched"
                matchedRegions={selectedUnmatchedAnswer.regions}
                realAnswers={extractedAnswers}
                pageCount={pageCount}
              />
            ) : selectedMappedQuestion ? (
              <AnswerViewer
                questionNumber={selectedMappedQuestion.questionNumber}
                status={selectedMappedQuestion.mappingStatus}
                matchedRegions={selectedMappedQuestion.regions}
                realAnswers={extractedAnswers}
                pageCount={pageCount}
              />
            ) : (
              <AnswerViewer
                answer={selectedFallbackAnswer}
                questionNumber={selectedFallbackQuestion?.number}
                realAnswers={extractedAnswers}
                pageCount={pageCount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
