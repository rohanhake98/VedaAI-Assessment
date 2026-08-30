"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import QuestionList from "@/components/assessment/QuestionList";
import AnswerViewer from "@/components/answer-viewer/AnswerViewer";
import { mockQuestions, mockAnswers } from "@/lib/mock-data";
import { Answer } from "@/lib/types";
import { useAssessment } from "@/lib/assessment-context";

export default function AssessmentPage() {
  const [selectedId, setSelectedId] = useState<string | null>("q2");
  const { processingResult } = useAssessment();

  const selectedQuestion = mockQuestions.find((q) => q.id === selectedId) ?? null;
  const selectedAnswer: Answer | null = selectedQuestion
    ? (mockAnswers.find((a) => a.mappedQuestionId === selectedId) ?? null)
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage="Exams" />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar breadcrumb="Exams" backHref="/" />

        {/* Real document info banner (when processing result is available) */}
        {processingResult && (
          <div className="flex items-center gap-6 px-5 py-2 bg-green-50 border-b border-green-100 text-xs text-green-700">
            <span className="font-semibold">✓ Documents processed</span>
            <span>
              Question paper: <strong>{processingResult.questionPaper.originalFileName}</strong>{" "}
              ({processingResult.questionPaper.pageCount} page{processingResult.questionPaper.pageCount !== 1 ? "s" : ""})
            </span>
            <span>
              Answer sheet: <strong>{processingResult.answerSheet.originalFileName}</strong>{" "}
              ({processingResult.answerSheet.pageCount} page{processingResult.answerSheet.pageCount !== 1 ? "s" : ""})
            </span>
            <span className="ml-auto text-green-500">
              Processed in {processingResult.processingTimeMs}ms
            </span>
          </div>
        )}

        {/* Note: questions/answers below are still MOCK — AI extraction is Phase 4 */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Question List */}
          <div className="w-[520px] min-w-[360px] max-w-[560px] flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col bg-white">
            <QuestionList
              questions={mockQuestions}
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
