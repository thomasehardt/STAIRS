import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTemp(
  celsius: number | null | undefined,
  unit: "C" | "F",
) {
  if (celsius === null || celsius === undefined) return "N/A";
  if (unit === "F") {
    const fahrenheit = celsius * 1.8 + 32;
    return `${Math.round(fahrenheit)}\u00b0F`;
  }
  return `${Math.round(celsius)}\u00b0C`;
}
