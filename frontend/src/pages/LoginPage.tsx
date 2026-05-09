import React from "react";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface LoginFormData {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const { dispatch } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState<LoginFormData>({
    username: "",
    password: "",
  });
  const [error, setError] = React.useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "LOGIN", user: data.user, token: data.token });
        // Navigate to home page
        navigate("/");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Login failed");
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
      <h1>Log in</h1>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <form className="auth-form" data-testid="login_form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            data-testid="login_form_username"
            required
            autoComplete="username"
          />
        </div>
        <div className="form-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            data-testid="login_form_password"
            required
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          data-testid="login_form_login"
        >
          Log in
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
