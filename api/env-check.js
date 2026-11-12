
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

module.exports = (req, res) => {
  res.status(200).json({
    adminIdLoaded: Boolean(process.env.ADMIN_ID),
    passwordLoaded: Boolean(process.env.ADMIN_PASSWORD),
    sessionSecretLoaded: Boolean(process.env.SESSION_SECRET)
  });
};
