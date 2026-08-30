"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import QuestionList from "@/components/assessment/QuestionList";
import AnswerViewer from "@/components/answer-viewer/AnswerViewer";
import { mockQuestions, mockAnswers } from "@/lib/mock-data";
import { Answer } from "@/lib/types";

export default function AssessmentPage() {
  const [selectedId, setSelectedId] = useState<string | null>("q2");

  const selectedQuestion = mockQuestions.find((q) => q.id === selectedId) ?? null;
  const selectedAnswer: Answer | null = selectedQuestion
    ? (mockAnswers.find((a) => a.mappedQuestionId === selectedId) ?? null)
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage="Exams" />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar breadcrumb="Exams" backHref="/processing" />

        {/* Split layout: question list | answer viewer */}
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
