import { useState, useEffect, useRef, type ReactNode } from "react";
import { Info } from "lucide-react";

interface EducationalTooltipProps {
  title: string;
  content: ReactNode;
  className?: string;
}

export function EducationalTooltip({
  title,
  content,
  className = "",
}: EducationalTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        className="p-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
      >
        <Info className="w-4 h-4 text-muted-foreground" />
      </button>
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-72 p-4 bg-card border border-border rounded-xl shadow-xl z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-bold text-primary mb-2 text-sm">{title}</h3>
          <div className="text-sm text-foreground/90">{content}</div>
        </div>
      )}
    </div>
  );
}
