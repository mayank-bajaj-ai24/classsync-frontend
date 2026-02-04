// src/ScanAttendance.jsx
import { Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";
import axios from "axios";
import { API_BASE } from "./config";

export default function ScanAttendance() {
  const [status, setStatus] = useState("");
  const [scanInProgress, setScanInProgress] = useState(false);

  const user = JSON.parse(localStorage.getItem("cs_user") || "{}");
  const studentId = user.id;

  const markWithCode = async (sessionCode) => {
    try {
      setStatus("Getting your location...");
      await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          resolve();
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await axios.post(`${API_BASE}/student/mark-attendance`, {
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
          async (geoErr) => {
            console.error("Geolocation error:", geoErr);
            try {
              await axios.post(`${API_BASE}/student/mark-attendance`, {
                studentId,
                sessionCode,
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });

      setStatus("Attendance marked.");
    } catch (err) {
      console.error("ScanAttendance mark error:", err);
      setStatus(
        err.response?.data?.error || err.message || "Failed to mark attendance."
      );
    }
  };

  const handleScan = async (results) => {
    if (!results || results.length === 0) return;
    if (scanInProgress) return;
    setScanInProgress(true);

    const sessionCode = results[0].rawValue;
    console.log("ScanAttendance sessionCode:", sessionCode);
    await markWithCode(sessionCode);
    setScanInProgress(false);
  };

  return (
    <div className="cs-dash-root">
      <h2 className="cs-panel-title">Scan class QR</h2>
      <Scanner
        onScan={handleScan}
        onError={(err) => {
          console.error("Scanner error:", err);
          setStatus("Scanner error.");
          setScanInProgress(false);
        }}
      />
      {status && <p className="cs-panel-empty">{status}</p>}
    </div>
  );
}
