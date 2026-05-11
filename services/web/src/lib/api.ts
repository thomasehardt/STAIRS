import axios from "axios";
import type { components } from "@/types/api";

// base url - update this if things change
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// type aliasing for clarity
export type Target = components["schemas"]["TargetSearchItem"];
export type TargetResponse = components["schemas"]["TargetSearchResponse"];

export default api;
