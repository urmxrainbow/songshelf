import "./App.css";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://api.songshelf.app";

export default function Login() {
  const loginWithSpotify = () => {
    window.location.href = `${BACKEND_URL}/login`;
  };

  return (
    <div className="login-container">
      <img
        className="logo"
        src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_CMYK_Green.png"
        alt="Spotify"
      />

      <h1>Log in to Spotify</h1>
      <p className="subtitle">to access your music data.</p>

      <button className="login-btn" onClick={loginWithSpotify}>
        Log in with Spotify
      </button>

      <p className="footer">This app was created using the Spotify API</p>
    </div>
  );
}
