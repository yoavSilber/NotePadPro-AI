import { createContext, useReducer, useContext, ReactNode } from "react";
import { Note } from "../Note";

type State = {
  notes: Note[];
  totalPages: number;
  currentPage: number;
  notification: string;
};

type Action =
  | { type: "set_notes"; notes: Note[]; totalPages: number }
  | { type: "set_page"; page: number }
  | { type: "add_note"; note: Note }
  | { type: "update_note"; note: Note }
  | { type: "delete_note"; id: string }
  | { type: "set_notification"; notification: string };

const initialState: State = {
  notes: [],
  totalPages: 1,
  currentPage: 1,
  notification: "",
};

function notesReducer(state: State, action: Action): State {
  switch (action.type) {
    case "set_notes":
      return { ...state, notes: action.notes, totalPages: action.totalPages };
    case "set_page":
      return { ...state, currentPage: action.page };
    case "add_note":
      return { ...state, notes: [action.note, ...state.notes] };
    case "update_note":
      return {
        ...state,
        notes: state.notes.map((n) =>
          n._id === action.note._id ? action.note : n
        ),
      };
    case "delete_note":
      return {
        ...state,
        notes: state.notes.filter((n) => n._id !== action.id),
      };
    case "set_notification":
      return { ...state, notification: action.notification };
    default:
      return state;
  }
}

const NotesContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => null });

export function NotesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notesReducer, initialState);
  return (
    <NotesContext.Provider value={{ state, dispatch }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  return useContext(NotesContext);
}
