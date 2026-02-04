// src/StudentDashboard.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Scanner } from "@yudiel/react-qr-scanner";
import { API_BASE } from "./config";

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);

  const token = localStorage.getItem("cs_token");
  const storedUser = localStorage.getItem("cs_user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    type: "medical",
    subjectCode: "",
    date: "",
    notes: "",
  });
  const [correctionRequests, setCorrectionRequests] = useState([]);

  const [showToday, setShowToday] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [showMark, setShowMark] = useState(false);
  const [markSubject, setMarkSubject] = useState("");
  const [markMessage, setMarkMessage] = useState("");

  const [toasts, setToasts] = useState([]);

  const [subjectHistory, setSubjectHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [currentClass, setCurrentClass] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [scanInProgress, setScanInProgress] = useState(false);

  const [showSelfStudy, setShowSelfStudy] = useState(false);
  const [selfStudyForm, setSelfStudyForm] = useState({
    subjectCode: "",
    date: "",
    description: "",
    fileUrl: "",
  });
  const [selfStudyList, setSelfStudyList] = useState([]);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [showFullTimetable, setShowFullTimetable] = useState(false);
  const [weeklyTimetable, setWeeklyTimetable] = useState(null);
  const [timetableLoading, setTimetableLoading] = useState(false);

  // NEW: color band helper – green >= 75, red < 75
  const getBandClass = (p) => {
    if (p == null || Number.isNaN(p)) return "";
    return p < 75 ? "cs-attn-red" : "cs-attn-green";
  };

  function pushToast({ type = "info", title, message }) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(
        `${API_BASE}/student/notifications/${user.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  // full weekly timetable (with localStorage cache)
  const fetchWeeklyTimetable = async () => {
    if (!overview?.student?.section) return;

    const section = overview.student.section;
    const cacheKey = `cs_timetable_cache_${section}`;

    setTimetableLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/student/timetable/${encodeURIComponent(section)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = res.data || {};
      setWeeklyTimetable(data);
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err) {
      console.error("Weekly timetable load error", err);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setWeeklyTimetable(JSON.parse(cached));
        pushToast({
          type: "info",
          title: "Offline timetable",
          message: "Showing last saved timetable copy.",
        });
      } else {
        setWeeklyTimetable(null);
        pushToast({
          type: "error",
          title: "Timetable error",
          message: "Could not load timetable for your section.",
        });
      }
    } finally {
      setTimetableLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) overview
        const res = await axios.get(
          `${API_BASE}/student/overview/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = res.data;
        setOverview(data);

        if (data.subjects.length > 0) {
          setMarkSubject(data.subjects[0].subjectCode);
          setSelfStudyForm((f) => ({
            ...f,
            subjectCode: data.subjects[0].subjectCode,
          }));
        }

        // current class
        const now = new Date();
        const nowStr = now.toTimeString().slice(0, 5);
        const todays = data.todaySchedule || [];
        const running = todays.find(
          (c) => c.start <= nowStr && nowStr <= c.end
        );
        if (running) {
          setCurrentClass(running);
          setMarkSubject(running.subjectCode);
        } else {
          setCurrentClass(null);
        }

        // 2) correction requests
        const reqRes = await axios.get(
          `${API_BASE}/student/attendance-requests/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const mapped = (reqRes.data || []).map((r) => ({
          id: r._id,
          type: r.type,
          typeLabel:
            r.type === "medical"
              ? "Medical"
              : r.type === "event"
              ? "Event"
              : "General",
          subjectCode: r.subject?.code || r.subjectCode || "",
          date: r.dateFrom
            ? new Date(r.dateFrom).toISOString().slice(0, 10)
            : r.createdAt
            ? new Date(r.createdAt).toISOString().slice(0, 10)
            : "",
          notes: r.reason || "",
          status: r.status || "Pending",
        }));
        setCorrectionRequests(mapped);

        // 3) self‑study submissions
        const ssRes = await axios.get(
          `${API_BASE}/student/self-study/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSelfStudyList(ssRes.data || []);

        // 4) notifications
        await fetchNotifications();
      } catch (err) {
        console.error("Failed to load student dashboard", err);
      } finally {
        setLoading(false);
      }
    };

    if (token && user?.id) fetchData();
    else setLoading(false);
  }, [token, user?.id]);

  if (!token) {
    return (
      <div className="cs-dash-root">
        <p>Please sign in again.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cs-dash-root">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="cs-dash-root">
        <p>Could not load student data.</p>
      </div>
    );
  }

  const { student, priorityAlerts, subjects, quickStats, todaySchedule } =
    overview;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const dayLabels = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };

  return (
    <div className="cs-dash-root">
      {/* Toast stack */}
      <div className="cs-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`cs-toast cs-toast-${t.type}`}>
            {t.title && <div className="cs-toast-title">{t.title}</div>}
            <div className="cs-toast-message">{t.message}</div>
            <button
              className="cs-toast-close"
              onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="cs-dash-header">
        <div>
          <h1 className="cs-dash-title">Welcome back, {student.name}</h1>
          <p className="cs-dash-caption">
            Live attendance and timetable overview for this semester.
          </p>
        </div>

        <div className="cs-dash-right">
          <div className="cs-dash-badges">
            <span className="cs-dash-badge">USN {student.admissionNo}</span>
            <span className="cs-dash-badge">
              {student.department} • Sem {student.semester} • Sec{" "}
              {student.section}
            </span>
          </div>

          {/* Notification bell */}
          <button
            className="cs-q-btn cs-bell-btn"
            type="button"
            onClick={async () => {
              await fetchNotifications();
              setShowNotifications(true);
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span className="cs-bell-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <div className="cs-profile-chip">
            <div className="cs-profile-avatar">
              {student.name?.[0] || "S"}
            </div>
            <div className="cs-profile-meta">
              <div className="cs-profile-name">{student.name}</div>
              <div className="cs-profile-role">Student</div>
            </div>
          </div>
          <button
            className="cs-q-btn"
            onClick={() => {
              localStorage.removeItem("cs_token");
              localStorage.removeItem("cs_role");
              localStorage.removeItem("cs_user");
              window.location.href = "/";
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Mark attendance banner */}
      {markMessage && <div className="cs-mark-banner">{markMessage}</div>}

      {/* Quick actions */}
      <section className="cs-quick-actions">
        <button
          className="cs-q-btn cs-q-primary"
          onClick={() => setShowMark(true)}
        >
          Mark Attendance
        </button>
        <button
          className="cs-q-btn"
          onClick={() => setShowCorrection(true)}
        >
          Request Attendance Correction
        </button>
        <button
          className="cs-q-btn"
          onClick={() => setShowSelfStudy(true)}
        >
          Submit Self‑Study
        </button>
        <button
          className="cs-q-btn"
          onClick={() => setShowToday(true)}
        >
          View Today&apos;s Schedule
        </button>
        <button
          className="cs-q-btn"
          onClick={async () => {
            await fetchWeeklyTimetable();
            setShowFullTimetable(true);
          }}
        >
          View Full Timetable
        </button>
      </section>

      {/* Main grid: alerts + subjects */}
      <section className="cs-dash-grid">
        <div className="cs-panel">
          <h2 className="cs-panel-title">Priority alerts</h2>
          {priorityAlerts.length === 0 ? (
            <p className="cs-panel-empty">No critical alerts right now.</p>
          ) : (
            <ul className="cs-alert-list">
              {priorityAlerts.map((a) => (
                <li
                  key={a.id}
                  className={`cs-alert-item cs-alert-${a.type}`}
                >
                  <div className="cs-alert-main">{a.title}</div>
                  <div className="cs-alert-sub">{a.description}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cs-panel">
          <h2 className="cs-panel-title">Subjects overview</h2>
          {subjects.length === 0 ? (
            <p className="cs-panel-empty">No subjects linked yet.</p>
          ) : (
            <div className="cs-subject-grid">
              {subjects.map((s) => (
                <div
                  key={s.subjectCode}
                  className={`cs-subject-card ${getBandClass(
                    s.attendancePercent
                  )}`}
                  onClick={async () => {
                    setSelectedSubject(s);
                    setHistoryLoading(true);
                    try {
                      const res = await axios.get(
                        `${API_BASE}/student/subject-history/${student.id}/${s.subjectCode}`,
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      );
                      setSubjectHistory(res.data.history || []);
                    } catch (err) {
                      console.error("History load failed", err);
                      setSubjectHistory([]);
                    } finally {
                      setHistoryLoading(false);
                    }
                  }}
                >
                  <div className="cs-subject-header">
                    <span className="cs-subject-name">
                      {s.subjectName}
                    </span>
                    <span className="cs-subject-code">
                      {s.subjectCode}
                    </span>
                  </div>
                  <div
                    className={`cs-subject-percent ${getBandClass(
                      s.attendancePercent
                    )}`}
                  >
                    {s.attendancePercent.toFixed(1)}%
                  </div>
                  <div className="cs-progress-track">
                    <div
                      className="cs-progress-fill"
                      style={{
                        width: `${Math.min(100, s.attendancePercent)}%`,
                      }}
                    />
                  </div>
                  <div className="cs-subject-footer cs-subject-footer-col">
                    <span>Last attended: {s.lastAttended || "—"}</span>
                    <span>{s.classesNeededText}</span>
                    <span>
                      Classes: {s.classesPresent}/{s.classesHeld}
                    </span>
                    <span>
                      This month: {s.classesThisMonth} classes
                    </span>
                    <span>Streak: {s.streakDays} days</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Global stats row */}
      <section className="cs-stats-row">
        <div className="cs-stat-card">
          <div className="cs-stat-label">Overall attendance</div>
          <div
            className={`cs-stat-value ${getBandClass(
              quickStats.overallAttendance
            )}`}
          >
            {quickStats.overallAttendance.toFixed(1)}%
          </div>
        </div>
        <div className="cs-stat-card">
          <div className="cs-stat-label">Classes (all subjects)</div>
          <div className="cs-stat-value">
            {quickStats.classesAttended}/{quickStats.classesHeld}
          </div>
        </div>
        <div className="cs-stat-card">
          <div className="cs-stat-label">Streak</div>
          <div className="cs-stat-value">
            {quickStats.streakDays} days
          </div>
        </div>
      </section>

      {/* Self‑study submissions list */}
      <section className="cs-panel">
        <h2 className="cs-panel-title">Self‑study submissions</h2>
        {selfStudyList.length === 0 ? (
          <p className="cs-panel-empty">
            You have not submitted any self‑study yet.
          </p>
        ) : (
          <ul className="cs-detail-list">
            {selfStudyList.map((s) => (
              <li key={s.id} className="cs-detail-item">
                <span>
                  {s.date} • {s.subjectCode}
                </span>
                <span>{s.description}</span>
                <span>
                  Status: {s.status}
                  {s.teacherNote ? ` • Note: ${s.teacherNote}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Correction requests list */}
      <section className="cs-panel cs-corr-list">
        <h2 className="cs-panel-title">
          Attendance correction requests
        </h2>
        {correctionRequests.length === 0 ? (
          <p className="cs-panel-empty">
            You have not submitted any correction requests yet.
          </p>
        ) : (
          <ul className="cs-corr-items">
            {correctionRequests.map((r) => (
              <li key={r.id} className="cs-corr-item">
                <div className="cs-corr-main">
                  <span className="cs-corr-pill">{r.typeLabel}</span>
                  <span>{r.subjectCode}</span>
                  <span>{r.date}</span>
                </div>
                <div className="cs-corr-sub">
                  Status: {r.status} • {r.notes || "No notes"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Correction modal */}
      {showCorrection && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowCorrection(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">
              Request attendance correction
            </h2>
            <form
              className="cs-modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const subj =
                    subjects.find(
                      (s) =>
                        s.subjectCode === correctionForm.subjectCode
                    ) || subjects[0];

                  const body = {
                    studentId: student.id,
                    subjectId: subj?.subjectId,
                    type: correctionForm.type,
                    reason: correctionForm.notes,
                    dateFrom: correctionForm.date || undefined,
                    dateTo: correctionForm.date || undefined,
                  };

                  const res = await axios.post(
                    `${API_BASE}/student/attendance-request`,
                    body,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );
                  const r = res.data;
                  const mapped = {
                    id: r._id,
                    type: r.type,
                    typeLabel:
                      r.type === "medical"
                        ? "Medical"
                        : r.type === "event"
                        ? "Event"
                        : "General",
                    subjectCode: subj?.subjectCode || "",
                    date: correctionForm.date || "",
                    notes: r.reason || "",
                    status: r.status || "Pending",
                  };

                  setCorrectionRequests((prev) => [mapped, ...prev]);
                  pushToast({
                    type: "success",
                    title: "Request submitted",
                    message:
                      "Attendance correction request created.",
                  });
                } catch (err) {
                  console.error("Attendance request error", err);
                  const msg =
                    err.response?.data?.error ||
                    "Failed to submit correction request.";
                  pushToast({
                    type: "error",
                    title: "Error",
                    message: msg,
                  });
                } finally {
                  setShowCorrection(false);
                  setCorrectionForm({
                    type: "medical",
                    subjectCode: "",
                    date: "",
                    notes: "",
                  });
                }
              }}
            >
              <label className="cs-label">
                Request type
                <select
                  className="cs-input"
                  value={correctionForm.type}
                  onChange={(e) =>
                    setCorrectionForm({
                      ...correctionForm,
                      type: e.target.value,
                    })
                  }
                >
                  <option value="medical">Medical Leave</option>
                  <option value="event">College Event</option>
                  <option value="general">General / Other</option>
                </select>
              </label>

              <label className="cs-label">
                Subject code
                <input
                  type="text"
                  className="cs-input"
                  placeholder="e.g., IS233AI"
                  value={correctionForm.subjectCode}
                  onChange={(e) =>
                    setCorrectionForm({
                      ...correctionForm,
                      subjectCode: e.target.value,
                    })
                  }
                />
              </label>

              <label className="cs-label">
                Date of class
                <input
                  type="date"
                  className="cs-input"
                  value={correctionForm.date}
                  onChange={(e) =>
                    setCorrectionForm({
                      ...correctionForm,
                      date: e.target.value,
                    })
                  }
                />
              </label>

              <label className="cs-label">
                Notes / reason
                <textarea
                  className="cs-input cs-textarea"
                  placeholder="Short explanation..."
                  value={correctionForm.notes}
                  onChange={(e) =>
                    setCorrectionForm({
                      ...correctionForm,
                      notes: e.target.value,
                    })
                  }
                />
              </label>

              <div className="cs-modal-actions">
                <button
                  type="button"
                  className="cs-q-btn"
                  onClick={() => setShowCorrection(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cs-q-btn cs-q-primary"
                >
                  Submit request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Self‑study modal */}
      {showSelfStudy && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowSelfStudy(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">Submit self‑study</h2>
            <form
              className="cs-modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (
                    !selfStudyForm.subjectCode ||
                    !selfStudyForm.date
                  ) {
                    pushToast({
                      type: "error",
                      title: "Missing fields",
                      message:
                        "Please select subject and date for self‑study.",
                    });
                    return;
                  }

                  const res = await axios.post(
                    `${API_BASE}/student/self-study`,
                    {
                      studentId: student.id,
                      subjectCode: selfStudyForm.subjectCode,
                      date: selfStudyForm.date,
                      description: selfStudyForm.description,
                      fileUrl: selfStudyForm.fileUrl,
                    },
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );

                  const s = res.data;
                  setSelfStudyList((prev) => [
                    {
                      id: s._id,
                      subjectCode: selfStudyForm.subjectCode,
                      subjectName: "",
                      date: selfStudyForm.date,
                      description: selfStudyForm.description,
                      fileUrl: selfStudyForm.fileUrl,
                      status: s.status || "pending",
                      teacherNote: "",
                    },
                    ...prev,
                  ]);
                  pushToast({
                    type: "success",
                    title: "Submitted",
                    message:
                      "Self‑study submission sent to your teacher.",
                  });
                  setSelfStudyForm({
                    subjectCode:
                      selfStudyForm.subjectCode ||
                      (subjects[0]?.subjectCode || ""),
                    date: "",
                    description: "",
                    fileUrl: "",
                  });
                  setShowSelfStudy(false);
                } catch (err) {
                  console.error("Self‑study submit error", err);
                  const msg =
                    err.response?.data?.error ||
                    "Failed to submit self‑study.";
                  pushToast({
                    type: "error",
                    title: "Error",
                    message: msg,
                  });
                }
              }}
            >
              <label className="cs-label">
                Subject
                <select
                  className="cs-input"
                  value={selfStudyForm.subjectCode}
                  onChange={(e) =>
                    setSelfStudyForm((f) => ({
                      ...f,
                      subjectCode: e.target.value,
                    }))
                  }
                >
                  <option value="">Select subject</option>
                  {subjects.map((s) => (
                    <option
                      key={s.subjectCode}
                      value={s.subjectCode}
                    >
                      {s.subjectName} ({s.subjectCode})
                    </option>
                  ))}
                </select>
              </label>

              <label className="cs-label">
                Date
                <input
                  type="date"
                  className="cs-input"
                  value={selfStudyForm.date}
                  onChange={(e) =>
                    setSelfStudyForm((f) => ({
                      ...f,
                      date: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="cs-label">
                Description
                <textarea
                  className="cs-input cs-textarea"
                  placeholder="What did you study or complete?"
                  value={selfStudyForm.description}
                  onChange={(e) =>
                    setSelfStudyForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="cs-label">
                Document link
                <input
                  type="text"
                  className="cs-input"
                  placeholder="Paste Drive / PDF link (optional)"
                  value={selfStudyForm.fileUrl}
                  onChange={(e) =>
                    setSelfStudyForm((f) => ({
                      ...f,
                      fileUrl: e.target.value,
                    }))
                  }
                />
              </label>

              <div className="cs-modal-actions">
                <button
                  type="button"
                  className="cs-q-btn"
                  onClick={() => setShowSelfStudy(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cs-q-btn cs-q-primary"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark attendance modal – UPDATED for single scan per token */}
      {showMark && (
        <div
          className="cs-modal-backdrop"
          onClick={() => {
            setShowMark(false);
            setScanning(false);
            setScanInProgress(false);
          }}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">Mark attendance</h2>
            <p className="cs-panel-empty">
              Scan the QR code shown by your teacher to mark attendance.
            </p>

            <div className="cs-mark-box">
              <div className="cs-mark-qr">
                {scanning ? (
                  <Scanner
                    onScan={async (results) => {
                      if (!results || results.length === 0) return;
                      if (scanInProgress) return;

                      const raw = results[0].rawValue;
                      if (!raw) return;

                      // prevent processing same QR multiple times in this modal open
                      if (!window.__csUsedQrTokens) {
                        window.__csUsedQrTokens = new Set();
                      }
                      if (window.__csUsedQrTokens.has(raw)) {
                        return;
                      }
                      window.__csUsedQrTokens.add(raw);

                      setScanInProgress(true);

                      const sessionCode = raw;
                      const subjectCode = currentClass
                        ? currentClass.subjectCode
                        : markSubject;

                      const subj = subjects.find(
                        (s) => s.subjectCode === subjectCode
                      );
                      const label = subj?.subjectName || subjectCode;

                      try {
                        const studentId = user.id;

                        const markCall = async (body) => {
                          await axios.post(
                            `${API_BASE}/student/mark-attendance`,
                            body,
                            {
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            }
                          );
                        };

                        if (navigator.geolocation) {
                          await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(
                              async (pos) => {
                                try {
                                  await markCall({
                                    studentId,
                                    sessionCode,
                                    lat: pos.coords.latitude,
                                    lng: pos.coords.longitude,
                                  });
                                  resolve();
                                } catch (e) {
                                  reject(e);
                                }
                              },
                              async () => {
                                try {
                                  await markCall({
                                    studentId,
                                    sessionCode,
                                  });
                                  resolve();
                                } catch (e) {
                                  reject(e);
                                }
                              },
                              {
                                enableHighAccuracy: true,
                                timeout: 8000,
                              }
                            );
                          });
                        } else {
                          await markCall({ studentId, sessionCode });
                        }

                        const res2 = await axios.get(
                          `${API_BASE}/student/overview/${user.id}`,
                          {
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          }
                        );
                        setOverview(res2.data);
                        setMarkMessage(
                          `Attendance marked for ${label}.`
                        );
                        pushToast({
                          type: "success",
                          title: "Attendance marked",
                          message: `${label} marked as present.`,
                        });
                        setScanning(false);
                        setShowMark(false);
                      } catch (err) {
                        console.error(
                          "QR mark attendance failed",
                          err
                        );
                        const msg =
                          err.response?.data?.error ||
                          err.message ||
                          "Failed to mark attendance.";
                        pushToast({
                          type: "error",
                          title: "Error",
                          message: msg,
                        });
                        setScanning(false);
                      } finally {
                        setScanInProgress(false);
                      }
                    }}
                    onError={(err) => {
                      console.error("Scanner error", err);
                      pushToast({
                        type: "error",
                        title: "Scanner error",
                        message: "Could not access camera.",
                      });
                      setScanning(false);
                      setScanInProgress(false);
                    }}
                  />
                ) : (
                  <div className="cs-panel-empty">
                    Tap &quot;Start QR scan&quot; to open camera.
                  </div>
                )}
              </div>

              <div className="cs-mark-form">
                {!currentClass && (
                  <label className="cs-label">
                    Subject
                    <select
                      className="cs-input"
                      value={markSubject}
                      onChange={(e) => setMarkSubject(e.target.value)}
                    >
                      {subjects.map((s) => (
                        <option
                          key={s.subjectCode}
                          value={s.subjectCode}
                        >
                          {s.subjectName} ({s.subjectCode})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  className="cs-q-btn cs-q-primary"
                  onClick={() => {
                    setScanning(true);
                    setScanInProgress(false);
                    // reset used tokens for this scanning session
                    window.__csUsedQrTokens = new Set();
                  }}
                  disabled={scanning}
                >
                  {scanning ? "Scanning..." : "Start QR scan"}
                </button>
              </div>
            </div>

            <div className="cs-modal-actions">
              <button
                type="button"
                className="cs-q-btn"
                onClick={() => {
                  setShowMark(false);
                  setScanning(false);
                  setScanInProgress(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today’s schedule modal */}
      {showToday && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowToday(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">
              Today&apos;s schedule
            </h2>
            {todaySchedule && todaySchedule.length > 0 ? (
              <ul className="cs-today-list">
                {todaySchedule.map((c) => (
                  <li key={c.id} className="cs-today-item">
                    <div className="cs-today-main">
                      <span className="cs-today-subject">
                        {c.subjectName}
                      </span>
                      <span className="cs-today-time">
                        {c.start} – {c.end}
                      </span>
                    </div>
                    <div className="cs-today-sub">
                      {c.room} • {c.teacher}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cs-panel-empty">
                No classes scheduled for today.
              </p>
            )}
            <div className="cs-modal-actions">
              <button
                type="button"
                className="cs-q-btn"
                onClick={() => setShowToday(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject detail modal */}
      {selectedSubject && (
  <div
    className="cs-modal-backdrop"
    onClick={() => setSelectedSubject(null)}
  >
    <div
      className="cs-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="cs-panel-title">
        {selectedSubject.subjectName} ({selectedSubject.subjectCode})
      </h2>

      {/* make this area scrollable */}
      <div
        className="cs-detail-scroll"
        style={{
          maxHeight: 400,
          overflowY: "auto",
          paddingRight: 4,
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        {historyLoading ? (
          <p className="cs-panel-empty">Loading history...</p>
        ) : subjectHistory.length === 0 ? (
          <p className="cs-panel-empty">
            No classes recorded yet for this subject.
          </p>
        ) : (
          <ul className="cs-detail-list">
            {subjectHistory.map((h) => (
              <li key={h.id} className="cs-detail-item">
                <span>{h.date || "—"}</span>
                <span>{h.status}</span>
                <span>{h.topic || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cs-modal-actions">
        <button
          type="button"
          className="cs-q-btn"
          onClick={() => setSelectedSubject(null)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {/* Notifications modal */}
      {showNotifications && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">Notifications</h2>

            {notifications.length === 0 ? (
              <p className="cs-panel-empty">
                No notifications right now.
              </p>
            ) : (
              <ul className="cs-detail-list cs-notif-list cs-notif-scroll">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`cs-detail-item cs-notif-item ${
                      n.isRead ? "cs-notif-read" : "cs-notif-unread"
                    }`}
                  >
                    <div className="cs-notif-main">
                      <span className="cs-notif-title">
                        {n.title}
                      </span>
                      <span className="cs-notif-time">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="cs-notif-message">
                      {n.message}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="cs-modal-actions">
              <button
                type="button"
                className="cs-q-btn"
                onClick={async () => {
                  try {
                    const ids = notifications
                      .filter((n) => !n.isRead)
                      .map((n) => n.id);
                    if (ids.length > 0) {
                      await axios.patch(
                        `${API_BASE}/student/notifications/mark-read`,
                        { notificationIds: ids },
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );
                      setNotifications((prev) =>
                        prev.map((n) =>
                          ids.includes(n.id)
                            ? { ...n, isRead: true }
                            : n
                        )
                      );
                    }
                  } catch (err) {
                    console.error(
                      "Mark notifications read error",
                      err
                    );
                  } finally {
                    setShowNotifications(false);
                  }
                }}
              >
                Mark all read & close
              </button>
              <button
                type="button"
                className="cs-q-btn"
                onClick={() => setShowNotifications(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full weekly timetable modal */}
      {showFullTimetable && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowFullTimetable(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">
              Weekly timetable – Section {student.section}
            </h2>

            <div className="cs-modal-content-scroll">
              {timetableLoading ? (
                <p className="cs-panel-empty">
                  Loading timetable...
                </p>
              ) : !weeklyTimetable ? (
                <p className="cs-panel-empty">
                  Timetable not available for your section.
                </p>
              ) : (
                <div className="cs-timetable-grid">
                  {Object.keys(dayLabels).map((dKey) => {
                    const dayNum = Number(dKey);
                    const slots = weeklyTimetable[dayNum] || [];
                    if (dayNum === 0 && slots.length === 0) {
                      return null;
                    }
                    return (
                      <div
                        key={dKey}
                        className="cs-timetable-day"
                      >
                        <h3 className="cs-timetable-day-title">
                          {dayLabels[dayNum]}
                        </h3>
                        {slots.length === 0 ? (
                          <p className="cs-panel-empty">
                            No classes.
                          </p>
                        ) : (
                          <ul className="cs-timetable-list">
                            {slots.map((s) => (
                              <li
                                key={s.id}
                                className="cs-timetable-item"
                              >
                                <div className="cs-timetable-main">
                                  <span className="cs-timetable-subject">
                                    {s.subjectName} ({s.subjectCode})
                                  </span>
                                  <span className="cs-timetable-time">
                                    {s.startTime} – {s.endTime}
                                  </span>
                                </div>
                                <div className="cs-timetable-sub">
                                  Room {s.roomNumber || "-"}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="cs-modal-actions">
              {/* static image download from public */}
              <a
                href="/aiml-02-timetable.png"
                download
                className="cs-q-btn cs-q-primary"
              >
                Download official timetable
              </a>
              <button
                type="button"
                className="cs-q-btn"
                onClick={() => setShowFullTimetable(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
