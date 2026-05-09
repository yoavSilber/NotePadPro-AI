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
    <div className="auth-page">
      <h1>Create Account</h1>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {message && <div className="auth-success" role="status">{message}</div>}
      <form className="auth-form" data-testid="create_user_form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="create-name">Full Name</label>
          <input
            id="create-name"
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            data-testid="create_user_form_name"
            required
            autoComplete="name"
          />
        </div>
        <div className="form-field">
          <label htmlFor="create-email">Email</label>
          <input
            id="create-email"
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            data-testid="create_user_form_email"
            required
            autoComplete="email"
          />
        </div>
        <div className="form-field">
          <label htmlFor="create-username">Username</label>
          <input
            id="create-username"
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            data-testid="create_user_form_username"
            required
            autoComplete="username"
          />
        </div>
        <div className="form-field">
          <label htmlFor="create-password">Password</label>
          <input
            id="create-password"
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            data-testid="create_user_form_password"
            required
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          data-testid="create_user_form_create_user"
        >
          Create Account
        </button>
      </form>
    </div>
  );
};

export default CreateUserPage;
