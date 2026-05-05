import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useNotes } from "../contexts/NotesContext";
import { useAuth } from "../contexts/AuthContext";
import { Note } from "../components/Note";
import { Pagination } from "../components/Pagination";
import { SearchBar } from "../components/SearchBar";
import { SearchResult } from "../services/searchService";
import { getNotes, preloadNotes } from "../services/notesService";
import { notesCache } from "../services/cacheService";

function HomePage() {
  const { state, dispatch } = useNotes();
  const { state: authState, dispatch: authDispatch } = useAuth();
  const { notes, currentPage, totalPages, notification } = state;
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { notes, totalPages } = await getNotes(currentPage);
      dispatch({ type: "set_notes", notes, totalPages });

      // Preload surrounding pages in background
      setTimeout(() => {
        preloadNotes(currentPage, totalPages);
      }, 100);
    };
    fetchData();
  }, [currentPage, dispatch]);

  // Auto-dismiss notifications after 4 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      dispatch({ type: "set_notification", notification: "" });
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification, dispatch]);

  const handlePageChange = (page: number) => {
    dispatch({ type: "set_page", page });
  };

  const handleLogout = () => {
    authDispatch({ type: "LOGOUT" });
  };

  const handleAdd = async () => {
    try {
      const headers: any = { "Content-Type": "application/json" };

      // Add authorization header if user is authenticated
      if (authState.token) {
        headers.Authorization = `Bearer ${authState.token}`;
      }

      const res = await fetch(`${API_BASE_URL}/notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newNoteTitle || "New Note",
          content: newNoteContent,
        }),
      });

      if (res.ok) {
        await res.json();

        // Clear cache and refetch notes to update pagination
        notesCache.clear();
        const { notes, totalPages } = await getNotes(currentPage);
        dispatch({ type: "set_notes", notes, totalPages });

        dispatch({
          type: "set_notification",
          notification: "Added a new note",
        });
        setNewNoteContent("");
        setNewNoteTitle("");
        setAdding(false);
      } else {
        const errorData = await res.json();
        dispatch({
          type: "set_notification",
          notification: errorData.error || "Failed to add new note",
        });
      }
    } catch {
      dispatch({
        type: "set_notification",
        notification: "Failed to add new note",
      });
    }
  };

  return (
    <div className="app">
      <h1>NotePad<span style={{ color: "#4a7cdc" }}>Pro</span> <span style={{ fontSize: "0.6em", color: "#4a7cdc", fontWeight: 600, verticalAlign: "middle" }}>AI</span></h1>

      {/* Navigation Section */}
      {!authState.isAuthenticated ? (
        <div className="nav-buttons">
          <Link to="/login">
            <button data-testid="go_to_login_button">Log in</button>
          </Link>
          <Link to="/create-user">
            <button data-testid="go_to_create_user_button">
              Register
            </button>
          </Link>
        </div>
      ) : (
        <div className="nav-buttons">
          <span className="welcome-msg">Welcome, {authState.user?.name}!</span>
          <button data-testid="logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}

      {notification && <div className="notification" role="status">{notification}</div>}

      {authState.isAuthenticated && (
        <SearchBar
          token={authState.token}
          onResults={setSearchResults}
        />
      )}

      {searchResults !== null ? (
        <>
          <p className="search-results-header">
            {searchResults.length === 0
              ? "No results found — try different keywords or a broader phrase"
              : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} found`}
          </p>
          <div className="notes-container">
            {searchResults.map((note) => (
              <Note
                key={note._id}
                note={note}
                canEdit={
                  authState.isAuthenticated &&
                  authState.user?.email === note.author?.email
                }
                token={authState.token}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="notes-container">
            {notes.length === 0 ? (
              <p className="empty-state">
                No notes yet.{authState.isAuthenticated ? " Add your first note below!" : " Log in to add notes."}
              </p>
            ) : (
              notes.map((note) => (
                <Note
                  key={note._id}
                  note={note}
                  canEdit={
                    authState.isAuthenticated &&
                    authState.user?.email === note.author?.email
                  }
                  token={authState.token}
                />
              ))
            )}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Add Note Form - Only for logged in users */}
      {authState.isAuthenticated && (
        <div>
          {!adding && (
            <button name="add_new_note" onClick={() => setAdding(true)}>
              + Add note
            </button>
          )}
          {adding && (
            <div className="add-note-form">
              <label htmlFor="new-note-title" className="sr-only">Note title</label>
              <input
                id="new-note-title"
                type="text"
                value={newNoteTitle}
                placeholder="Note title"
                onChange={(e) => setNewNoteTitle(e.target.value)}
              />
              <label htmlFor="new-note-content" className="sr-only">Note content</label>
              <input
                id="new-note-content"
                type="text"
                value={newNoteContent}
                name="text_input_new_note"
                placeholder="Note content (markdown supported)"
                onChange={(e) => setNewNoteContent(e.target.value)}
              />
              <div className="add-note-actions">
                <button name="text_input_save_new_note" onClick={handleAdd}>
                  Save
                </button>
                <button
                  name="text_input_cancel_new_note"
                  onClick={() => {
                    setAdding(false);
                    setNewNoteContent("");
                    setNewNoteTitle("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HomePage;
