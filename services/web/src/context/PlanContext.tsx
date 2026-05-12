import { useState, type ReactNode } from "react";
import type { PinnedTarget } from "./PlanContext.types";
import { PlanContext } from "./PlanContext.context";

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
