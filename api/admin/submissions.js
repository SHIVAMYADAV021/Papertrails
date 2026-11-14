const path = require("path");
require("dotenv").config({
  path: path.resolve(process.cwd(), ".env.local")
});

const isAdminAuthenticated = require("../../lib/admin-auth");

const WORKER_URL = "https://paper-trails-api.sy0091958.workers.dev";

module.exports = async function handler(req, res) {
  // 1. Check admin login
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized. Please log in again."
    });
  }

  // 2. Check Worker secret
  const secret = process.env.WORKER_API_SECRET;

  if (!secret) {
    return res.status(500).json({
      success: false,
      error: "Submission service is not configured."
    });
  }

  try {
    // 3. Fetch all submissions
    if (req.method === "GET") {
      const response = await fetch(
        `${WORKER_URL}/admin/submissions`,
        {
          method: "GET",
          headers: {
            "X-API-Secret": secret
          }
        }
      );

      const result = await response.json();

      return res.status(response.status).json(result);
    }

    // 4. Delete a submission
    if (req.method === "DELETE") {
      const id = Number(req.query.id || req.body?.id);

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
            "X-API-Secret": secret
          }
        }
      );

      const result = await response.json();

      return res.status(response.status).json(result);
    }

    // 5. Reject unsupported methods
    res.setHeader("Allow", "GET, DELETE");

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });

  } catch (error) {
    console.error("Admin submissions API error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to connect to the submissions service."
    });
  }
};