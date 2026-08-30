import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AssessmentProvider } from "@/lib/assessment-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VedaAI Assessment",
  description: "AI Assessment Extraction & Answer Mapping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`antialiased font-sans ${inter.className}`}>
        <AssessmentProvider>{children}</AssessmentProvider>
      </body>
    </html>
  );
}
