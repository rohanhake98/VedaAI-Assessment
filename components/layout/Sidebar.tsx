"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
};

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="11" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const ClassroomIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14 8l2 1-2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AssignmentsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="3" y="1" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ExamsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="14" cy="14" r="3" fill="white" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M13 14h2M14 13v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const LibraryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6.5 6C6.5 5 7.5 4.5 9 4.5c1.5 0 2.5.5 2.5 2 0 2-2.5 2-2.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="9" cy="13" r="0.8" fill="currentColor"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0 L9.5 6.5 L16 8 L9.5 9.5 L8 16 L6.5 9.5 L0 8 L6.5 6.5 Z"/>
  </svg>
);

const CollapseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="1" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1" y="1" width="6" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface SidebarProps {
  activePage?: string;
}

export default function Sidebar({ activePage = "Exams" }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems: NavItem[] = [
    { label: "Home", href: "#", icon: <GridIcon /> },
    { label: "My Classroom", href: "#", icon: <ClassroomIcon /> },
    { label: "Assignments", href: "#", icon: <AssignmentsIcon /> },
    { label: "Exams", href: "/", icon: <ExamsIcon />, active: activePage === "Exams" },
    { label: "My Library", href: "#", icon: <LibraryIcon /> },
  ];

  return (
    <aside
      className={`flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 ${
        collapsed ? "w-[72px]" : "w-[300px]"
      }`}
    >
      {/* Logo + collapse */}
      <div className={`flex items-center justify-between px-4 py-5 ${collapsed ? "justify-center px-0 flex-col gap-3" : ""}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
              <Image src="/vedaai-logo.png" alt="VedaAI" width={24} height={24} className="brightness-0 invert" />
            </div>
            <span className="text-[#1a1a1a] font-bold text-xl tracking-tight">VedaAI</span>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
            <Image src="/vedaai-logo.png" alt="VedaAI" width={24} height={24} className="brightness-0 invert" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Toggle sidebar"
        >
          <CollapseIcon />
        </button>
      </div>

      {/* AI Teacher's Toolkit */}
      <div className={`px-4 mb-6 ${collapsed ? "px-3" : ""}`}>
        <button
          className={`flex items-center gap-2 bg-[#1a1a1a] text-white rounded-full font-medium text-sm transition-all hover:bg-[#333] ${
            collapsed ? "w-10 h-10 justify-center p-0" : "px-4 py-2.5 w-full"
          }`}
        >
          <SparkleIcon />
          {!collapsed && <span>AI Teacher&apos;s Toolkit</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-colors group ${
              item.active
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <span className={item.active ? "text-gray-800" : "text-gray-400 group-hover:text-gray-600"}>
              {item.icon}
            </span>
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Expand button (collapsed only) */}
      {collapsed && (
        <div className="px-3 pb-3">
          <button className="flex items-center justify-center w-full py-2 text-gray-400 hover:text-gray-600">
            <ChevronRightIcon />
            <ChevronRightIcon />
          </button>
        </div>
      )}

      {/* School card */}
      <div className={`border-t border-gray-100 ${collapsed ? "p-3" : "p-4"}`}>
        {collapsed ? (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto overflow-hidden">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="#4CAF50" strokeWidth="1.5"/>
              <path d="M10 6v4l3 2" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <div className="w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="1.5"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 9h.01M15 9h.01" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Delhi Public School</p>
              <p className="text-xs text-gray-500 truncate">Bokaro Steel City</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
