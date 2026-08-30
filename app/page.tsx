"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import UploadCard from "@/components/upload/UploadCard";
import { UploadedFile } from "@/lib/types";

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Teacher illustration — circular avatar with orbiting dots (matches Figma)
function TeacherIllustration() {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center mb-6">
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-orange-100/60" />
      {/* Inner circle (avatar) */}
      <div className="relative w-24 h-24 rounded-full bg-white border-4 border-orange-200 overflow-hidden flex items-center justify-center shadow-md">
        {/* Simple teacher SVG illustration */}
        <svg viewBox="0 0 80 80" width="80" height="80" fill="none">
          {/* Body */}
          <rect x="20" y="42" width="40" height="32" rx="8" fill="#1a1a1a"/>
          {/* Face */}
          <circle cx="40" cy="32" r="16" fill="#FDBCAC"/>
          {/* Hair */}
          <ellipse cx="40" cy="20" rx="16" ry="10" fill="#3d2314"/>
          <ellipse cx="26" cy="32" rx="5" ry="12" fill="#3d2314"/>
          <ellipse cx="54" cy="32" rx="5" ry="12" fill="#3d2314"/>
          {/* Glasses */}
          <rect x="30" y="31" width="10" height="7" rx="3" stroke="#555" strokeWidth="1.5" fill="none"/>
          <rect x="42" y="31" width="10" height="7" rx="3" stroke="#555" strokeWidth="1.5" fill="none"/>
          <path d="M40 34.5h2" stroke="#555" strokeWidth="1.2"/>
          {/* Collar / shirt */}
          <path d="M30 52 L40 60 L50 52" fill="white"/>
        </svg>
      </div>
      {/* Orbiting orange dots */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x = 50 + 46 * Math.cos(rad);
        const y = 50 + 46 * Math.sin(rad);
        return (
          <div
            key={deg}
            className="absolute w-3 h-3 bg-orange-400 rounded-full border-2 border-white"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%,-50%)",
            }}
          />
        );
      })}
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const [questionPaper, setQuestionPaper] = useState<UploadedFile | null>(null);
  const [answerSheet, setAnswerSheet] = useState<UploadedFile | null>(null);

  const handleFileSelect = useCallback(
    (setter: React.Dispatch<React.SetStateAction<UploadedFile | null>>) =>
      (file: File) => {
        setter({
          file,
          name: file.name,
          size: file.size,
          pages: Math.floor(Math.random() * 6) + 1, // mock page count
        });
      },
    []
  );

  const bothSelected = questionPaper !== null && answerSheet !== null;

  const handleStartMapping = () => {
    if (!bothSelected) return;
    router.push("/processing");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar activePage="Exams" />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar breadcrumb="Exams" />

        {/* Main content */}
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Upload{" "}
                <span className="text-[#E85D27] underline decoration-2 underline-offset-4">
                  Question Paper &amp; Answer Sheets
                </span>
              </h1>
              <p className="text-gray-500 text-base">Upload both files to get started</p>
            </div>

            {/* Teacher illustration */}
            <div className="flex justify-center">
              <TeacherIllustration />
            </div>

            {/* Upload cards container */}
            <div className="bg-white/60 rounded-3xl p-6 border border-gray-200 shadow-sm mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UploadCard
                  label="Upload"
                  labelHighlight="Question Paper"
                  file={questionPaper}
                  onFileSelect={handleFileSelect(setQuestionPaper)}
                  onFileRemove={() => setQuestionPaper(null)}
                  className="min-h-[160px]"
                />
                <UploadCard
                  label="Upload"
                  labelHighlight="Answer Sheet"
                  file={answerSheet}
                  onFileSelect={handleFileSelect(setAnswerSheet)}
                  onFileRemove={() => setAnswerSheet(null)}
                  className="min-h-[160px]"
                />
              </div>
            </div>

            {/* Start Mapping button */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleStartMapping}
                disabled={!bothSelected}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-full font-semibold text-base transition-all duration-200 ${
                  bothSelected
                    ? "bg-gray-900 text-white hover:bg-gray-700 shadow-md cursor-pointer"
                    : "bg-gray-300 text-gray-400 cursor-not-allowed"
                }`}
              >
                Start Mapping
                <ArrowRightIcon />
              </button>
              {!bothSelected && (
                <p className="text-sm text-gray-400">
                  Once both files are uploaded, you&apos;ll able to map answers with questions
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
