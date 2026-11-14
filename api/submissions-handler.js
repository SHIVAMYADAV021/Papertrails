
const path = require("path");

const WORKER_URL =
  "https://paper-trails-api.sy0091958.workers.dev";

module.exports = async function handler(req, res) {
  const mode = req.query?.mode;

  // Validate route mode
  if (mode !== "visitor" && mode !== "admin") {
    return res.status(404).json({
      success: false,
      error: "Route not found."
    });
  }

  // Load local environment variables
  require("dotenv").config({
    path: path.resolve(process.cwd(), ".env.local"),
    override: mode === "visitor"
  });

  const secret = process.env.WORKER_API_SECRET;

  if (!secret || !secret.trim()) {
    console.error("WORKER_API_SECRET is missing.");

    return res.status(500).json({
      success: false,
      error: "Submission service is not configured."
    });
  }

  // ==========================================
  // VISITOR STORY SUBMISSION
  // Original URL: /api/submissions
  // Method: POST
  // ==========================================

  if (mode === "visitor") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");

      return res.status(405).json({
        success: false,
        error: "Method not allowed."
      });
    }

    try {
      // Vercel automatically parses JSON into req.body
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

      // Forward submission to Cloudflare Worker
      const response = await fetch(
        `${WORKER_URL}/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Secret": secret.trim()
          },
          body: JSON.stringify(data)
        }
      );

      const responseText = await response.text();

      let result;

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "Visitor Worker returned invalid JSON:",
          responseText
        );

        return res.status(502).json({
          success: false,
          error: "The submission service returned an invalid response."
        });
      }

      return res.status(response.status).json(result);

    } catch (error) {
      console.error(
        "VISITOR API ERROR:",
        error
      );

      return res.status(502).json({
        success: false,
        error: "Unable to connect to the story submission service.",
        diagnostic:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined
      });
    }
  }

  // ==========================================
  // ADMIN SUBMISSION MANAGEMENT
  // Original URL: /api/admin/submissions
  // Methods: GET, DELETE
  // ==========================================

  const isAdminAuthenticated =
    require("../lib/admin-auth");

  // Check admin authentication
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized. Please log in again."
    });
  }

  try {
    // GET: Fetch all submissions
    if (req.method === "GET") {
      const response = await fetch(
        `${WORKER_URL}/admin/submissions`,
        {
          method: "GET",
          headers: {
            "X-API-Secret": secret.trim()
          }
        }
      );

      const result = await response.json();

      return res.status(response.status).json(result);
    }

    // DELETE: Delete a submission
    if (req.method === "DELETE") {
      const id = Number(
        req.query.id || req.body?.id
      );

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid submission ID."
        });
      }

      const response = await fetch(
        `${WORKER_URL}/admin/submissions/${id}`,
        {
          method: "DELETE",
          headers: {
            "X-API-Secret": secret.trim()
          }
        }
      );

      const result = await response.json();

      return res.status(response.status).json(result);
    }

    // Unsupported admin methods
    res.setHeader("Allow", "GET, DELETE");

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });

  } catch (error) {
    console.error(
      "ADMIN SUBMISSIONS API ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to connect to the submissions service."
    });
  }
};
