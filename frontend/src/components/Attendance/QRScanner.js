// ============================================================
// QRScanner.js - Student scans QR code to mark attendance
// ------------------------------------------------------------
// Uses the device camera to scan a QR code.
// Decodes the JSON embedded in the QR, then calls the API
// to mark the student's attendance.
// ============================================================
import React, { useState, useRef } from "react";
import { attendanceAPI } from "../../utils/api";

const QRScanner = ({ onSuccess, onClose }) => {
  const [manualInput, setManualInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Method 1: Manual input (paste QR data as text — for testing)
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const qrData = JSON.parse(manualInput);
      const data = await attendanceAPI.markAttendance({
        sessionId: qrData.sessionId,
        sessionToken: qrData.sessionToken,
      });
      onSuccess(data.record);
    } catch (err) {
      setError(err.message || "Invalid QR code data.");
    } finally {
      setLoading(false);
    }
  };

  // Method 2: Use device camera via file input (works on mobile)
  const handleCameraCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setLoading(true);

    try {
      // Use a QR reading library via canvas
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = imageUrl;
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Use jsQR to decode (loaded via CDN)
        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            try {
              const qrData = JSON.parse(code.data);
              const data = await attendanceAPI.markAttendance({
                sessionId: qrData.sessionId,
                sessionToken: qrData.sessionToken,
              });
              onSuccess(data.record);
            } catch (err) {
              setError(err.message);
            }
          } else {
            setError("Could not read QR code from image. Try again.");
          }
        } else {
          setError("QR reader not loaded. Use manual input below.");
        }
        setLoading(false);
        URL.revokeObjectURL(imageUrl);
      };
    } catch (err) {
      setError("Error processing image.");
      setLoading(false);
    }
  };

  return (
    <div className="qr-scanner">
      {error && <div className="alert alert-error">{error}</div>}

      {/* Camera/Photo option */}
      <div className="scanner-section">
        <h3>📷 Scan with Camera</h3>
        <p>Take a photo of the QR code shown by your lecturer:</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          style={{ display: "none" }}
        />
        <button
          className="btn btn-primary btn-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          {loading ? "Processing..." : "📸 Open Camera"}
        </button>
      </div>

      <div className="divider">OR</div>

      {/* Manual input option (useful for testing) */}
      <div className="scanner-section">
        <h3>⌨️ Paste QR Data (For Testing)</h3>
        <p>Paste the raw QR code JSON text:</p>
        <form onSubmit={handleManualSubmit}>
          <textarea
            className="form-control"
            rows={4}
            placeholder='{"sessionId":"...","sessionToken":"...","courseId":"..."}'
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
          />
          <button className="btn btn-secondary btn-full mt-2" type="submit" disabled={loading}>
            {loading ? "Marking..." : "Mark Attendance"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default QRScanner;
