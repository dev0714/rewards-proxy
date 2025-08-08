import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// API key to protect your proxy from unauthorized use
const PROXY_ACCESS_KEY = process.env.PROXY_ACCESS_KEY || "my_secret_key";

// The x-api-key for the target API you want to call
const TARGET_API_KEY = process.env.TARGET_API_KEY || "target_api_key_here";

app.post("/proxy", async (req, res) => {
  // 1. Check if incoming request has correct proxy key
  if (req.headers["x-api-key"] !== PROXY_ACCESS_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { url, method = "GET", data = {}, headers = {} } = req.body;

    // 2. Always include the target API key in outbound calls
    const outboundHeaders = {
      ...headers,
      "x-api-key": TARGET_API_KEY
    };

    const response = await axios({
      url,
      method,
      data,
      headers: outboundHeaders,
      timeout: 10000
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      details: err.response?.data || null
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));
