import { useContext } from "react";
import { PlanContext } from "@/context/PlanContext.context";

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) throw new Error("usePlan must be used within a PlanProvider");
  return context;
}
