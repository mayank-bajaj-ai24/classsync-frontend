// src/TeacherDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "./config";

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const token = localStorage.getItem("cs_token");
  const user = JSON.parse(localStorage.getItem("cs_user") || "{}");

  const [showStartClass, setShowStartClass] = useState(false);
  const [startForm, setStartForm] = useState({
    subjectCode: "",
    slotId: "",
  });
  const [activeSession, setActiveSession] = useState(null);
  const [toast, setToast] = useState("");

  const [showTimetable, setShowTimetable] = useState(false);
  const [showReports, setShowReports] = useState(false);

  const [showSelfStudyPanel, setShowSelfStudyPanel] = useState(false);
  const [selfStudyRequests, setSelfStudyRequests] = useState([]);
  const [selfStudyLoading, setSelfStudyLoading] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  const [showClassView, setShowClassView] = useState(false);
  const [classSubjectCode, setClassSubjectCode] = useState("");
  const [classView, setClassView] = useState(null);
  const [classLoading, setClassLoading] = useState(false);

  // teacher notifications + requests
  const [teacherNotifications, setTeacherNotifications] = useState([]);
  const [attendanceRequests, setAttendanceRequests] = useState([]);
  const [showAttendancePanel, setShowAttendancePanel] = useState(false);

  // at‑risk students
  const [atRiskData, setAtRiskData] = useState({ subjects: [], threshold: 75 });
  const [atRiskLoading, setAtRiskLoading] = useState(false);

  const [showManageTimetable, setShowManageTimetable] = useState(false);
  const [teacherSlots, setTeacherSlots] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [newSlotForm, setNewSlotForm] = useState({
    subjectCode: "",
    section: "",
    dayOfWeek: 1,
    startTime: "",
    endTime: "",
    roomNumber: "",
  });
  const [slotConflicts, setSlotConflicts] = useState([]);
  const dayLabels = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };

  // overview + initial at‑risk load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/teacher/overview/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setOverview(res.data);

        // once overview (and teacher.id) are available, load data
        if (res.data?.teacher?.id) {
          const teacherId = res.data.teacher.id;
          await fetchAtRisk(teacherId);
          await fetchAttendanceRequests(teacherId);
          await fetchSelfStudy(teacherId);
          await fetchTeacherNotifications(teacherId);
        }
      } catch (err) {
        console.error("Failed to load teacher dashboard", err);
      } finally {
        setLoading(false);
      }
    };

    if (token && user?.id) fetchData();
    else setLoading(false);
  }, [token, user?.id]);

  // NEW: teacher notifications
  const fetchTeacherNotifications = async (teacherId) => {
    try {
      const res = await axios.get(
        `${API_BASE}/teacher/notifications/${teacherId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTeacherNotifications(res.data || []);
    } catch (err) {
      console.error("Teacher notifications fetch error", err);
    }
  };

  // NEW: attendance correction requests
  const fetchAttendanceRequests = async (teacherId) => {
    try {
      const res = await axios.get(
        `${API_BASE}/teacher/requests/${teacherId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAttendanceRequests(res.data || []);
    } catch (err) {
      console.error("Teacher attendance requests fetch error", err);
      setAttendanceRequests([]);
    }
  };

  // UPDATED: allow optional teacherIdOverride
  const fetchSelfStudy = async (teacherIdOverride) => {
    const teacherId = teacherIdOverride || user?.id;
    if (!teacherId) return;
    setSelfStudyLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/teacher/self-study/${teacherId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSelfStudyRequests(res.data || []);
    } catch (err) {
      console.error("Teacher self-study list error", err);
      setSelfStudyRequests([]);
      setToast("Failed to load self-study requests.");
    } finally {
      setSelfStudyLoading(false);
    }
  };

  const fetchClassView = async (subjectCode) => {
    if (!subjectCode || !overview?.teacher?.id) {
      setClassView(null);
      return;
    }
    setClassLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/teacher/subject-attendance/${overview.teacher.id}/${subjectCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setClassView(res.data);
    } catch (err) {
      console.error("Class view error", err);
      setClassView(null);
      setToast("Failed to load class attendance.");
    } finally {
      setClassLoading(false);
    }
  };

  const fetchAtRisk = async (teacherIdOverride) => {
    const teacherId = teacherIdOverride || overview?.teacher?.id;
    if (!teacherId) return;
    setAtRiskLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/teacher/at-risk/${teacherId}?threshold=75`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAtRiskData(res.data || { subjects: [], threshold: 75 });
    } catch (err) {
      console.error("At-risk load error", err);
      setAtRiskData({ subjects: [], threshold: 75 });
    } finally {
      setAtRiskLoading(false);
    }
  };

  const fetchTeacherTimetable = async () => {
    if (!overview?.teacher?.id) return;
    setTimetableLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/teacher/timetable/${overview.teacher.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTeacherSlots(res.data || []);
    } catch (err) {
      console.error("Teacher timetable load error", err);
      setTeacherSlots([]);
      setToast("Failed to load timetable.");
    } finally {
      setTimetableLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cs_token");
    localStorage.removeItem("cs_role");
    localStorage.removeItem("cs_user");
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="cs-dash-root">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!overview || !overview.teacher) {
    return (
      <div className="cs-dash-root">
        <header className="cs-dash-header">
          <div>
            <h1 className="cs-dash-title">
              Welcome back, {user.name || "Teacher"}
            </h1>
            <p className="cs-dash-caption">
              Live class sessions and attendance overview.
            </p>
          </div>
          
          <div className="cs-dash-right">
            <button className="cs-q-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <p className="cs-panel-empty">
          Could not load dashboard data. Please check the backend or try again.
        </p>
      </div>
    );
  }

  const { teacher, todaySlots, recentSessions } = overview;

  // initials for avatar circle
  const initials = teacher.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="cs-dash-root">
      {toast && <div className="cs-mark-banner">{toast}</div>}

            {/* Header */}
      <header className="cs-dash-header">
        <div>
          <h1 className="cs-dash-title">Welcome back, {teacher.name}</h1>
          <p className="cs-dash-caption">
            Live attendance and timetable overview for this semester.
          </p>
        </div>

        <div className="cs-dash-right">
          <span className="cs-dash-badge">
            {teacher.department || "Dept"}
          </span>
          <span className="cs-dash-badge">
            {teacher.designation || "Professor"}
          </span>

          <div className="cs-profile-pill">
            <div className="cs-profile-avatar">{initials}</div>
            <div className="cs-profile-text">
              <div className="cs-profile-name">{teacher.name}</div>
            </div>
          </div>

          {/* Notification bell */}
          <button
  className="cs-q-btn"
  type="button"
  onClick={() => {
    setShowNotificationsPanel(true);
  }}
>
  🔔 {teacherNotifications.filter((n) => !n.isRead).length || ""}
</button>


          <button className="cs-q-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>


      {/* Quick actions */}
      <section className="cs-quick-actions">
        <button
          className="cs-q-btn cs-q-primary"
          onClick={() => setShowStartClass(true)}
        >
          Start Class &amp; Generate QR
        </button>
        <button
          className="cs-q-btn"
          onClick={() => setShowTimetable(true)}
        >
          View Today&apos;s Timetable
        </button>
        <button
          className="cs-q-btn"
          onClick={() => setShowReports(true)}
        >
          Attendance Reports
        </button>
        <button
          className="cs-q-btn"
          onClick={async () => {
            setShowSelfStudyPanel(true);
            await fetchSelfStudy();
          }}
        >
          Self‑Study Requests
        </button>
        <button
          className="cs-q-btn"
          onClick={async () => {
            await fetchAttendanceRequests(overview.teacher.id);
            setShowAttendancePanel(true);
          }}
        >
          Attendance Requests
        </button>
        <button
          className="cs-q-btn"
          onClick={() => {
            setShowClassView(true);
          }}
        >
          Class Attendance
        </button>
        <button
          className="cs-q-btn"
          onClick={async () => {
            await fetchTeacherTimetable();
            setShowManageTimetable(true);
          }}
        >
          Manage Timetable
        </button>
      </section>

      {/* At-risk students panel – auto-loaded and improved layout */}
      <section className="cs-dash-grid">
        <div className="cs-panel">
          <div className="cs-panel-header-row">
            <div>
              <h2 className="cs-panel-title">
                At‑risk students (below {atRiskData.threshold || 75}%)
              </h2>
              <p className="cs-panel-caption">
                Students whose subject attendance is below the safe limit.
              </p>
            </div>
            <button
              className="cs-q-btn cs-q-btn-small"
              type="button"
              onClick={() => fetchAtRisk()}
              disabled={atRiskLoading}
            >
              {atRiskLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {atRiskLoading ? (
            <p className="cs-panel-empty">Loading at‑risk data...</p>
          ) : atRiskData.subjects.length === 0 ? (
            <p className="cs-panel-empty">
              No students currently flagged as at‑risk based on attendance.
            </p>
          ) : (
            <div className="cs-at-risk-grid">
              {atRiskData.subjects.map((subj) => (
                <div key={subj.subjectId} className="cs-card cs-card-border">
                  <div className="cs-card-header">
                    <div>
                      <div className="cs-badge cs-badge-danger">
                        {subj.subjectCode}
                      </div>
                      <h4>{subj.subjectName}</h4>
                    </div>
                    <div className="cs-at-risk-count">
                      <span className="cs-at-risk-label">At‑risk</span>
                      <span className="cs-at-risk-value">
                        {subj.atRiskCount}{" "}
                        {subj.atRiskCount === 1 ? "student" : "students"}
                      </span>
                    </div>
                  </div>
                  <div className="cs-card-body">
                    {subj.students.map((stu) => (
                      <div
                        key={stu.id}
                        className="cs-at-risk-row cs-clickable-row"
                        onClick={async () => {
                          setClassSubjectCode(subj.subjectCode);
                          setShowClassView(true);
                          await fetchClassView(subj.subjectCode);
                        }}
                      >
                        <div className="cs-at-risk-main">
                          <div className="cs-at-risk-name">
                            {stu.name} ({stu.admissionNo})
                          </div>
                          <div className="cs-at-risk-percent">
                            {stu.percent.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Active session + live list + CSV */}
      {activeSession && (
        <>
          <section className="cs-panel" style={{ marginBottom: 16 }}>
            <h2 className="cs-panel-title">Active session</h2>
            <p className="cs-panel-empty">
              {activeSession.subjectName} ({activeSession.subjectCode}) •{" "}
              {activeSession.start} – {activeSession.end} •{" "}
              {activeSession.room}
            </p>
            <div className="cs-mark-box">
              <div
                className="cs-mark-qr"
                style={{ width: 300, height: 160 }}
              >
                <img
                  src={`https://quickchart.io/qr?text=${encodeURIComponent(
                    activeSession.qrToken
                  )}&size=160`}
                  alt="Attendance QR"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "8px",
                    background: "#fff",
                  }}
                />
                <div className="cs-stat-label" style={{ marginTop: 8 }}>
                  Token: {activeSession.qrToken}
                </div>
              </div>

              <div className="cs-mark-form">
                <div className="cs-stat-label">
                  Present: {activeSession.present}/{activeSession.total}
                </div>
                <div className="cs-mark-actions">
                  <button
                    className="cs-q-btn"
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await axios.get(
                          `${API_BASE}/teacher/session/${activeSession.id}`,
                          {
                            headers: { Authorization: `Bearer ${token}` },
                          }
                        );
                        const data = res.data;
                        setActiveSession((prev) => ({
                          ...prev,
                          present: data.presentCount,
                          presentStudents: data.presentStudents || [],
                        }));
                      } catch (err) {
                        console.error(
                          "Failed to refresh live session",
                          err
                        );
                        setToast("Failed to refresh live list.");
                      }
                    }}
                  >
                    View live list
                  </button>
                  <button
                    className="cs-q-btn cs-q-btn-circle"
                    type="button"
                    onClick={() => {
                      window.open(
                        `${API_BASE}/teacher/session/${activeSession.id}/export`,
                        "_blank"
                      );
                    }}
                  >
                    <span>CSV</span>
                  </button>

                  <button
                    className="cs-q-btn"
                    onClick={() => {
                      setActiveSession(null);
                      setToast("Session ended.");
                    }}
                  >
                    End session
                  </button>
                </div>
              </div>
            </div>
          </section>

          {activeSession.presentStudents &&
          activeSession.presentStudents.length > 0 ? (
            <section className="cs-panel" style={{ marginTop: 12 }}>
              <h3 className="cs-panel-title">Present students</h3>
              <ul className="cs-detail-list">
                {activeSession.presentStudents.map((s) => (
                  <li key={s.id} className="cs-detail-item">
                    <span>{s.admissionNo}</span>
                    <span>{s.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="cs-panel-empty" style={{ marginTop: 8 }}>
              No one has marked attendance yet or list not refreshed.
            </p>
          )}
        </>
      )}

      {/* Today’s classes */}
      <section className="cs-dash-grid">
        <div className="cs-panel">
          <h2 className="cs-panel-title">Today&apos;s classes</h2>
          {todaySlots.length === 0 ? (
            <p className="cs-panel-empty">No classes today.</p>
          ) : (
            <div className="cs-today-grid">
              {todaySlots.map((s) => (
                <div key={s.id} className="cs-today-card">
                  <div className="cs-today-main">
                    <span className="cs-today-subject">
                      {s.subjectName} ({s.subjectCode})
                    </span>
                    <span className="cs-today-time">
                      {s.start} – {s.end}
                    </span>
                  </div>
                  <div className="cs-today-sub">
                    {s.room} • {s.section}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Start class modal */}
      {showStartClass && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowStartClass(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">
              Start class &amp; generate QR
            </h2>
            <form
              className="cs-modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const slot = todaySlots.find(
                  (t) => String(t.id) === String(startForm.slotId)
                );
                const subj = teacher.subjects.find(
                  (s) => s.subjectCode === startForm.subjectCode
                );
                if (!slot || !subj) return;

                try {
                  let lat;
                  let lng;
                  if (navigator.geolocation) {
                    try {
                      const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                          resolve,
                          reject,
                          {
                            enableHighAccuracy: true,
                            timeout: 8000,
                          }
                        );
                      });
                      lat = pos.coords.latitude;
                      lng = pos.coords.longitude;
                    } catch {
                      // ignore geolocation failure
                    }
                  }

                  const res = await axios.post(
                    `${API_BASE}/teacher/start-session`,
                    {
                      subjectId: subj.id || subj._id,
                      section: slot.section,
                      roomNumber: slot.room,
                      lat,
                      lng,
                    },
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );
                  const session = res.data;
                  setActiveSession({
                    id: session._id,
                    subjectCode: subj.subjectCode,
                    subjectName: subj.subjectName,
                    start: slot.start,
                    end: slot.end,
                    room: slot.room,
                    qrToken: session.sessionCode,
                    present: session.presentStudents?.length || 0,
                    total: 60,
                    presentStudents: [],
                  });
                  setToast("Session started and QR generated.");
                  setShowStartClass(false);
                  setStartForm({ subjectCode: "", slotId: "" });
                } catch (err) {
                  console.error("Failed to start session", err);
                  setToast("Failed to start session.");
                }
              }}
            >
              <label className="cs-label">
                Subject
                <select
                  className="cs-input"
                  value={startForm.subjectCode}
                  onChange={(e) =>
                    setStartForm((f) => ({
                      ...f,
                      subjectCode: e.target.value,
                    }))
                  }
                >
                  <option value="">Select subject</option>
                  {teacher.subjects.map((s) => (
                    <option key={s.subjectCode} value={s.subjectCode}>
                      {s.subjectName} ({s.subjectCode})
                    </option>
                  ))}
                </select>
              </label>

              <label className="cs-label">
                Time slot
                <select
                  className="cs-input"
                  value={startForm.slotId}
                  onChange={(e) =>
                    setStartForm((f) => ({
                      ...f,
                      slotId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select slot</option>
                  {todaySlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.start} – {s.end} • {s.room} • {s.section}
                    </option>
                  ))}
                </select>
              </label>

              <div className="cs-modal-actions">
                <button
                  type="button"
                  className="cs-q-btn"
                  onClick={() => setShowStartClass(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cs-q-btn cs-q-primary"
                >
                  Start session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timetable modal (today only) */}
      {showTimetable && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowTimetable(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">Today&apos;s timetable</h2>
            {todaySlots.length === 0 ? (
              <p className="cs-panel-empty">No classes today.</p>
            ) : (
              <ul className="cs-today-list">
                {todaySlots.map((s) => (
                  <li key={s.id} className="cs-today-item">
                    <div className="cs-today-main">
                      <span className="cs-today-subject">
                        {s.subjectName} ({s.subjectCode})
                      </span>
                      <span className="cs-today-time">
                        {s.start} – {s.end}
                      </span>
                    </div>
                    <div className="cs-today-sub">
                      {s.room} • {s.section}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="cs-modal-actions">
              <button
                type="button"
                className="cs-q-btn"
                onClick={() => setShowTimetable(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports modal */}
      {showReports && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowReports(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">Attendance reports</h2>
            {recentSessions.length === 0 ? (
              <p className="cs-panel-empty">
                No sessions available yet to generate reports.
              </p>
            ) : (
              <ul className="cs-report-list cs-report-scroll">
                {recentSessions.map((s) => (
                  <li key={s.id} className="cs-report-row">
                    <div className="cs-report-main">
                      <span className="cs-report-title">
                        {s.subjectName} ({s.subjectCode}) • {s.section}
                      </span>
                      <span className="cs-report-sub">
                        {s.date} • Room {s.roomNumber || "-"}
                      </span>
                    </div>
                    <span className="cs-report-stat">
                      {s.present}/{s.total} ({s.percent.toFixed(1)}%)
                    </span>
                    <button
                      className="cs-q-btn cs-q-btn-circle-small"
                      type="button"
                      onClick={() =>
                        window.open(
                          `${API_BASE}/teacher/session/${s.id}/export`,
                          "_blank"
                        )
                      }
                    >
                      CSV
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="cs-modal-actions">
              <button
                type="button"
                className="cs-q-btn"
                onClick={() => setShowReports(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Self‑study requests modal */}
      {showSelfStudyPanel && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowSelfStudyPanel(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">Self‑study requests</h2>
            {selfStudyLoading ? (
              <p className="cs-panel-empty">Loading requests...</p>
            ) : selfStudyRequests.length === 0 ? (
              <p className="cs-panel-empty">
                No pending self‑study submissions.
              </p>
            ) : (
              <ul className="cs-detail-list">
                {selfStudyRequests.map((r) => (
                  <li key={r.id} className="cs-detail-item">
                    <div>
                      <strong>{r.studentName}</strong> ({r.admissionNo}) •{" "}
                      {r.subjectCode} • {r.date}
                    </div>
                    <div>{r.description}</div>
                    <div>
                      {r.fileUrl && (
                        <a
                          className="cs-link"
                          href={r.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open document
                        </a>
                      )}
                    </div>
                    <div className="cs-mark-actions">
                      <button
                        className="cs-q-btn"
                        type="button"
                        onClick={async () => {
                          try {
                            await axios.post(
                              `${API_BASE}/teacher/self-study/${r.id}/decision`,
                              { status: "approved", teacherNote: "" },
                              {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );
                            setSelfStudyRequests((prev) =>
                              prev.filter((x) => x.id !== r.id)
                            );
                            setToast(
                              `Approved self‑study for ${r.studentName}.`
                            );
                          } catch (err) {
                            console.error(
                              "Approve self-study error",
                              err
                            );
                            setToast("Failed to approve self‑study.");
                          }
                        }}
                      >
                        Approve &amp; give attendance
                      </button>
                      <button
                        className="cs-q-btn"
                        type="button"
                        onClick={async () => {
                          try {
                            await axios.post(
                              `${API_BASE}/teacher/self-study/${r.id}/decision`,
                              { status: "rejected", teacherNote: "" },
                              {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );
                            setSelfStudyRequests((prev) =>
                              prev.filter((x) => x.id !== r.id)
                            );
                            setToast(
                              `Rejected self‑study for ${r.studentName}.`
                            );
                          } catch (err) {
                            console.error(
                              "Reject self-study error",
                              err
                            );
                            setToast("Failed to reject self‑study.");
                          }
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="cs-modal-actions">
              <button
                type="button"
                className="cs-q-btn"
                onClick={() => setShowSelfStudyPanel(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Teacher notifications modal */}
{showNotificationsPanel && (
  <div
    className="cs-modal-backdrop"
    onClick={() => setShowNotificationsPanel(false)}
  >
    <div
      className="cs-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="cs-panel-title">Notifications</h2>

      {teacherNotifications.length === 0 ? (
        <p className="cs-panel-empty">No notifications.</p>
      ) : (
        <div
  className="cs-report-scroll"
  style={{
    maxHeight: 260,
    overflowY: "auto",
    paddingRight: 4,
  }}
>
  <ul className="cs-detail-list">
    {teacherNotifications.map((n) => (
      <li
        key={n.id}
        className="cs-detail-item"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "8px 10px",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            opacity: 0.9,
            marginBottom: 4,
          }}
        >
          {n.type === "attendance_request" && "Attendance correction request"}
          {n.type === "selfstudy_request" && "Self‑study submission"}
          {n.type === "attendance_decision" && "Attendance decision"}
          {n.type === "selfstudy_decision" && "Self‑study decision"}
          {(n.type === "general" ||
            n.type === "class_reminder" ||
            n.type === "low_attendance") &&
            n.title}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
          {n.message}
        </div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.6,
            marginTop: 4,
            alignSelf: "flex-end",
          }}
        >
          {new Date(n.createdAt).toLocaleString()}
        </div>
      </li>
    ))}
  </ul>
</div>

      )}

      <div className="cs-modal-actions">
        <button
          type="button"
          className="cs-q-btn"
          onClick={() => setShowNotificationsPanel(false)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}



      {/* Attendance correction requests modal */}
      {showAttendancePanel && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setShowAttendancePanel(false)}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">Attendance correction requests</h2>
            {attendanceRequests.length === 0 ? (
              <p className="cs-panel-empty">
                No pending attendance correction requests.
              </p>
            ) : (
              <ul className="cs-detail-list">
                {attendanceRequests.map((r) => (
                  <li key={r._id || r.id} className="cs-detail-item">
                    <div>
                      <strong>{r.student?.name}</strong> (
                      {r.student?.admissionNo}) • {r.subject?.code} •{" "}
                      {new Date(r.dateFrom).toISOString().slice(0, 10)} –{" "}
                      {new Date(r.dateTo).toISOString().slice(0, 10)}
                    </div>
                    <div>{r.reason}</div>
                    <div className="cs-mark-actions">
                      <button
                        className="cs-q-btn"
                        type="button"
                        onClick={async () => {
                          try {
                            await axios.post(
                              `${API_BASE}/teacher/requests/${r._id || r.id}/decision`,
                              { status: "approved", teacherNote: "" },
                              {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );
                            setAttendanceRequests((prev) =>
                              prev.filter(
                                (x) =>
                                  (x._id || x.id) !== (r._id || r.id)
                              )
                            );
                            setToast(
                              `Approved attendance request for ${r.student?.name}.`
                            );
                          } catch (err) {
                            console.error(
                              "Approve attendance request error",
                              err
                            );
                            setToast(
                              "Failed to approve attendance request."
                            );
                          }
                        }}
                      >
                        Approve
                      </button>
                      <button
                        className="cs-q-btn"
                        type="button"
                        onClick={async () => {
                          try {
                            await axios.post(
                              `${API_BASE}/teacher/requests/${r._id || r.id}/decision`,
                              { status: "rejected", teacherNote: "" },
                              {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );
                            setAttendanceRequests((prev) =>
                              prev.filter(
                                (x) =>
                                  (x._id || x.id) !== (r._id || r.id)
                              )
                            );
                            setToast(
                              `Rejected attendance request for ${r.student?.name}.`
                            );
                          } catch (err) {
                            console.error(
                              "Reject attendance request error",
                              err
                            );
                            setToast(
                              "Failed to reject attendance request."
                            );
                          }
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="cs-modal-actions">
              <button
                type="button"
                className="cs-q-btn"
                onClick={() => setShowAttendancePanel(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Manage timetable modal */}
      {showManageTimetable && (
        <div
          className="cs-modal-backdrop"
          onClick={() => {
            setShowManageTimetable(false);
            setSlotConflicts([]);
          }}
        >
          <div
            className="cs-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cs-panel-title">Manage timetable</h2>

            <p className="cs-panel-empty">
              Create new slots for your subjects. If a slot overlaps an
              existing class for the same section and day, you will see a
              conflict warning.
            </p>

            <form
              className="cs-modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setSlotConflicts([]);
                if (
                  !newSlotForm.subjectCode ||
                  !newSlotForm.section ||
                  !newSlotForm.startTime ||
                  !newSlotForm.endTime
                ) {
                  setToast("Please fill all required fields.");
                  return;
                }
                try {
                  const res = await axios.post(
                    `${API_BASE}/teacher/timetable/slot`,
                    {
                      teacherId: teacher.id,
                      subjectCode: newSlotForm.subjectCode,
                      section: newSlotForm.section,
                      dayOfWeek: Number(newSlotForm.dayOfWeek),
                      startTime: newSlotForm.startTime,
                      endTime: newSlotForm.endTime,
                      roomNumber: newSlotForm.roomNumber,
                    },
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );
                  const created = res.data;
                  setTeacherSlots((prev) => [...prev, created]);
                  setToast("Timetable slot created.");
                  setNewSlotForm((f) => ({
                    ...f,
                    section: "",
                    startTime: "",
                    endTime: "",
                    roomNumber: "",
                  }));
                } catch (err) {
                  console.error("Create timetable slot error", err);
                  const status = err.response?.status;
                  if (status === 409 && err.response?.data?.conflicts) {
                    setSlotConflicts(err.response.data.conflicts);
                    setToast(
                      "Slot conflict: please choose a different time or section."
                    );
                  } else {
                    const msg =
                      err.response?.data?.error ||
                      "Failed to create timetable slot.";
                    setToast(msg);
                  }
                }
              }}
            >
              <label className="cs-label">
                Subject
                <select
                  className="cs-input"
                  value={newSlotForm.subjectCode}
                  onChange={(e) =>
                    setNewSlotForm((f) => ({
                      ...f,
                      subjectCode: e.target.value,
                    }))
                  }
                >
                  <option value="">Select subject</option>
                  {teacher.subjects.map((s) => (
                    <option key={s.subjectCode} value={s.subjectCode}>
                      {s.subjectName} ({s.subjectCode})
                    </option>
                  ))}
                </select>
              </label>

              <label className="cs-label">
                Section
                <input
                  className="cs-input"
                  placeholder="e.g., 3A"
                  value={newSlotForm.section}
                  onChange={(e) =>
                    setNewSlotForm((f) => ({
                      ...f,
                      section: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="cs-label">
                Day
                <select
                  className="cs-input"
                  value={newSlotForm.dayOfWeek}
                  onChange={(e) =>
                    setNewSlotForm((f) => ({
                      ...f,
                      dayOfWeek: Number(e.target.value),
                    }))
                  }
                >
                  {Object.entries(dayLabels).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="cs-form-row">
                <label className="cs-label cs-label-inline">
                  Start time
                  <input
                    type="time"
                    className="cs-input"
                    value={newSlotForm.startTime}
                    onChange={(e) =>
                      setNewSlotForm((f) => ({
                        ...f,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="cs-label cs-label-inline">
                  End time
                  <input
                    type="time"
                    className="cs-input"
                    value={newSlotForm.endTime}
                    onChange={(e) =>
                      setNewSlotForm((f) => ({
                        ...f,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className="cs-label">
                Room number
                <input
                  className="cs-input"
                  placeholder="e.g., C-305"
                  value={newSlotForm.roomNumber}
                  onChange={(e) =>
                    setNewSlotForm((f) => ({
                      ...f,
                      roomNumber: e.target.value,
                    }))
                  }
                />
              </label>

              {slotConflicts.length > 0 && (
                <div className="cs-conflict-box">
                  <div className="cs-conflict-title">
                    Conflicting slots in this section:
                  </div>
                  <ul className="cs-detail-list">
                    {slotConflicts.map((c) => (
                      <li key={c.id} className="cs-detail-item">
                        <span>
                          {c.subjectName} ({c.subjectCode})
                        </span>
                        <span>
                          {c.startTime} – {c.endTime}
                        </span>
                        <span>
                          {c.section} • Room {c.roomNumber || "-"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="cs-modal-actions">
                <button
                  type="button"
                  className="cs-q-btn"
                  onClick={() => {
                    setShowManageTimetable(false);
                    setSlotConflicts([]);
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="cs-q-btn cs-q-primary"
                  disabled={timetableLoading}
                >
                  Add slot
                </button>
              </div>
            </form>

            <h3 className="cs-panel-title" style={{ marginTop: 24 }}>
              Your existing slots
            </h3>
            <div className="cs-tt-existing-scroll">
              {timetableLoading ? (
                <p className="cs-panel-empty">Loading timetable...</p>
              ) : teacherSlots.length === 0 ? (
                <p className="cs-panel-empty">
                  No timetable slots created yet.
                </p>
              ) : (
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Subject</th>
                      <th>Section</th>
                      <th>Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherSlots
                      .slice()
                      .sort((a, b) => {
                        if (a.dayOfWeek !== b.dayOfWeek) {
                          return a.dayOfWeek - b.dayOfWeek;
                        }
                        return a.startTime < b.startTime ? -1 : 1;
                      })
                      .map((s) => (
                        <tr key={s.id}>
                          <td>{dayLabels[s.dayOfWeek] || s.dayOfWeek}</td>
                          <td>
                            {s.startTime} – {s.endTime}
                          </td>
                          <td>
                            {s.subjectName} ({s.subjectCode})
                          </td>
                          <td>{s.section}</td>
                          <td>{s.roomNumber || "-"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
