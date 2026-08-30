import Link from "next/link";

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="2" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M6 2V1.5a1 1 0 012 0V2" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="5" y="2" width="6" height="1.5" rx="0.5" fill="currentColor"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="9.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8.5 8.5C8.5 7.12 9.62 6 11 6s2.5 1.12 2.5 2.5c0 1.67-2.5 1.67-2.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="11" cy="15.5" r="0.8" fill="currentColor"/>
  </svg>
);

const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M11 3a6 6 0 016 6v3l1.5 2.5H3.5L5 12V9a6 6 0 016-6z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 0 L11.8 8.2 L20 10 L11.8 11.8 L10 20 L8.2 11.8 L0 10 L8.2 8.2 Z"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface TopBarProps {
  breadcrumb?: string;
  backHref?: string;
}

export default function TopBar({ breadcrumb = "Exams", backHref = "/" }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-gray-200 bg-white flex-shrink-0">
      {/* Left: back + breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Go back"
        >
          <BackIcon />
        </Link>
        <div className="flex items-center gap-1.5 text-gray-600">
          <ClipboardIcon />
          <span className="text-sm font-medium">{breadcrumb}</span>
        </div>
      </div>

      {/* Right: actions + avatar */}
      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-gray-800 transition-colors" aria-label="Help">
          <HelpIcon />
        </button>
        <button className="relative text-gray-500 hover:text-gray-800 transition-colors" aria-label="Notifications">
          <BellIcon />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button className="text-gray-500 hover:text-gray-800 transition-colors" aria-label="AI features">
          <SparkleIcon />
        </button>
        <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            <span>MR</span>
          </div>
          <span>Madhur Rastogi</span>
          <ChevronDownIcon />
        </button>
      </div>
    </header>
  );
}
