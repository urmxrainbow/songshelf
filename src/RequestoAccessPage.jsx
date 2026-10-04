import React, { useState } from "react";
import "./RequestoAccessPage.css";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://api.songshelf.app";

const RequestAccessPage = ({ onBack }) => {
  const [email, setEmail] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Server error");
      }

      setShowModal(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="request-access-root">
      <div
        className="back-arrow"
        onClick={onBack}
        style={{ cursor: "pointer" }}
      >
        ❮
      </div>

      <div className="request-card">
        {/* Corner dots */}
        <span className="corner-dot dot-tl" />
        <span className="corner-dot dot-tr" />
        <span className="corner-dot dot-bl" />
        <span className="corner-dot dot-br" />

        <p className="request-title"> Request to access ♡ </p>

        <form onSubmit={handleSubmit} className="request-form">
          <label className="field-label">
            ⭑.ᐟSpotify email
            <input
              type="email"
              className="spotify-input"
              placeholder="enter your Spotify email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <p className="helper-text">
            We just need your Spotify email
            <br />
            so you can access our app
          </p>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
          {error && (
            <p style={{ color: "red", marginTop: "10px", fontSize: "14px" }}>
              {error}
            </p>
          )}
        </form>
      </div>
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="modal-title">౨ৎ Thank you ౨ৎ 🎉</p>
            <p className="modal-text">
              We got your Spotify email:
              <br />
              <strong>{email}</strong>
              <br />
              We’ll notify you soon through this email.
            </p>
            <button
              className="modal-button"
              onClick={() => {
                setShowModal(false); 
                setEmail("");
                if (onBack) onBack();
              }}
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestAccessPage;
