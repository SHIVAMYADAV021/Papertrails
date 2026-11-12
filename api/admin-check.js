
const isAdminAuthenticated = require("../lib/admin-auth");

module.exports = (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Admin access verified."
  });
};
