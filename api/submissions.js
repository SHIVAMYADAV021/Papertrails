
const path = require("path");

// Load local environment variables for development.
// On Vercel production, environment variables come from Vercel itself.
require("dotenv").config({
  path: path.resolve(process.cwd(), ".env.local"),
  override: true
});

const WORKER_URL = "https://paper-trails-api.sy0091958.workers.dev";

module.exports = async function handler(req, res) {
  // Only allow visitor story submissions
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  // Read the Cloudflare API secret
  const secret = process.env.WORKER_API_SECRET;

  if (!secret || !secret.trim()) {
    console.error("WORKER_API_SECRET is missing.");

    return res.status(500).json({
      success: false,
      error: "Submission service is not configured."
    });
  }

  try {
    const data = req.body;

    // Validate incoming submission
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid submission data."
      });
    }

    // Forward the submission securely to Cloudflare Worker
    const response = await fetch(`${WORKER_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Secret": secret.trim()
      },
      body: JSON.stringify(data)
    });

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      console.error("Worker returned a non-JSON response.");

      return res.status(502).json({
        success: false,
        error: "The submission service returned an invalid response."
      });
    }

    return res.status(response.status).json(result);

  } catch (error) {
    console.error("Visitor submission API error:", error.message);

    return res.status(502).json({
      success: false,
      error: "Unable to connect to the story submission service."
    });
  }
};
