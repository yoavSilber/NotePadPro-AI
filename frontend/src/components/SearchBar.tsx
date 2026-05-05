import { useState, useEffect, useRef } from "react";
import { SearchResult, semanticSearch } from "../services/searchService";
import "./SearchBar.css";

interface SearchBarProps {
  token: string | null;
  isAuthenticated: boolean;
  onResults: (results: SearchResult[] | null) => void;
}

export const SearchBar = ({ token, isAuthenticated, onResults }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      onResults(null);
      return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await semanticSearch(query, scope, token);
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
  }, [query, scope, token, onResults]);

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search notes by meaning… (AI-powered)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="search-input"
          aria-label="Semantic search notes"
        />
        {loading && <span className="search-loading">Searching…</span>}
        {!loading && query.trim() && (
          <button className="search-clear" onClick={() => setQuery("")}>
            ✕
          </button>
        )}
      </div>
      {isAuthenticated && (
        <div className="search-scope-toggle">
          <button
            className={scope === "all" ? "active" : ""}
            onClick={() => setScope("all")}
          >
            All notes
          </button>
          <button
            className={scope === "mine" ? "active" : ""}
            onClick={() => setScope("mine")}
          >
            My notes
          </button>
        </div>
      )}
    </div>
  );
};
