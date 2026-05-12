import { createContext } from "react";
import type { PinnedTarget } from "./PlanContext.types";

interface PlanContextType {
  pinnedTargets: PinnedTarget[];
  togglePin: (target: PinnedTarget) => void;
  clearPins: () => void;
}

export const PlanContext = createContext<PlanContextType | undefined>(
  undefined,
);
