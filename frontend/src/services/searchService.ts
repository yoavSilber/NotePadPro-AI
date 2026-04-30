import axios from "axios";
import { Note } from "../Note";

const BASE_URL = "http://localhost:3001";

export interface SearchResult extends Note {
  score: number;
}

export const semanticSearch = async (
  query: string,
  token: string
): Promise<SearchResult[]> => {
  const response = await axios.get<SearchResult[]>(`${BASE_URL}/search`, {
    params: { q: query },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
