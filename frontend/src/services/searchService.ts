import axios from "axios";
import { Note } from "../Note";
import { API_BASE_URL } from "../config";

const BASE_URL = API_BASE_URL;

export interface SearchResult extends Note {
  score: number;
}

export const semanticSearch = async (
  query: string,
  scope: "all" | "mine" = "all",
  token?: string | null
): Promise<SearchResult[]> => {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await axios.get<SearchResult[]>(`${BASE_URL}/search`, {
    params: { q: query, scope },
    headers,
  });
  return response.data;
};
