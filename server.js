require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(express.json());

const allowedOrigins = [
  "https://www.songshelf.app",
  "https://songshelf.app",
  process.env.FRONTEND_URL,
].filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  FRONTEND_URL,
} = process.env;

app.get("/login", (req, res) => {
  const scope = "user-top-read";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });

  const authorizeUrl =
    "https://accounts.spotify.com/authorize?" + params.toString();

  res.redirect(authorizeUrl);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token } = tokenResponse.data;

    return res.redirect(`${FRONTEND_URL}?access_token=${access_token}`);
  } catch (err) {
    const details = err.response?.data || err.message;

    console.error("Token exchange error:", details);

    return res.status(500).json({
      error: "Failed to exchange token",
      details,
    });
  }
});

app.get("/top-tracks", async (req, res) => {
  const time_range = req.query.time_range || "short_term";
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const accessToken = authHeader.split(" ")[1];

  try {
    const spotifyRes = await axios.get(
      "https://api.spotify.com/v1/me/top/tracks",
      {
        params: {
          limit: 6,
          time_range,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json(spotifyRes.data);
  } catch (err) {
    console.error(
      "Spotify top tracks error:",
      err.response?.data || err.message
    );
    const status = err.response?.status || 500;
    res
      .status(status)
      .json({ error: "Failed to load tracks", details: err.response?.data });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log("Spotify server running at:");
  console.log(`http://localhost:${PORT}`);
});
