"use client";

import { useState, useEffect, useCallback } from "react";
import { Answer } from "@/lib/types";
import { ExtractedAnswer, AnswerRegion } from "@/lib/ai/types";

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

const ResetZoomIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2h3M2 2v3M12 2h-3M12 2v3M2 12h3M2 12v-3M12 12h-3M12 12v-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/** Standard reference dimensions for normalization */
const ORIGINAL_PAGE_WIDTH = 1240;
const ORIGINAL_PAGE_HEIGHT = 1754;
const DISPLAYED_PAGE_WIDTH = 558;
const DISPLAYED_PAGE_HEIGHT = 789;

/** Base coordinate scaling ratio */
const BASE_SCALE = DISPLAYED_PAGE_WIDTH / ORIGINAL_PAGE_WIDTH; // 0.45

interface PageRegionOverlayProps {
  label: string;
  box: { x: number; y: number; width: number; height: number };
  color?: "green" | "orange" | "purple" | "blue";
  confidence?: number;
  isPrimary?: boolean;
}

function RegionBox({
  label,
  box,
  color = "green",
  confidence,
  isPrimary = false,
}: PageRegionOverlayProps) {
  // Compute display coordinates using proportional scaling
  const displayX = Math.max(0, box.x * BASE_SCALE);
  const displayY = Math.max(0, box.y * BASE_SCALE);
  const displayW = Math.max(40, Math.min(box.width * BASE_SCALE, DISPLAYED_PAGE_WIDTH - displayX));
  const displayH = Math.max(30, Math.min(box.height * BASE_SCALE, DISPLAYED_PAGE_HEIGHT - displayY));

  const colorStyles = {
    green: {
      border: "border-2 border-[#16a34a]",
      bg: "bg-[#22c55e]/15",
      badge: "bg-[#16a34a]",
      ring: isPrimary ? "ring-4 ring-[#22c55e]/30" : "",
    },
    orange: {
      border: "border-2 border-[#ea580c]",
      bg: "bg-[#ea580c]/15",
      badge: "bg-[#ea580c]",
      ring: isPrimary ? "ring-4 ring-[#ea580c]/30" : "",
    },
    purple: {
      border: "border-2 border-[#9333ea]",
      bg: "bg-[#9333ea]/15",
      badge: "bg-[#9333ea]",
      ring: isPrimary ? "ring-4 ring-[#9333ea]/30" : "",
    },
    blue: {
      border: "border-2 border-[#2563eb]",
      bg: "bg-[#2563eb]/15",
      badge: "bg-[#2563eb]",
      ring: isPrimary ? "ring-4 ring-[#2563eb]/30" : "",
    },
  };

  const style = colorStyles[color] || colorStyles.green;

  return (
    <div
      className={`absolute ${style.border} ${style.bg} ${style.ring} rounded-md transition-all duration-300 pointer-events-auto shadow-md`}
      style={{
        left: `${displayX}px`,
        top: `${displayY}px`,
        width: `${displayW}px`,
        height: `${displayH}px`,
      }}
    >
      {/* Floating Pill Badge */}
      <div
        className={`absolute -top-3.5 -left-2.5 px-2 py-0.5 ${style.badge} rounded-full text-white text-[11px] font-bold flex items-center gap-1 shadow-lg select-none`}
      >
        <span>{label}</span>
        {confidence !== undefined && (
          <span className="opacity-80 text-[9px] font-mono">({Math.round(confidence * 100)}%)</span>
        )}
      </div>
    </div>
  );
}

// Answer Sheet Canvas with ruled notebook lines and rendered overlays
function AnswerSheetCanvasPage({
  page,
  regions = [],
}: {
  page: number;
  regions?: {
    label: string;
    box: { x: number; y: number; width: number; height: number };
    confidence?: number;
    color?: "green" | "orange" | "purple" | "blue";
    isPrimary?: boolean;
  }[];
}) {
  const sampleLines = [
    { y: 80, label: "Q1.", content: "The artery carries oxygenated blood away from the heart to all body tissues." },
    { y: 240, label: "", content: "6CO₂ + 6H₂O  ──Light/Chlorophyll──>  C₆H₁₂O₆ + 6O₂" },
    { y: 400, label: "Q2.", content: "Photosynthesis occurs mainly in chloroplasts.\n1. Light reactions capture photon energy.\n2. Dark reactions fix carbon into glucose." },
    { y: 640, label: "Q11(a)", content: "Plant A shows broad dark-green leaves indicating healthy chlorophyll synthesis under bright light." },
  ];

  return (
    <div
      className="relative bg-[#f8f6ef] rounded border border-gray-300 shadow-2xl overflow-hidden font-mono mx-auto select-none"
      style={{
        width: `${DISPLAYED_PAGE_WIDTH}px`,
        height: `${DISPLAYED_PAGE_HEIGHT}px`,
      }}
    >
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

      {/* Page number watermark */}
      <div className="absolute top-2 right-4 text-[11px] text-gray-400 font-sans font-semibold">
        Page {page}
      </div>

      {/* Handwritten text lines */}
      {sampleLines.map((line, i) => (
        <div key={i}>
          {line.label && (
            <span
              className="absolute text-[11px] font-bold text-blue-700 font-sans"
              style={{ top: `${line.y * BASE_SCALE}px`, left: "8px" }}
            >
              {line.label}
            </span>
          )}
          <div
            className="absolute text-[11px] text-blue-800 leading-[26px] font-sans"
            style={{
              top: `${line.y * BASE_SCALE}px`,
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
          isPrimary={r.isPrimary}
        />
      ))}
    </div>
  );
}

interface AnswerViewerProps {
  answer?: Answer | null;
  questionNumber?: string | number;
  status?: "answered" | "unanswered" | "ambiguous" | "unmatched";
  matchedRegions?: AnswerRegion[];
  realAnswers?: ExtractedAnswer[];
  pageCount?: number;
}

export default function AnswerViewer({
  answer,
  questionNumber,
  status = "answered",
  matchedRegions = [],
  realAnswers = [],
  pageCount = 4,
}: AnswerViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDebugCandidates, setShowDebugCandidates] = useState(false);
  const [showCoordinateDetails, setShowCoordinateDetails] = useState(false);

  const totalPages = Math.max(1, pageCount);

  // Automatically sync current page when selected question has regions on another page
  useEffect(() => {
    if (matchedRegions.length > 0) {
      setCurrentPage(matchedRegions[0].page);
    } else if (answer?.regions?.[0]) {
      setCurrentPage(answer.regions[0].page);
    }
  }, [matchedRegions, answer]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 25, 200)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 25, 50)), []);
  const handleResetZoom = useCallback(() => setZoom(100), []);
  const handlePrevPage = useCallback(() => setCurrentPage((p) => Math.max(p - 1, 1)), []);
  const handleNextPage = useCallback(() => setCurrentPage((p) => Math.min(p + 1, totalPages)), [totalPages]);

  // Keyboard navigation support (Arrow keys for pages, +/- for zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft") {
        handlePrevPage();
      } else if (e.key === "ArrowRight") {
        handleNextPage();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevPage, handleNextPage, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Compute regions to render on current page
  const pageRegions: {
    label: string;
    box: { x: number; y: number; width: number; height: number };
    confidence?: number;
    color?: "green" | "orange" | "purple" | "blue";
    isPrimary?: boolean;
  }[] = [];

  // Real matched regions from Phase 6 mapping
  if (matchedRegions.length > 0) {
    matchedRegions.forEach((r, idx) => {
      if (r.page === currentPage) {
        pageRegions.push({
          label:
            status === "unmatched"
              ? `Unmatched`
              : status === "ambiguous"
              ? `Q${questionNumber ?? ""} (Attempt ${idx + 1})`
              : `Q${questionNumber ?? ""}`,
          box: r.boundingBox,
          color: status === "unmatched" ? "purple" : status === "ambiguous" ? "orange" : "green",
          isPrimary: true,
        });
      }
    });
  } else if (answer?.regions) {
    // Fallback to demo regions
    const activeRegion = answer.regions.find((r) => r.page === currentPage);
    if (activeRegion) {
      pageRegions.push({
        label: `Q${questionNumber ?? ""}`,
        box: activeRegion.boundingBox,
        color: "green",
        isPrimary: true,
      });
    }
  }

  // Debug inspection overlay (shows all candidate answer regions)
  if (showDebugCandidates && realAnswers.length > 0) {
    realAnswers.forEach((ans) => {
      ans.regions.forEach((r) => {
        if (r.page === currentPage) {
          pageRegions.push({
            label: ans.detectedQuestionNumber ? `Ans ${ans.detectedQuestionNumber}` : "Unlabeled",
            box: r.boundingBox,
            confidence: ans.confidence,
            color: "orange",
            isPrimary: false,
          });
        }
      });
    });
  }

  const isUnanswered = status === "unanswered";
  const primaryRegion = matchedRegions.find((r) => r.page === currentPage);

  return (
    <div className="flex flex-col h-full bg-[#242424] overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1b1b1b] flex-shrink-0 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-200">Answer Sheet Viewer</span>
          {realAnswers.length > 0 && (
            <button
              onClick={() => setShowDebugCandidates(!showDebugCandidates)}
              className={`text-xs px-2 py-0.5 rounded-md transition-colors border ${
                showDebugCandidates
                  ? "bg-orange-600 text-white border-orange-500"
                  : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
              }`}
            >
              🔍 Candidates ({realAnswers.length})
            </button>
          )}
          <button
            onClick={() => setShowCoordinateDetails(!showCoordinateDetails)}
            className={`text-xs px-2 py-0.5 rounded-md transition-colors border ${
              showCoordinateDetails
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
            }`}
          >
            📐 Coordinates
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#2b2b2b] rounded-lg px-1.5 py-0.5 border border-gray-700">
            <button
              onClick={handleZoomOut}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              title="Zoom Out (-)"
              aria-label="Zoom out"
            >
              <MinusIcon />
            </button>
            <span className="text-xs text-gray-200 px-2 min-w-[3rem] text-center font-mono">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              title="Zoom In (+)"
              aria-label="Zoom in"
            >
              <PlusIcon />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded border-l border-gray-700 ml-0.5 pl-1.5"
              title="Reset Zoom (Ctrl+0)"
              aria-label="Reset zoom"
            >
              <ResetZoomIcon />
            </button>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1 bg-[#2b2b2b] rounded-lg px-1.5 py-0.5 border border-gray-700">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded"
              title="Previous Page (←)"
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-xs text-gray-200 px-2 whitespace-nowrap font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded"
              title="Next Page (→)"
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Coordinate Debug Drawer */}
      {showCoordinateDetails && (
        <div className="bg-[#1f1f1f] px-4 py-2 border-b border-gray-800 text-[11px] font-mono text-gray-300 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-blue-400 font-bold">Selected:</span> Q{questionNumber || "?"} |{" "}
            <span className="text-blue-400 font-bold">Status:</span> {status} |{" "}
            <span className="text-blue-400 font-bold">Page:</span> {currentPage}/{totalPages} |{" "}
            <span className="text-blue-400 font-bold">Scale Factor:</span> {BASE_SCALE.toFixed(3)} (558/1240)
          </div>
          {primaryRegion ? (
            <div>
              <span className="text-green-400 font-bold">Raw Box:</span> [{primaryRegion.boundingBox.x}, {primaryRegion.boundingBox.y}, {primaryRegion.boundingBox.width}, {primaryRegion.boundingBox.height}] →{" "}
              <span className="text-green-400 font-bold">Display Box:</span> [{Math.round(primaryRegion.boundingBox.x * BASE_SCALE)}, {Math.round(primaryRegion.boundingBox.y * BASE_SCALE)}, {Math.round(primaryRegion.boundingBox.width * BASE_SCALE)}, {Math.round(primaryRegion.boundingBox.height * BASE_SCALE)}]
            </div>
          ) : (
            <div className="text-gray-500">No active region on Page {currentPage}</div>
          )}
        </div>
      )}

      {/* Unanswered or Multi-page notice banner */}
      {isUnanswered ? (
        <div className="bg-gray-900/90 text-gray-300 px-4 py-2.5 text-xs flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span>
              Question <strong>{questionNumber}</strong> is <strong>Unanswered</strong> — no student answer was mapped to this question.
            </span>
          </div>
          <span className="text-gray-500 text-[11px]">No bounding box rendered</span>
        </div>
      ) : matchedRegions.length > 1 ? (
        <div className="bg-emerald-950/80 text-emerald-300 px-4 py-2 text-xs flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Multi-page answer spanning <strong>{matchedRegions.length} pages</strong> ({matchedRegions.map((r) => `p.${r.page}`).join(", ")}).
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-emerald-400 mr-1">Switch to:</span>
            {matchedRegions.map((r, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(r.page)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                  currentPage === r.page
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-emerald-900/80 text-emerald-200 hover:bg-emerald-800"
                }`}
              >
                Page {r.page}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Debug candidate inspection drawer (when toggled) */}
      {showDebugCandidates && realAnswers.length > 0 && (
        <div className="bg-[#1f1f1f] px-4 py-2 border-b border-gray-800 flex items-center gap-3 overflow-x-auto text-xs text-gray-300">
          <span className="font-semibold text-orange-400 flex-shrink-0">
            Detected Answers:
          </span>
          {realAnswers.map((ans, idx) => (
            <div
              key={ans.id || idx}
              className="flex items-center gap-1.5 bg-[#2a2a2a] px-2.5 py-1 rounded-md border border-gray-700 flex-shrink-0"
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

      {/* Main Page Canvas Viewer */}
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
