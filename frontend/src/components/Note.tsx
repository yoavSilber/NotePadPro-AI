import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Note as NoteType } from "../Note";
import { useNotes } from "../contexts/NotesContext";
import { useAuth } from "../contexts/AuthContext";
import { handleApiError, isAuthError } from "../services/errorService";
import { notesCache } from "../services/cacheService";
import { getNotes, summarizeNote } from "../services/notesService";
import "./Note.css";
import { API_BASE_URL } from "../config";

const BASE_URL = API_BASE_URL;

interface NoteProps {
  note: NoteType;
  canEdit?: boolean;
  token?: string | null;
}

export const Note = ({ note, canEdit = false, token }: NoteProps) => {
  const { state, dispatch } = useNotes();
  const { dispatch: authDispatch } = useAuth();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  // Always start with no summary shown — user must click "AI Summary" to see it.
  // The summary may already be cached in the DB (fast) but we don't show it
  // automatically so other users aren't forced to see it without asking.
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [rendered, setRendered] = useState(false);

  const handleDelete = async () => {
    if (!token) {
      dispatch({
        type: "set_notification",
        notification: "Authentication required",
      });
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/notes/${note._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Clear cache
        notesCache.clear();

        // Refetch current page to update the list
        const { notes, totalPages } = await getNotes(state.currentPage);

        // If current page is now empty and it's not page 1, go to previous page
        if (notes.length === 0 && state.currentPage > 1) {
          const prevPage = state.currentPage - 1;
          const prevPageData = await getNotes(prevPage);
          dispatch({
            type: "set_notes",
            notes: prevPageData.notes,
            totalPages: prevPageData.totalPages,
          });
          dispatch({ type: "set_page", page: prevPage });
        } else {
          // Stay on current page with updated data
          dispatch({ type: "set_notes", notes, totalPages });
        }

        dispatch({ type: "set_notification", notification: "Note deleted" });
      } else {
        const errorData = await response.json();
        const errorMessage = handleApiError({
          response: { status: response.status, data: errorData },
        });
        dispatch({ type: "set_notification", notification: errorMessage });

        if (response.status === 401) {
          authDispatch({ type: "LOGOUT" });
        }
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      dispatch({ type: "set_notification", notification: errorMessage });

      if (isAuthError(error)) {
        authDispatch({ type: "LOGOUT" });
      }
    }
  };

  const handleSummarize = async () => {
    if (!token) {
      dispatch({ type: "set_notification", notification: "Authentication required" });
      return;
    }
    setSummarizing(true);
    try {
      const result = await summarizeNote(note._id, token);
      setSummary(result.summary);
    } catch (error) {
      const msg = handleApiError(error);
      dispatch({ type: "set_notification", notification: msg });
      if (isAuthError(error)) authDispatch({ type: "LOGOUT" });
    } finally {
      setSummarizing(false);
    }
  };

  const handleEdit = () => setEditing(true);
  const handleCancel = () => {
    setEditing(false);
    setContent(note.content);
  };

  const handleSave = async () => {
    if (!token) {
      dispatch({
        type: "set_notification",
        notification: "Authentication required",
      });
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/notes/${note._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: note.title, content }),
      });

      if (response.ok) {
        const updatedNote = await response.json();
        dispatch({ type: "update_note", note: updatedNote });
        dispatch({ type: "set_notification", notification: "Note updated" });
        setEditing(false);
      } else {
        const errorData = await response.json();
        dispatch({
          type: "set_notification",
          notification: errorData.error || "Failed to update the note.",
        });
      }
    } catch (error) {
      dispatch({
        type: "set_notification",
        notification: "An error occurred while updating the note.",
      });
    }
  };

  return (
    <div className="note" data-testid={note._id}>
      <h2>{note.title}</h2>
      {note.author && <small>By {note.author.name}</small>}
      {!editing ? (
        <>
          <button
            className="note-markdown-toggle"
            onClick={() => setRendered((r) => !r)}
            title={rendered ? "Show source" : "Render markdown"}
            aria-label={rendered ? "Show markdown source" : "Preview rendered markdown"}
          >
            {rendered ? "Source" : "Preview"}
          </button>
          {rendered ? (
            <div className="note-markdown-body">
              <ReactMarkdown
                urlTransform={(url) => {
                  // Block javascript: and data: URIs to prevent XSS via markdown links/images.
                  const safe = /^(https?:\/\/|\/|#|\?)/i.test(url);
                  return safe ? url : "";
                }}
              >
                {note.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p>{note.content}</p>
          )}
          <div className="note-actions">
            {canEdit && (
              <>
                <button
                  data-testid={`delete-${note._id}`}
                  onClick={handleDelete}
                  aria-label={`Delete note: ${note.title}`}
                >
                  Delete
                </button>
                <button
                  data-testid={`edit-${note._id}`}
                  onClick={handleEdit}
                  aria-label={`Edit note: ${note.title}`}
                >
                  Edit
                </button>
              </>
            )}
            {token && (
              <button
                data-testid={`summarize-${note._id}`}
                onClick={handleSummarize}
                disabled={summarizing}
                aria-label={`AI summarize note: ${note.title}`}
              >
                {summarizing ? "Summarizing…" : "AI Summary"}
              </button>
            )}
          </div>
          {summary && (
            <div className="note-summary" data-testid={`summary-${note._id}`}>
              <span className="note-summary-label">AI Summary</span>
              <p>{summary}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <textarea
            data-testid={`text_input-${note._id}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Edit note content"
          />
          <div className="note-actions">
            <button
              data-testid={`text_input_save-${note._id}`}
              onClick={handleSave}
            >
              Save
            </button>
            <button
              data-testid={`text_input_cancel-${note._id}`}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};
