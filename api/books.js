
const WORKER_URL = "https://paper-trails-api.sy0091958.workers.dev";

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    const response = await fetch(`${WORKER_URL}/books`);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: "Unable to connect to the book library."
    });
  }
};
