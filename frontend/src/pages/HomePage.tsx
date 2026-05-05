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
      <h1>Notes</h1>

      {/* Navigation Section */}
      {!authState.isAuthenticated ? (
        <div>
          <Link to="/login">
            <button data-testid="go_to_login_button">Go to Login</button>
          </Link>
          <Link to="/create-user">
            <button data-testid="go_to_create_user_button">
              Create New User
            </button>
          </Link>
        </div>
      ) : (
        <div>
          <p>Welcome, {authState.user?.name}!</p>
          <button data-testid="logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}

      <div className="notification">{notification}</div>

      {authState.isAuthenticated && (
        <SearchBar
          token={authState.token}
          onResults={setSearchResults}
        />
      )}

      {searchResults !== null ? (
        <>
          <p className="search-results-header">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
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
            {notes.map((note) => (
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
              Add new note
            </button>
          )}
          {adding && (
            <div>
              <input
                type="text"
                value={newNoteTitle}
                placeholder="Note title"
                onChange={(e) => setNewNoteTitle(e.target.value)}
              />
              <input
                type="text"
                value={newNoteContent}
                name="text_input_new_note"
                placeholder="Note content"
                onChange={(e) => setNewNoteContent(e.target.value)}
              />
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
          )}
        </div>
      )}
    </div>
  );
}

export default HomePage;
