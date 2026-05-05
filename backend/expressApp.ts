import express from "express";
import notesRouter from "./routes/notes";
import usersRouter from "./routes/users";
import searchRouter from "./routes/search";
import { requestLogger } from "./middlewares/logger";
import { errorHandler } from "./middlewares/errorHandler";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://note-pad-pro-ai.vercel.app",
      "https://www.note-pad-pro-ai.vercel.app",
    ],
    credentials: true,
    exposedHeaders: ["X-Total-Count"],
  })
);

app.use(express.json());
app.use(requestLogger);
app.use("/", notesRouter);
app.use("/", usersRouter);
app.use("/", searchRouter);

if (process.env.NODE_ENV === "dev") {
  const testRouter = require("./routes/test").default;
  app.use("/test", testRouter);
}

app.get("/health", (_req, res) => res.send("OK"));

// Error handling middleware should be last
app.use(errorHandler);

export default app;
