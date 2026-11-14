
const { callWorker } = require("../lib/worker-api");
const { createDownloadUrl } = require("../lib/tigris");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  const id = String(req.query.id || "");

  if (!/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({
      success: false,
      error: "Invalid book ID."
    });
  }

  try {
    // Retrieve PDF details from the Worker.
    // The Worker checks that the book is published.
    const book = await callWorker(
      `/book-download/${id}`,
      "GET"
    );

    if (!book.pdfKey) {
      return res.status(404).json({
        success: false,
        error: "PDF not found."
      });
    }

    // Generate a temporary link to the private PDF.
    const downloadUrl = await createDownloadUrl(
      book.pdfKey,
      book.pdfName || "book.pdf"
    );

    return res.status(200).json({
      success: true,
      downloadUrl,
      filename: book.pdfName || "book.pdf",
      expiresIn: 900
    });

  } catch (error) {
    console.error("Book PDF download error:", error);

    return res.status(error.status || 502).json({
      success: false,
      error: error.message || "Unable to open this PDF."
    });
  }
};
