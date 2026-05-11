import { createContext, useContext, useState, type ReactNode } from "react";

export interface PinnedTarget {
  id: string;
  common_name?: string | null;
  target_type?: string | null;
  score: number;
}

interface PlanContextType {
  pinnedTargets: PinnedTarget[];
  togglePin: (target: PinnedTarget) => void;
  clearPins: () => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [pinnedTargets, setPinnedTargets] = useState<PinnedTarget[]>([]);

  const togglePin = (target: PinnedTarget) => {
    setPinnedTargets((prev) => {
      const exists = prev.some((pt) => pt.id === target.id);
      if (exists) {
        return prev.filter((pt) => pt.id !== target.id);
      }
      return [...prev, target];
    });
  };

  const clearPins = () => setPinnedTargets([]);

  return (
    <PlanContext.Provider value={{ pinnedTargets, togglePin, clearPins }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) throw new Error("usePlan must be used within a PlanProvider");
  return context;
}
