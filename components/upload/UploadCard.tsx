"use client";

import { useRef } from "react";
import { UploadedFile } from "@/lib/types";
import { cn } from "@/lib/utils";

const UploadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="3" y="21" width="26" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 4v16M10 10l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PdfIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="8" fill="#EF4444"/>
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="sans-serif">PDF</text>
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
}

interface UploadCardProps {
  label: string;
  labelHighlight: string;
  maxSizeLabel?: string;
  file: UploadedFile | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  accept?: string;
  className?: string;
}

export default function UploadCard({
  label,
  labelHighlight,
  maxSizeLabel = "Max 10MB",
  file,
  onFileSelect,
  onFileRemove,
  accept = ".pdf,.png,.jpg,.jpeg",
  className,
}: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!file) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFileSelect(selected);
    // reset so same file can be re-selected after removal
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "relative flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white transition-all",
        !file && "cursor-pointer hover:border-orange-400 hover:bg-orange-50/30",
        file && "cursor-default",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        aria-label={`Upload ${labelHighlight}`}
      />

      {!file ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 py-10 px-8 text-center">
          <div className="text-gray-400">
            <UploadIcon />
          </div>
          <div>
            <p className="font-semibold text-base text-gray-900">
              {label}{" "}
              <span className="text-[#E85D27]">{labelHighlight}</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">{maxSizeLabel}</p>
          </div>
        </div>
      ) : (
        /* Filled state */
        <div className="flex items-center gap-4 px-6 py-6 w-full">
          <PdfIcon />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatBytes(file.size)}
              {file.pages ? ` • ${file.pages} Pages` : ""}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileRemove();
            }}
            className="flex-shrink-0 w-8 h-8 bg-gray-700 hover:bg-gray-900 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Remove file"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
