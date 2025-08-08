import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Env vars set in Render dashboard
const PROXY_ACCESS_KEY = process.env.PROXY_ACCESS_KEY || "my_secret_key";
const TARGET_API_KEY = process.env.TARGET_API_KEY || "target_api_key_here";

// Log outbound static IP when service starts
(async () => {
  try {
    const res = await axios.get("https://api.ipify.org?format=json");
    console.log("Outbound static IP:", res.data.ip);
  } catch (err) {
    console.error("Could not fetch outbound IP:", err.message);
  }
})();

// Root health-check
app.get("/", (req, res) => {
  res.json({ status: "Render proxy is running" });
});

// Secure proxy endpoint
app.post("/proxy", async (req, res) => {
  // Protect access
  if (req.headers["x-api-key"] !== PROXY_ACCESS_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { url, method = "GET", data = {}, headers = {} } = req.body;

    // Add target API key
    const outboundHeaders = {
      ...headers,
      "x-api-key": TARGET_API_KEY
    };

    const response = await axios({
      url,
      method,
      data,
      headers: outboundHeaders,
      timeout: 15000
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).json({
      error: err.message,
      details: err.response?.data || null
    });
  }
});

// Outbound IP check
app.get("/myip", async (req, res) => {
  try {
    const ipRes = await axios.get("https://api.ipify.org?format=json");
    res.json({ outboundIP: ipRes.data.ip });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch outbound IP" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));
