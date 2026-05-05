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
    <div>
      <h1>Login</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <form data-testid="login_form" onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            data-testid="login_form_username"
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
            data-testid="login_form_password"
            required
          />
        </div>
        <button type="submit" data-testid="login_form_login">
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
