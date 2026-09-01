"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useAssessment } from "@/lib/assessment-context";

// ── Stage definitions ────────────────────────────────────────────────────────
type StageStatus = "pending" | "active" | "done" | "error";

interface Stage {
  id: string;
  label: string;
  status: StageStatus;
}

const INITIAL_STAGES: Stage[] = [
  { id: "upload",    label: "Uploading files",                     status: "pending" },
  { id: "prepare",   label: "Preparing documents",                  status: "pending" },
  { id: "pages",     label: "Normalising pages",                    status: "pending" },
  { id: "q_extract", label: "Extracting questions (AI Vision)",     status: "pending" },
  { id: "a_extract", label: "Extracting handwritten answers (AI)",  status: "pending" },
  { id: "mapping",   label: "Mapping answers to questions",         status: "pending" },
];

// ── Icons ────────────────────────────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <path
      d="M60 20 L65 55 L100 60 L65 65 L60 100 L55 65 L20 60 L55 55 Z"
      fill="#E85D27"
    />
    <path d="M88 18 L90 28 L100 30 L90 32 L88 42 L86 32 L76 30 L86 28 Z" fill="#E85D27" opacity="0.8"/>
    <path d="M32 75 L34 83 L42 85 L34 87 L32 95 L30 87 L22 85 L30 83 Z" fill="#E85D27" opacity="0.6"/>
    <circle cx="95" cy="58" r="3" fill="#E85D27" opacity="0.5"/>
    <circle cx="25" cy="60" r="2.5" fill="#E85D27" opacity="0.4"/>
    <circle cx="62" cy="15" r="2" fill="#E85D27" opacity="0.5"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1.5 5l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Stage indicator ──────────────────────────────────────────────────────────
function StageRow({ stage }: { stage: Stage }) {
  const { status, label } = stage;

  const dot = (
    <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
      status === "done"   ? "bg-orange-500" :
      status === "active" ? "bg-orange-300 animate-pulse" :
      status === "error"  ? "bg-red-500" :
                            "bg-gray-200"
    }`}>
      {status === "done" && <CheckIcon />}
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      {dot}
      <span className={`text-sm transition-colors ${
        status === "done"   ? "text-gray-400 line-through" :
        status === "active" ? "text-gray-900 font-medium" :
        status === "error"  ? "text-red-600 font-medium" :
                              "text-gray-300"
      }`}>
        {label}
        {status === "active" && "…"}
      </span>
    </div>
  );
}

export default function ProcessingPage() {
  const router = useRouter();
  const {
    questionPaper,
    answerSheet,
    setProcessingResult,
    setExtractedQuestions,
    setExtractionResult,
    setExtractedAnswers,
    setAnswerExtractionResult,
    setMappingResult,
    setUploadError,
  } = useAssessment();

  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const setStageStatus = (id: string, status: StageStatus) =>
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (!questionPaper?.file || !answerSheet?.file) {
      setErrorMessage("No files found. Please go back and select both files.");
      return;
    }

    async function executeProcessingPipeline() {
      try {
        // ── Stage 1: Upload ──────────────────────────────────────────────────
        setStageStatus("upload", "active");

        const formData = new FormData();
        formData.append("questionPaper", questionPaper!.file, questionPaper!.name);
        formData.append("answerSheet", answerSheet!.file, answerSheet!.name);

        const uploadRes = await fetch("/api/assessment/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => ({}));
          throw new Error(data?.error ?? `Upload failed (${uploadRes.status}).`);
        }

        const uploadData = await uploadRes.json();
        setStageStatus("upload", "done");

        // ── Stage 2: Prepare Documents & Normalize Pages ─────────────────────
        setStageStatus("prepare", "active");
        setStageStatus("prepare", "done");
        setStageStatus("pages", "active");
        setStageStatus("pages", "done");

        setProcessingResult(uploadData);

        // ── Stage 3: Real AI Question Extraction (Phase 4) ────────────────────
        setStageStatus("q_extract", "active");

        const qExtractRes = await fetch("/api/assessment/extract-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId: uploadData.assessmentId }),
        });

        const qExtractData = await qExtractRes.json().catch(() => ({}));

        if (!qExtractRes.ok && qExtractData.status === "error") {
          throw new Error(qExtractData?.error ?? "Question extraction encountered an error.");
        }

        setStageStatus("q_extract", "done");

        if (qExtractData.questions && qExtractData.questions.length > 0) {
          setExtractedQuestions(qExtractData.questions);
          setExtractionResult(qExtractData);
        } else if (qExtractData.status === "needs_review") {
          setExtractionResult(qExtractData);
        }

        // ── Stage 4: Real AI Handwritten Answer Extraction (Phase 5) ─────────
        setStageStatus("a_extract", "active");

        const aExtractRes = await fetch("/api/assessment/extract-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId: uploadData.assessmentId }),
        });

        const aExtractData = await aExtractRes.json().catch(() => ({}));

        if (!aExtractRes.ok && aExtractData.status === "error") {
          throw new Error(aExtractData?.error ?? "Answer extraction encountered an error.");
        }

        setStageStatus("a_extract", "done");

        if (aExtractData.answers && aExtractData.answers.length > 0) {
          setExtractedAnswers(aExtractData.answers);
          setAnswerExtractionResult(aExtractData);
        } else if (aExtractData.status === "needs_review") {
          setAnswerExtractionResult(aExtractData);
        }

        // ── Stage 5: Real Answer Mapping Engine (Phase 6) ─────────────────────
        setStageStatus("mapping", "active");

        const mapRes = await fetch("/api/assessment/map-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId: uploadData.assessmentId }),
        });

        const mapData = await mapRes.json().catch(() => ({}));

        if (!mapRes.ok && mapData.status === "error") {
          throw new Error(mapData?.error ?? "Answer mapping encountered an error.");
        }

        setStageStatus("mapping", "done");

        if (mapData.mappedQuestions) {
          setMappingResult(mapData);
        }

        // Brief beat before navigating to review screen
        await new Promise((r) => setTimeout(r, 600));
        router.push("/assessment");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setStages((prev) =>
          prev.map((s) => (s.status === "active" ? { ...s, status: "error" } : s))
        );
        setErrorMessage(msg);
        setUploadError(msg);
      }
    }

    executeProcessingPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isError = errorMessage !== null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage="Exams" />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar breadcrumb="Exams" />

        <div className="flex-1 flex flex-col items-center justify-center bg-white">
          {/* Sparkle animation */}
          <div className={`mb-8 ${isError ? "opacity-30" : "animate-pulse"}`}>
            <SparkleIcon />
          </div>

          {/* Main heading */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isError ? "Processing failed" : "Processing assessment…"}
          </h2>
          <p className="text-gray-500 text-base mb-8">
            {isError ? "" : "Extracting questions, handwriting, and mapping answers"}
          </p>

          {/* Error display */}
          {isError && (
            <div className="mb-8 max-w-sm text-center px-6 py-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {errorMessage}
              <div className="mt-3">
                <button
                  onClick={() => router.push("/")}
                  className="text-sm font-medium text-red-700 underline hover:text-red-900"
                >
                  ← Go back and try again
                </button>
              </div>
            </div>
          )}

          {/* Stages */}
          <div className="flex flex-col gap-2 w-72">
            {stages.map((s) => (
              <StageRow key={s.id} stage={s} />
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-6 max-w-xs text-center">
            Answer mapping is active (Phase 6)
          </p>
        </div>
      </div>
    </div>
  );
}
