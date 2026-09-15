import axios from "axios";
import type { components } from "@/types/api";

// base url - update this if things change
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Behind Authelia (stairs.thomasehardt.com) an expired session turns an XHR into
// a 302 to auth.thomasehardt.com, which the browser won't let axios read - it
// lands here as a 401 or as a response-less network error. A full page load is a
// top-level navigation, so Authelia can redirect it properly and bring us back.
// The guard keeps a genuinely dead API from becoming a reload loop.
const RELOAD_GUARD_KEY = "stairs:auth-reload-at";
const RELOAD_GUARD_MS = 30_000;

api.interceptors.response.use(undefined, (error) => {
  const status = error?.response?.status;
  const looksLikeExpiredSession = status === 401 || !error?.response;

  if (looksLikeExpiredSession && typeof window !== "undefined") {
    let last = 0;
    try {
      last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0;
    } catch {
      // sessionStorage can throw in locked-down contexts; treat as never reloaded
    }

    if (Date.now() - last > RELOAD_GUARD_MS) {
      try {
        window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
      } catch {
        // ignore - worst case we skip the guard
      }
      window.location.reload();
    }
  }

  return Promise.reject(error);
});

// type aliasing for clarity
export type Target = components["schemas"]["TargetSearchItem"];
export type TargetResponse = components["schemas"]["TargetSearchResponse"];

export default api;
