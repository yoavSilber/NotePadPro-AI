// In production (Vercel), VITE_API_URL is set to the Railway backend URL.
// Locally it falls back to http://localhost:3001.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";
