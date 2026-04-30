export interface Note {
  _id: string;
  title: string;
  author: {
    name: string;
    email: string;
  } | null;
  content: string;
  summary?: string;
  summarizedAt?: string;
}

