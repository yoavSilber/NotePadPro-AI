import { useState, useEffect, useRef } from "react";
import { SearchResult, semanticSearch } from "../services/searchService";
import "./SearchBar.css";

interface SearchBarProps {
  token: string | null;
  onResults: (results: SearchResult[] | null) => void;
}

export const SearchBar = ({ token, onResults }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      onResults(null); // empty query → restore normal note list
      return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }

    if (!token) {
      return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await semanticSearch(query, token);
        onResults(results);
      } catch {
        onResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, token, onResults]);

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search your notes by meaning…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-testid="search-input"
      />
      {loading && <span className="search-loading">Searching…</span>}
      {!loading && query.trim() && (
        <button className="search-clear" onClick={() => setQuery("")}>
          ✕
        </button>
      )}
    </div>
  );
};
