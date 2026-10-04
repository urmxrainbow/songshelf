import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import logo from "../assets/logo.svg";
import Spotify_logo from "../assets/Spotify_logo.png";
import SongCover from "../assets/SongCover.png";
import StampFrame from "../assets/stamp-frame.png";
import StoryPaper from "../assets/story-paper.png";
import loader_1Svg from "../assets/loader/loader_1.svg";
import loader_2Svg from "../assets/loader/loader_2.svg";
import loader_3Svg from "../assets/loader/loader_3.svg";
import html2canvas from "html2canvas";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://api.songshelf.app";

function formatHeaderDate(range) {
  const now = new Date();

  if (range === "3 months") {
    const end = now;
    const endMonth = end.toLocaleString("en-US", { month: "short" });
    const endYear = end.getFullYear();

    const start = new Date(end);
    start.setMonth(start.getMonth() - 2);
    const startMonth = start.toLocaleString("en-US", { month: "short" });
    const startYear = start.getFullYear();

    if (startYear === endYear) {
      return `${startMonth} - ${endMonth} ${endYear}`;
    }

    return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
  }

  return now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function mapRangeToTimeRange(range) {
  if (range === "1 month") return "short_term";
  if (range === "3 months") return "medium_term";
  return "short_term";
}

function getMoodFromGenres(genres) {
  if (!genres || genres.length === 0) return "mysterious mix";

  const text = genres.join(" ").toLowerCase();

  if (text.includes("dream")) return "dreamy & dramatic";
  if (text.includes("indie")) return "indie & introspective";
  if (text.includes("pop")) return "bright & upbeat";
  if (text.includes("rock")) return "intense & energetic";

  return "mixed moods";
}

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [range, setRange] = useState("1 month");

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(null);

  const loaderFrames = [loader_1Svg, loader_2Svg, loader_3Svg];
  const [loaderIndex, setLoaderIndex] = useState(0);

  const [coversLoaded, setCoversLoaded] = useState(0);
  const [storyReady, setStoryReady] = useState(false);

  const [notAllowed, setNotAllowed] = useState(false);

  const storyRef = useRef(null);

  useEffect(() => {
    if (!loading) return;

    const id = setInterval(() => {
      setLoaderIndex((prev) => (prev + 1) % loaderFrames.length);
    }, 150);

    return () => clearInterval(id);
  }, [loading, loaderFrames.length]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    console.log("TOKEN FROM URL =", token);

    if (token) {
      setAccessToken(token);
    }
  }, []);

  useEffect(() => {
    if (!accessToken || tracks.length === 0 || notAllowed) {
      setSummary(null);
      return;
    }

    const controller = new AbortController();

    async function buildSummary() {
      try {
        const timeRange = mapRangeToTimeRange(range);

        const artistsRes = await fetch(
          `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=5`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            signal: controller.signal,
          }
        );

        if (!artistsRes.ok) {
          throw new Error("Failed to fetch top artists");
        }

        const artistsData = await artistsRes.json();
        const artists = artistsData.items || [];

        const topArtistNames = artists.slice(0, 3).map((a) => a.name);

        const genreCounts = {};
        artists.forEach((artist) => {
          (artist.genres || []).forEach((g) => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        });

        const topGenres = Object.entries(genreCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([name]) => name);

        const moodLabel = getMoodFromGenres(topGenres);

        setSummary({
          topArtists: topArtistNames,
          vibeGenres: topGenres,
          moodLabel,
        });
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to build summary", err);
        setSummary(null);
      }
    }

    buildSummary();

    return () => controller.abort();
  }, [accessToken, range, tracks]);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();

    async function fetchTopTracks() {
      setLoading(true);
      setError(null);
      setStoryReady(false);
      setCoversLoaded(0);
      setNotAllowed(false);

      try {
        const timeRange = mapRangeToTimeRange(range);

        const res = await fetch(
          `${BACKEND_URL}/top-tracks?time_range=${timeRange}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            signal: controller.signal,
          }
        );

        const data = await res.json();

        if (
          res.status === 403 ||
          data?.details?.error?.message?.includes(
            "User not registered in the Developer Dashboard"
          )
        ) {
          console.warn("User not allowed in Spotify dashboard");
          setNotAllowed(true);
          setTracks([]);
          setSummary(null);
          return;
        }

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        setTracks(data.items || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setError(err.message || "Failed to load tracks");
      } finally {
        setLoading(false);
      }
    }

    fetchTopTracks();

    return () => controller.abort();
  }, [accessToken, range]);

  const downloadStory = async ({ transparent }) => {
    if (!storyRef.current) return;

    const originalNode = storyRef.current;

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const cloneNode = originalNode.cloneNode(true);

    if (transparent) {
      cloneNode.style.backgroundImage = "none";
      cloneNode.style.backgroundColor = "transparent";
    }

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    wrapper.style.pointerEvents = "none";
    wrapper.style.opacity = "0";

    wrapper.appendChild(cloneNode);
    document.body.appendChild(wrapper);

    try {
      const canvas = await html2canvas(cloneNode, {
        useCORS: true,
        backgroundColor: null,
        scale: 3,
      });

      const dataUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.download = transparent
        ? "songshelf-transparent.png"
        : "songshelf-paper.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download image:", err);
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  useEffect(() => {
    const coversToLoad = Math.min(tracks.length, 6);

    const allImagesLoaded = coversToLoad === 0 || coversLoaded >= coversToLoad;

    if (!loading && !error && tracks.length > 0 && summary && allImagesLoaded) {
      setStoryReady(true);
    }
  }, [loading, error, tracks, summary, coversLoaded]);

  if (!accessToken) {
    return (
      <div className="app app-center">
        <header className="app-header">
          <img src={logo} alt="Logo" />

          <div className="title">
            <h1 className="title-main">Making</h1>
            <h2 className="title-sub">A cool Shelves</h2>
          </div>
        </header>

        <img src={SongCover} alt="SongCover" className="Song-Cover" />

        <button
          className="spotify-btn"
          onClick={() => {
            window.location.href = `${BACKEND_URL}/login`;
          }}
        >
          <img src={Spotify_logo} alt="Spotify logo" className="spotify-icon" />
          <span>Log in with Spotify</span>
        </button>

        {[...Array(20)].map((_, i) => (
          <div key={`snow-${i}`} className="snowflake"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <img src={logo} alt="Logo" />
      </header>

      <section className="controls">
        <h3>Step 1 · Choose your time range</h3>
        <div className="buttons">
          <button
            className={range === "1 month" ? "active" : ""}
            onClick={() => setRange("1 month")}
          >
            Last 1 Month
          </button>
          <button
            className={range === "3 months" ? "active" : ""}
            onClick={() => setRange("3 months")}
          >
            Last 3 Months
          </button>
        </div>
      </section>

      <section className="preview">
        <h3>Step 2 · Downloads story preview </h3>
        <div className="story-preview">
          <div
            className="story"
            ref={storyRef}
            style={{
              backgroundImage: `url(${StoryPaper})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
            }}
          >
            <img src={logo} alt="Logo" className="logo-img" />

            <div className="story-header">
              <h4 className="title-head">
                My Top Songs · {formatHeaderDate(range)}
              </h4>
            </div>

            {loading && (
              <div className="box-loading">
                <img
                  src={loaderFrames[loaderIndex]}
                  alt="Loading..."
                  className="loading-icon"
                />
              </div>
            )}

            {!loading && !error && notAllowed && (
              <div className="box not-allowed">
                <p>
                  This Spotify account is not allowed to use this app yet.
                </p>
                <p>
                  Add its email under User Management in the Spotify
                  Developer Dashboard, then log in again.
                </p>
              </div>
            )}

            <div className="story-grid">
              {!loading &&
                !error &&
                tracks.slice(0, 6).map((track, index) => (
                  <div className="box" key={track.id || index}>
                    <div className="stamp">
                      <img
                        src={StampFrame}
                        alt=""
                        className="stamp-frame"
                        crossOrigin="anonymous"
                      />

                      <div className="stamp-cover-wrapper">
                        {track.album?.images?.[0] ? (
                          <img
                            src={track.album.images[0].url}
                            alt={track.name}
                            className="stamp-cover"
                            crossOrigin="anonymous"
                            onLoad={() => setCoversLoaded((n) => n + 1)}
                            onError={() => setCoversLoaded((n) => n + 1)}
                          />
                        ) : (
                          <div className="stamp-cover placeholder" />
                        )}
                      </div>
                    </div>

                    <div className="track-info">
                      <div className="track-title">{track.name}</div>
                      <div className="track-artist">
                        {track.artists?.map((a) => a.name).join(", ")}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {!loading && !error && tracks.length > 0 && summary && (
              <div className="story-summary">
                <p className="summary-title">
                  Top artists
                  <br />
                  {summary.topArtists && summary.topArtists.length
                    ? summary.topArtists.join(" · ")
                    : ""}
                </p>

                <p className="mood">
                  Monthly Mood
                  <br />
                  {summary.moodLabel}
                </p>
                {summary.vibeGenres && summary.vibeGenres.length > 0 && (
                  <p className="mood">
                    Vibe·{" "}
                    {summary.vibeGenres
                      .map((g) =>
                        g
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")
                      )
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="download-buttons">
          <button onClick={() => downloadStory({ transparent: false })}>
            Download PNG (with paper)
          </button>
          <button onClick={() => downloadStory({ transparent: true })}>
            Download PNG (transparent)
          </button>
        </div>
      </section>

      {[...Array(20)].map((_, i) => (
        <div key={`snow-${i}`} className="snowflake"></div>
      ))}
    </div>
  );
}

export default App;
