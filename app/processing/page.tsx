"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import LoadingScreen from "@/components/processing/LoadingScreen";

export default function ProcessingPage() {
  const router = useRouter();

  const handleComplete = () => {
    router.push("/assessment");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Collapsed sidebar for loading screen, matching the Figma */}
      <Sidebar activePage="Exams" />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar breadcrumb="Exams" />
        <LoadingScreen onComplete={handleComplete} />
      </div>
    </div>
  );
}
