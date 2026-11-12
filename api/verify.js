
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

const crypto = require("crypto");

module.exports = (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      authenticated: false,
      message: "Method not allowed"
    });
  }

  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    return res.status(500).json({
      authenticated: false,
      message: "Server authentication is not configured."
    });
  }

  const cookie = req.headers.cookie || "";

  const token = cookie
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith("pt_admin_session="))
    ?.slice("pt_admin_session=".length);

  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return res.status(401).json({ authenticated: false });
  }

  const [payload, signature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  ) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      session.admin !== true ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now()
    ) {
      return res.status(401).json({ authenticated: false });
    }

    return res.status(200).json({
      authenticated: true
    });

  } catch {
    return res.status(401).json({ authenticated: false });
  }
};
