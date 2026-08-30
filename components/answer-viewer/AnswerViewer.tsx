"use client";

import { useState } from "react";
import { Answer } from "@/lib/types";
import { ExtractedAnswer } from "@/lib/ai/types";

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

interface PageRegionOverlayProps {
  label: string;
  box: { x: number; y: number; width: number; height: number };
  color?: "green" | "orange" | "blue";
  confidence?: number;
}

function RegionBox({ label, box, color = "green", confidence }: PageRegionOverlayProps) {
  // Scale from base 1240x1754 page coordinates to rendered ~558x789 container
  const scale = 0.45;

  const colorStyles = {
    green: {
      border: "border-[#22c55e]",
      bg: "bg-[#22c55e]/10",
      badge: "bg-[#22c55e]",
    },
    orange: {
      border: "border-[#E85D27]",
      bg: "bg-[#E85D27]/10",
      badge: "bg-[#E85D27]",
    },
    blue: {
      border: "border-blue-500",
      bg: "bg-blue-500/10",
      badge: "bg-blue-500",
    },
  };

  const style = colorStyles[color];

  return (
    <div
      className={`absolute border-2 ${style.border} ${style.bg} rounded transition-all duration-300 pointer-events-auto`}
      style={{
        left: `${Math.max(0, box.x * scale)}px`,
        top: `${Math.max(0, box.y * scale)}px`,
        width: `${Math.max(40, box.width * scale)}px`,
        height: `${Math.max(30, box.height * scale)}px`,
      }}
    >
      <div className={`absolute -top-3 -left-3 px-1.5 py-0.5 ${style.badge} rounded text-white text-[10px] font-bold flex items-center gap-1 shadow-sm`}>
        <span>{label}</span>
        {confidence !== undefined && (
          <span className="opacity-80 text-[8px]">({Math.round(confidence * 100)}%)</span>
        )}
      </div>
    </div>
  );
}

// Answer Sheet Page with ruled lines and region boxes
function AnswerSheetCanvasPage({
  page,
  regions = [],
}: {
  page: number;
  regions?: {
    label: string;
    box: { x: number; y: number; width: number; height: number };
    confidence?: number;
    color?: "green" | "orange" | "blue";
  }[];
}) {
  const sampleLines = [
    { y: 80, label: "Q1.", content: "The artery carries oxygenated blood away from the heart to all body tissues." },
    { y: 240, label: "", content: "6CO₂ + 6H₂O  ──Light/Chlorophyll──>  C₆H₁₂O₆ + 6O₂" },
    { y: 400, label: "Q2.", content: "Photosynthesis occurs mainly in chloroplasts.\n1. Light reactions capture photon energy.\n2. Dark reactions fix carbon into glucose." },
    { y: 640, label: "Q11(a)", content: "Plant A shows broad dark-green leaves indicating healthy chlorophyll synthesis under bright light." },
  ];

  return (
    <div className="relative w-[558px] h-[789px] bg-[#f8f6ef] rounded border border-gray-300 shadow-md overflow-hidden font-mono mx-auto select-none">
      {/* Ruled notebook lines */}
      {Array.from({ length: 28 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-full border-b border-[#d4c9b0]"
          style={{ top: `${45 + i * 26}px` }}
        />
      ))}
      {/* Red vertical margin line */}
      <div className="absolute top-0 bottom-0 left-16 border-l-2 border-red-300" />

      {/* Page number watermark top right */}
      <div className="absolute top-2 right-4 text-[10px] text-gray-400 font-sans">
        Page {page}
      </div>

      {/* Handwritten text lines */}
      {sampleLines.map((line, i) => (
        <div key={i}>
          {line.label && (
            <span
              className="absolute text-[11px] font-bold text-blue-700 font-sans"
              style={{ top: `${line.y * 0.45}px`, left: "8px" }}
            >
              {line.label}
            </span>
          )}
          <div
            className="absolute text-[11px] text-blue-800 leading-[26px] font-sans"
            style={{
              top: `${line.y * 0.45}px`,
              left: "72px",
              right: "16px",
              whiteSpace: "pre-wrap",
            }}
          >
            {line.content}
          </div>
        </div>
      ))}

      {/* Bounding box regions */}
      {regions.map((r, i) => (
        <RegionBox
          key={i}
          label={r.label}
          box={r.box}
          color={r.color}
          confidence={r.confidence}
        />
      ))}
    </div>
  );
}

interface AnswerViewerProps {
  answer: Answer | null;
  questionNumber?: string | number;
  realAnswers?: ExtractedAnswer[];
}

export default function AnswerViewer({
  answer,
  questionNumber,
  realAnswers = [],
}: AnswerViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(
    answer?.regions?.[0]?.page ?? 1
  );
  const [showDebugCandidates, setShowDebugCandidates] = useState(false);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, TOTAL_PAGES));

  // Determine active region from selected answer
  const activeRegion = answer?.regions?.find((r) => r.page === currentPage);

  // Compute regions to render on the canvas for current page
  const pageRegions: {
    label: string;
    box: { x: number; y: number; width: number; height: number };
    confidence?: number;
    color?: "green" | "orange" | "blue";
  }[] = [];

  if (activeRegion) {
    pageRegions.push({
      label: `Q${questionNumber ?? ""}`,
      box: activeRegion.boundingBox,
      color: "green",
    });
  }

  // If debug inspection is toggled on, show all detected real answers on this page
  if (showDebugCandidates && realAnswers.length > 0) {
    realAnswers.forEach((ans) => {
      ans.regions.forEach((r) => {
        if (r.page === currentPage) {
          pageRegions.push({
            label: ans.detectedQuestionNumber ? `Ans ${ans.detectedQuestionNumber}` : "Unlabeled",
            box: r.boundingBox,
            confidence: ans.confidence,
            color: "orange",
          });
        }
      });
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#2a2a2a] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e1e1e] flex-shrink-0 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-200">Answer Sheet</span>
          {realAnswers.length > 0 && (
            <button
              onClick={() => setShowDebugCandidates(!showDebugCandidates)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors border ${
                showDebugCandidates
                  ? "bg-orange-600 text-white border-orange-500"
                  : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
              }`}
            >
              🔍 Candidate Regions ({realAnswers.length})
            </button>
          )}
        </div>

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

      {/* Debug candidate inspection drawer (when toggled) */}
      {showDebugCandidates && realAnswers.length > 0 && (
        <div className="bg-[#242424] px-4 py-2 border-b border-gray-800 flex items-center gap-3 overflow-x-auto text-xs text-gray-300">
          <span className="font-semibold text-orange-400 flex-shrink-0">
            Detected Answers:
          </span>
          {realAnswers.map((ans, idx) => (
            <div
              key={ans.id || idx}
              className="flex items-center gap-1.5 bg-[#333] px-2.5 py-1 rounded-md border border-gray-700 flex-shrink-0"
            >
              <span className="font-bold text-white">
                {ans.detectedQuestionNumber ? `Q${ans.detectedQuestionNumber}` : "Unlabeled"}
              </span>
              <span className="text-gray-400 text-[11px] truncate max-w-[120px]">
                {ans.text}
              </span>
              <span className="text-[10px] text-green-400 font-mono">
                {Math.round(ans.confidence * 100)}%
              </span>
              <span className="text-[10px] text-gray-500">
                (p.{ans.regions.map((r) => r.page).join(",")})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Page canvas viewer */}
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
        <div
          className="origin-top transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          <div className="mb-6">
            <AnswerSheetCanvasPage
              page={currentPage}
              regions={pageRegions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
