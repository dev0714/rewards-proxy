import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Proxy access key stored securely in Render env vars
const PROXY_ACCESS_KEY = process.env.PROXY_ACCESS_KEY || "my_secret_key";

// Log outbound static IP on start
(async () => {
  try {
    const res = await axios.get("https://api.ipify.org?format=json");
    console.log("Outbound static IP:", res.data.ip);
  } catch (err) {
    console.error("Could not fetch outbound IP:", err.message);
  }
})();

// Health check root endpoint
app.get("/", (req, res) => {
  res.json({ status: "Render proxy is running" });
});

// Endpoint to check outbound IP
app.get("/myip", async (req, res) => {
  try {
    const ipRes = await axios.get("https://api.ipify.org?format=json");
    res.json({ outboundIP: ipRes.data.ip });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch outbound IP" });
  }
});

// Proxy POST endpoint
app.post("/proxy", async (req, res) => {
  // 1. Check proxy access key in request header
  if (req.headers["x-api-key"] !== PROXY_ACCESS_KEY) {
    return res.status(401).json({ error: "Unauthorized: Invalid proxy key" });
  }

  try {
    const { url, method = "GET", data = {}, headers = {}, targetApiKey } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing 'url' in request body" });
    }
    if (!targetApiKey) {
      return res.status(400).json({ error: "Missing 'targetApiKey' in request body" });
    }

    // Merge headers and add target API key
    const outboundHeaders = {
      ...headers,
      "x-api-key": targetApiKey
    };

    // Make outbound request
    const response = await axios({
      url,
      method,
      data,
      headers: outboundHeaders,
      timeout: 15000
    });

    // Return target API response
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).json({
      error: err.message,
      details: err.response?.data || null
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));
