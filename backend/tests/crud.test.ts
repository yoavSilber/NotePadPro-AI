import request from "supertest";
import mongoose from "mongoose";
import app from "../expressApp";
import dotenv from "dotenv";
dotenv.config();

const uniqueId = Date.now();
const testUser = {
  name: "CRUD Test User",
  email: `crudtest${uniqueId}@example.com`,
  username: `crudtest${uniqueId}`,
  password: "secret123",
};

const sampleNote = {
  title: "Test Note",
  content: "This is a test note.",
};

describe("CRUD API tests", () => {
  let createdNoteId: string;
  let token: string;

  beforeAll(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Register and log in to get a JWT token for authenticated requests
    await request(app).post("/users").send(testUser);
    const loginRes = await request(app)
      .post("/login")
      .send({ username: testUser.username, password: testUser.password });
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("creates a new note", async () => {
    const res = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleNote);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.content).toBe(sampleNote.content);
    createdNoteId = res.body._id;
  });

  it("reads the created note", async () => {
    const res = await request(app).get(`/notes/${createdNoteId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("_id", createdNoteId);
    expect(res.body.title).toBe(sampleNote.title);
  });

  it("updates the note", async () => {
    const res = await request(app)
      .put(`/notes/${createdNoteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: sampleNote.title, content: "Updated content" });
    expect(res.status).toBe(200);
    expect(res.body.content).toBe("Updated content");
  });

  it("deletes the note", async () => {
    const res = await request(app)
      .delete(`/notes/${createdNoteId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);

    const followUp = await request(app).get(`/notes/${createdNoteId}`);
    expect(followUp.status).toBe(404);
  });
});
