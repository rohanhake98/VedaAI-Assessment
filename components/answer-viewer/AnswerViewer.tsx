"use client";

import { useState } from "react";
import { Answer } from "@/lib/types";

const MinusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TOTAL_PAGES = 4;

// Mock "handwritten" answer sheet content for each page
function MockAnswerSheetPage({ page, highlightRegion }: {
  page: number;
  highlightRegion?: { x: number; y: number; width: number; height: number } | null;
}) {
  // Mock handwriting-style content areas
  const mockLines = [
    { y: 80, label: "Q1.", content: "Photosynthesis is the process used by green plants and some other organisms to convert light energy into chemical energy." },
    { y: 260, label: "", content: "6CO₂ + 6H₂O  →Light/Chlorophyll→  C₆H₁₂O₆ + 6O₂" },
    { y: 420, label: "Q2.", content: "The process mainly occurs in the chloroplast of the plant cell. It has two main stages:\n1. Light reaction — Captures light energy.\n2. Dark reaction — Uses energy to make glucose." },
  ];

  return (
    <div className="relative w-full h-full bg-[#f8f6ef] rounded border border-gray-200 overflow-hidden font-mono">
      {/* Ruled lines */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-full border-b border-[#d4c9b0]"
          style={{ top: `${40 + i * 28}px` }}
        />
      ))}
      {/* Red margin line */}
      <div className="absolute top-0 bottom-0 left-16 border-l-2 border-red-300" />

      {/* Question labels and content */}
      {mockLines.map((line, i) => (
        <div key={i}>
          {line.label && (
            <span
              className="absolute text-[11px] font-bold text-blue-700"
              style={{ top: `${line.y}px`, left: "8px" }}
            >
              {line.label}
            </span>
          )}
          <div
            className="absolute text-[11px] text-blue-800 leading-[28px]"
            style={{ top: `${line.y}px`, left: "72px", right: "16px", whiteSpace: "pre-wrap" }}
          >
            {line.content}
          </div>
        </div>
      ))}

      {/* Highlight overlay */}
      {highlightRegion && (
        <div
          className="absolute border-2 border-[#22c55e] bg-[#22c55e]/10 rounded transition-all duration-300"
          style={{
            left: `${highlightRegion.x * 0.45}px`,
            top: `${highlightRegion.y * 0.45}px`,
            width: `${highlightRegion.width * 0.45}px`,
            height: `${highlightRegion.height * 0.45}px`,
          }}
        >
          {/* Q badge */}
          <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#22c55e] rounded text-white text-[9px] font-bold flex items-center justify-center">
            Q2
          </div>
        </div>
      )}
    </div>
  );
}

interface AnswerViewerProps {
  answer: Answer | null;
  questionNumber?: string | number;
}

export default function AnswerViewer({ answer, questionNumber }: AnswerViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(
    answer?.regions?.[0]?.page ?? 1
  );

  const activeRegion = answer?.regions?.find((r) => r.page === currentPage);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, TOTAL_PAGES));

  return (
    <div className="flex flex-col h-full bg-[#2a2a2a] rounded-none">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e1e1e] flex-shrink-0">
        <span className="text-sm font-medium text-gray-200">Answer Sheet</span>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#2e2e2e] rounded-lg px-1 py-1">
            <button
              onClick={handleZoomOut}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              aria-label="Zoom out"
            >
              <MinusIcon />
            </button>
            <span className="text-xs text-gray-300 px-2 min-w-[3rem] text-center">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              aria-label="Zoom in"
            >
              <PlusIcon />
            </button>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1 bg-[#2e2e2e] rounded-lg px-1 py-1">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded"
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-xs text-gray-300 px-2 whitespace-nowrap">
              Page {currentPage} of {TOTAL_PAGES}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= TOTAL_PAGES}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded"
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Page viewer */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div
          className="origin-top transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100})`, width: "100%" }}
        >
          {/* Repeat the page twice to simulate scrollable multi-page answer sheet */}
          {[1, 2].map((_, idx) => (
            <div
              key={idx}
              className="mb-4"
              style={{ minHeight: "500px" }}
            >
              <MockAnswerSheetPage
                page={currentPage + idx}
                highlightRegion={
                  activeRegion && idx === 0 ? activeRegion.boundingBox : null
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
