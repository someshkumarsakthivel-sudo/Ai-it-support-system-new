import { useState } from "react";
import "./Login.css";
import { loginUser } from "../services/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await loginUser(
        email.trim(),
        password
      );

      if (!data.access_token) {
        throw new Error(
          "Login succeeded, but no access token was received."
        );
      }

      const userData = {
        user_id: data.user_id,
        name: data.name,
        email: data.email,
        role_id: data.role_id,
      };

      if (rememberMe) {
        localStorage.setItem(
          "access_token",
          data.access_token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(userData)
        );

        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
      } else {
        sessionStorage.setItem(
          "access_token",
          data.access_token
        );

        sessionStorage.setItem(
          "user",
          JSON.stringify(userData)
        );

        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }

      alert(
        `Login successful. Welcome, ${data.name}!`
      );

      window.location.reload();
    } catch (err) {
      setError(
        err.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="brand-icon">IT</div>

          <h1>AI IT Support</h1>

          <p>
            IT Support &amp; Ticket Management System
          </p>
        </div>

        <div className="login-card">
          <h2>Welcome back</h2>

          <p className="login-subtitle">
            Sign in to access your support dashboard
          </p>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked
                    )
                  }
                />

                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  alert(
                    "Password recovery will be added later."
                  )
                }
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>
          </form>
        </div>

        <p className="login-footer">
          Secure IT support management platform
        </p>
      </div>
    </div>
  );
}

export default Login;