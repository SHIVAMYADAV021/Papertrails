
module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }

  res.setHeader(
    "Set-Cookie",
    "pt_admin_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
};
