import Image from "next/image";
import { cn } from "@/lib/utils";

interface VedaAILogoProps {
  /** Show the "VedaAI" wordmark next to the icon */
  showWordmark?: boolean;
  /** Icon size in px */
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}

/**
 * VedaAI brand logo — uses the exact asset from design-reference/components.
 * The icon is a dark rounded square with a white "V" chevron (Component 1.png).
 */
export default function VedaAILogo({
  showWordmark = true,
  size = 36,
  className,
  wordmarkClassName,
}: VedaAILogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="rounded-xl bg-[#1a1a1a] flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src="/vedaai-icon.png"
          alt="VedaAI logo"
          width={size}
          height={size}
          className="object-contain"
          priority
        />
      </div>
      {showWordmark && (
        <span
          className={cn(
            "font-bold text-[#1a1a1a] tracking-tight select-none",
            wordmarkClassName
          )}
          style={{ fontSize: size * 0.6 }}
        >
          VedaAI
        </span>
      )}
    </div>
  );
}
