
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  return res.status(200).json({
    adminIdLoaded: Boolean(process.env.PAPERTRAILS_ADMIN_ID),
    passwordLoaded: Boolean(process.env.ADMIN_PASSWORD),
    sessionSecretLoaded: Boolean(process.env.SESSION_SECRET)
  });
};
