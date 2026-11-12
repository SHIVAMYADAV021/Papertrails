
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

const crypto = require("crypto");

function safeCompare(a, b) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  return (
    first.length === second.length &&
    crypto.timingSafeEqual(first, second)
  );
}

module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }

  if (!req.headers["content-type"]?.includes("application/json")) {
    return res.status(415).json({
      message: "JSON content type required."
    });
  }

  const { adminId, password } = req.body || {};

  const correctId = process.env.ADMIN_ID;
  const correctPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!correctId || !correctPassword || !sessionSecret) {
    return res.status(500).json({
      message: "Server authentication is not configured."
    });
  }

  if (
    typeof adminId !== "string" ||
    typeof password !== "string" ||
    adminId.length > 100 ||
    password.length > 200 ||
    !safeCompare(adminId, correctId) ||
    !safeCompare(password, correctPassword)
  ) {
    return res.status(401).json({
      message: "Invalid Admin ID or password."
    });
  }

  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;

  const payload = Buffer.from(
    JSON.stringify({ admin: true, expiresAt })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", sessionSecret)
    .update(payload)
    .digest("base64url");

  const token = `${payload}.${signature}`;

  res.setHeader(
    "Set-Cookie",
    `pt_admin_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
  );

  return res.status(200).json({
    success: true,
    message: "Login successful."
  });
};
