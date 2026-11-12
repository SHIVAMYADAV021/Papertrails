
const crypto = require("crypto");

function isAdminAuthenticated(req) {
  const secret = process.env.SESSION_SECRET;

  if (!secret) return false;

  const cookie = req.headers.cookie || "";

  const token = cookie
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith("pt_admin_session="))
    ?.slice("pt_admin_session=".length);

  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    received.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(received, expectedBuffer)
  ) {
    return false;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    return (
      session.admin === true &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

module.exports = isAdminAuthenticated;
