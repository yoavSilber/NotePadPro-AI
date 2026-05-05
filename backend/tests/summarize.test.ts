import request from "supertest";
import mongoose from "mongoose";
import app from "../expressApp";
import dotenv from "dotenv";
dotenv.config();

// Mock the ML service so tests don't need the Python process running.
// Jest replaces the real HTTP calls with these stub implementations.
jest.mock("../services/mlService", () => ({
  summarize: jest.fn().mockResolvedValue("This is a mocked summary."),
  embed: jest.fn().mockResolvedValue(Array(384).fill(0)),
  MLServiceError: class MLServiceError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "MLServiceError";
    }
  },
}));

import * as mlService from "../services/mlService";

// ─── helpers ──────────────────────────────────────────────────────────────────

const registerAndLogin = async (suffix: string) => {
  const user = {
    name: `Test User ${suffix}`,
    email: `testuser${suffix}@example.com`,
    username: `testuser${suffix}`,
    password: "secret123",
  };
  await request(app).post("/users").send(user);
  const loginRes = await request(app)
    .post("/login")
    .send({ username: user.username, password: user.password });
  return loginRes.body.token as string;
};

const createNote = async (token: string, content = "a".repeat(60)) => {
  const res = await request(app)
    .post("/notes")
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "Test Note", content });
  return res.body._id as string;
};

// ─── tests ────────────────────────────────────────────────────────────────────

describe("POST /notes/:id/summarize", () => {
  let token: string;
  let noteId: string;

  beforeAll(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }
    token = await registerAndLogin(Date.now().toString());
    noteId = await createNote(token);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no token is provided", async () => {
    const res = await request(app).post(`/notes/${noteId}/summarize`);
    expect(res.status).toBe(401);
  });

  it("returns 200 when a different authenticated user summarizes (any user can summarize any note)", async () => {
    const otherToken = await registerAndLogin(`other${Date.now()}`);
    const res = await request(app)
      .post(`/notes/${noteId}/summarize`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
  });

  it("returns 404 for a non-existent note id", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/notes/${fakeId}/summarize`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 with a summary on success", async () => {
    // Use a fresh note so there is no cached summary from a previous test
    const freshNoteId = await createNote(token);
    const res = await request(app)
      .post(`/notes/${freshNoteId}/summarize`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBe("This is a mocked summary.");
    expect(res.body.summarizedAt).toBeDefined();
    expect(mlService.summarize).toHaveBeenCalledTimes(1);
  });

  it("returns cached summary without calling ML service again for same content", async () => {
    // First call — generates summary
    await request(app)
      .post(`/notes/${noteId}/summarize`)
      .set("Authorization", `Bearer ${token}`);

    jest.clearAllMocks();

    // Second call — content unchanged, should be a cache hit
    const res = await request(app)
      .post(`/notes/${noteId}/summarize`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBe("This is a mocked summary.");
    expect(mlService.summarize).not.toHaveBeenCalled();
  });
});
