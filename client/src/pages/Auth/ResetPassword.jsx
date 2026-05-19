import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { buildApiUrl, getApiBaseUrl } from "../../utils/apiUrl";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const verifyToken = useCallback(async (tokenToVerify) => {
    try {
      setLoading(true);
      const apiBaseUrl = getApiBaseUrl();

      // Debug: Log API configuration
      console.log("🔧 API Configuration:", {
        VITE_API_URL:
          import.meta.env.VITE_API_URL || "NOT SET (using fallback /api)",
        apiBaseUrl: apiBaseUrl,
        windowLocation: window.location.href,
      });

      // Warn if using relative URL in production (Vercel)
      if (
        !import.meta.env.VITE_API_URL &&
        window.location.hostname.includes("therapease.site")
      ) {
        console.error(
          "⚠️ WARNING: VITE_API_URL is not set! Using relative URL /api which will fail.",
        );
        console.error(
          "💡 Fix: Set VITE_API_URL=https://api.therapease.site/api in Vercel environment variables",
        );
      }

      // URL encode the token to handle special characters safely
      const encodedToken = encodeURIComponent(tokenToVerify);
      const url = buildApiUrl(`/api/auth/verify-reset-token/${encodedToken}`);

      console.log("🔍 Verifying token at URL:", url);
      console.log("🔍 Original token:", tokenToVerify.substring(0, 20) + "...");

      console.log("📡 Making API request to:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      console.log("📥 Response status:", response.status, response.statusText);
      console.log(
        "📥 Response Content-Type:",
        response.headers.get("content-type"),
      );

      // Get the response text first (before parsing) to check if it's HTML
      const responseText = await response.text();
      console.log(
        "📥 Response text (first 100 chars):",
        responseText.substring(0, 100),
      );

      // Check if response is HTML (error page) instead of JSON
      const trimmedText = responseText.trim();
      if (
        trimmedText.startsWith("<!DOCTYPE") ||
        trimmedText.startsWith("<html") ||
        trimmedText.startsWith("<!doctype")
      ) {
        console.error("❌ Server returned HTML instead of JSON");
        console.error("Full HTML response:", responseText);

        // Extract error message from HTML if possible
        const titleMatch = responseText.match(/<title[^>]*>([^<]+)<\/title>/i);
        const errorTitle = titleMatch ? titleMatch[1] : "Unknown error";

        throw new Error(`Server returned HTML page (${response.status} ${errorTitle}). This usually means:
1. The API endpoint was not found (404) - Route: /api/auth/verify-reset-token/:token
2. VITE_API_URL is incorrect - Currently using: ${apiBaseUrl}
3. The backend server is not running or not accessible

URL called: ${url}
Expected URL format: https://api.therapease.site/api/auth/verify-reset-token/{token}

Debugging steps:
1. Check VITE_API_URL in Vercel → Settings → Environment Variables
   Should be: https://api.therapease.site/api
2. Test API directly: curl https://api.therapease.site/api/health
3. Check PM2 status on droplet: pm2 status
4. Check PM2 logs: pm2 logs therapease-api`);
      }

      // Check response status
      if (!response.ok) {
        console.error(
          `❌ HTTP Error ${response.status}:`,
          responseText.substring(0, 200),
        );

        // Try to parse as JSON first (API might return JSON errors)
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (parseError) {
          // Not JSON, use the raw text or status
          if (responseText.length > 0 && responseText.length < 500) {
            errorMessage = responseText;
          }
        }

        throw new Error(errorMessage);
      }

      // Parse JSON response
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON response");
        console.error("Response text:", responseText.substring(0, 500));
        console.error("Parse error:", parseError);
        throw new Error(
          `Server returned invalid JSON. Response: ${responseText.substring(0, 100)}...`,
        );
      }

      if (result.success) {
        setTokenValid(true);
        setUserInfo(result.data);
        toast.success("Token verified successfully");
      } else {
        setTokenValid(false);
        const errorMsg = result.error || "Invalid or expired token";
        console.error("❌ Token verification failed:", errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Token verification error:", error);

      // Show the actual error message if available
      const errorMsg = error.message || "Failed to verify token";
      console.error("Error message:", errorMsg);

      // If it's an HTML response error, show a more helpful message
      if (errorMsg.includes("Server returned HTML")) {
        toast.error(
          "API endpoint not found. Please check server configuration.",
        );
      } else if (errorMsg.includes("VITE_API_URL")) {
        toast.error("API URL not configured. Please contact administrator.");
      } else {
        toast.error(errorMsg);
      }

      setTokenValid(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      verifyToken(tokenFromUrl);
    }
  }, [searchParams, verifyToken]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push(
        "Password must contain at least one special character (@$!%*?&)",
      );
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Reset token is required");
      return;
    }

    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      toast.error(passwordErrors[0]);
      return;
    }

    try {
      setLoading(true);
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(buildApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      // Check if response is JSON (not HTML error page)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error(
          "Server returned non-JSON response. Please check the API URL configuration.",
        );
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          "Password reset successfully! You can now login with your new password.",
        );
        navigate("/auth/login");
      } else {
        toast.error(result.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = (e) => {
    e.preventDefault();
    if (token.trim()) {
      verifyToken(token.trim());
    } else {
      toast.error("Please enter a reset token");
    }
  };

  if (loading && !tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying reset token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {tokenValid
              ? "Enter your new password below"
              : "Enter your reset token to continue"}
          </p>
        </div>

        {!tokenValid ? (
          <form className="mt-8 space-y-6" onSubmit={handleTokenSubmit}>
            <div>
              <label htmlFor="token" className="sr-only">
                Reset Token
              </label>
              <input
                id="token"
                name="token"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your reset token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify Token"}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {userInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Reset password for: {userInfo.email}
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Token expires:{" "}
                        {new Date(userInfo.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your new password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm your new password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Password Requirements
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>At least 8 characters long</li>
                      <li>Contains uppercase and lowercase letters</li>
                      <li>Contains at least one number</li>
                      <li>Contains at least one special character (@$!%*?&)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
