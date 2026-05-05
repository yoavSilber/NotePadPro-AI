import request from "supertest";
import mongoose from "mongoose";
import app from "../expressApp";
import dotenv from "dotenv";
dotenv.config();

jest.mock("../services/mlService", () => ({
  summarize: jest.fn().mockResolvedValue("mocked summary"),
  embed: jest.fn().mockResolvedValue(Array(384).fill(0.1)),
  MLServiceError: class MLServiceError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "MLServiceError";
    }
  },
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const registerAndLogin = async (suffix: string) => {
  const user = {
    name: `Search Test User ${suffix}`,
    email: `searchtest${suffix}@example.com`,
    username: `searchtest${suffix}`,
    password: "secret123",
  };
  await request(app).post("/users").send(user);
  const res = await request(app)
    .post("/login")
    .send({ username: user.username, password: user.password });
  return res.body.token as string;
};

// ─── tests ────────────────────────────────────────────────────────────────────

describe("GET /search", () => {
  let token: string;

  beforeAll(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }
    token = await registerAndLogin(Date.now().toString());
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("returns 200 for unauthenticated global search (scope=all is public)", async () => {
    const res = await request(app).get("/search?q=cooking");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 when scope=mine with no token", async () => {
    const res = await request(app).get("/search?q=cooking&scope=mine");
    expect(res.status).toBe(401);
  });

  it("returns 400 when query param is missing", async () => {
    const res = await request(app)
      .get("/search")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("returns an array for a valid search query", async () => {
    const res = await request(app)
      .get("/search?q=cooking")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("scope=mine only returns the authenticated user's own notes", async () => {
    // Create a note as user A
    await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "User A private note", content: "This is user A content for scope test." });

    // User B searches with scope=mine — should NOT see User A's notes
    const otherToken = await registerAndLogin(`other${Date.now()}`);
    const res = await request(app)
      .get("/search?q=user A content&scope=mine")
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    const titles = res.body.map((n: any) => n.title);
    expect(titles).not.toContain("User A private note");
  });

  it("scope=all allows any user to search across all notes", async () => {
    const res = await request(app)
      .get("/search?q=cooking&scope=all")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
