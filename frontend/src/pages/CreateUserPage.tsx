import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAuth } from "../contexts/AuthContext";

interface CreateUserFormData {
  name: string;
  email: string;
  username: string;
  password: string;
}

const CreateUserPage: React.FC = () => {
  const { dispatch } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateUserFormData>({
    name: "",
    email: "",
    username: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: create the account
      const registerRes = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!registerRes.ok) {
        const errorData = await registerRes.json();
        setError(errorData.error || "Failed to create account");
        return;
      }

      // Step 2: auto-login with the same credentials so the user lands
      // on the home page already authenticated.
      const loginRes = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        dispatch({ type: "LOGIN", user: data.user, token: data.token });
        navigate("/");
      } else {
        // Account created but login failed — send to login page
        navigate("/login");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-back-link">← Back</Link>
      <h2>Create Account</h2>

      {error && <div className="auth-error" role="alert">{error}</div>}

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
          disabled={loading}
          data-testid="create_user_form_create_user"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
};

export default CreateUserPage;
