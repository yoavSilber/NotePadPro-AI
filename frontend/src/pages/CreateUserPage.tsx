import React, { useState } from "react";
import { API_BASE_URL } from "../config";

interface CreateUserFormData {
  name: string;
  email: string;
  username: string;
  password: string;
}

const CreateUserPage: React.FC = () => {
  const [formData, setFormData] = useState<CreateUserFormData>({
    name: "",
    email: "",
    username: "",
    password: "",
  });
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage("User created successfully! You can now login.");
        setFormData({ name: "", email: "", username: "", password: "" });
        // Redirect to homepage after a short delay
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create user");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div>
      <h1>Create New User</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {message && <div style={{ color: "green" }}>{message}</div>}
      <form data-testid="create_user_form" onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            data-testid="create_user_form_name"
            required
          />
        </div>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            data-testid="create_user_form_email"
            required
          />
        </div>
        <div>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            data-testid="create_user_form_username"
            required
          />
        </div>
        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            data-testid="create_user_form_password"
            required
          />
        </div>
        <button type="submit" data-testid="create_user_form_create_user">
          Create User
        </button>
      </form>
    </div>
  );
};

export default CreateUserPage;
