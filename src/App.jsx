// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import StudentDashboard from "./StudentDashboard.jsx";
import TeacherDashboard from "./TeacherDashboard.jsx";
import ScanAttendance from "./ScanAttendance.jsx";
import { API_BASE } from "./config";



function LoginPage() {
  const [role, setRole] = useState("student");
  const [emailOrId, setEmailOrId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // auto-redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("cs_token");
    const savedRole = localStorage.getItem("cs_role");
    if (token && savedRole === "student") {
      navigate("/student/dashboard");
    } else if (token && savedRole === "teacher") {
      navigate("/teacher/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!emailOrId || !password) {
    toast.error("Please fill all fields");
    return;
  }

  try {
    setLoading(true);

    let url = "";
    let body = {};

    if (role === "student") {
      url = `${API_BASE}/auth/login/student`;
      body = { admissionNo: emailOrId, password };
    } else {
      // teacher login
      url = `${API_BASE}/auth/login/teacher`;
      body = { email: emailOrId, password };   // <- use the field your backend expects
    }

    const res = await axios.post(url, body);
    const { token, user } = res.data;

    localStorage.setItem("cs_token", token);
    localStorage.setItem("cs_role", role);
    localStorage.setItem("cs_user", JSON.stringify(user));

    toast.success("Signed in successfully");

    if (role === "student") {
      navigate("/student/dashboard");
    } else {
      navigate("/teacher/dashboard");
    }
  } catch (err) {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      "Login failed. Check credentials.";
    toast.error(msg);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="cs-app-root">
      <div className="cs-gradient-bg" />
      <div className="cs-login-wrapper">
        <div className="cs-login-card">
          <h1 className="cs-title">
            ClassSync – Smart Attendance &amp; Timetable
          </h1>
          <p className="cs-subtitle">
            Seamless QR attendance, credit-based tracking, and live dashboards
            for RVCE students and teachers.
          </p>

          <div className="cs-role-toggle">
            <button
              type="button"
              className={`cs-role-btn ${
                role === "student" ? "cs-role-btn-active" : ""
              }`}
              onClick={() => setRole("student")}
            >
              Student
            </button>
            <button
              type="button"
              className={`cs-role-btn ${
                role === "teacher" ? "cs-role-btn-active" : ""
              }`}
              onClick={() => setRole("teacher")}
            >
              Teacher
            </button>
          </div>

          <form className="cs-form" onSubmit={handleSubmit}>
            <label className="cs-label">
              {role === "student"
                ? "Admission Number"
                : "Employee ID or Email"}
              <input
                type="text"
                className="cs-input"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder={
                  role === "student"
                    ? "e.g., 1RV21CS001"
                    : "teacher@rvce.edu.in"
                }
              />
            </label>

            <label className="cs-label">
              Password
              <input
                type="password"
                className="cs-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </label>

            <button
              type="submit"
              className="cs-submit-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      <ToastContainer position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/scan" element={<ScanAttendance />} />
      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
    </Routes>
  );
}
