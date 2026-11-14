
const isAdminAuthenticated = require("../../lib/admin-auth");
const { callWorker } = require("../../lib/worker-api");
const { deletePdf } = require("../../lib/tigris");

module.exports = async (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized."
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
    if (req.method === "PUT") {
      // Get the existing PDF information before editing.
      const existingData = await callWorker("/admin/books", "GET");

      const existingBook = (existingData.books || []).find(
        book => String(book.id) === id
      );

      if (!existingBook) {
        return res.status(404).json({
          success: false,
          error: "Book not found."
        });
      }

      const data = req.body || {};

      // Update the book first.
      const result = await callWorker(`/books/${id}`, "PUT", data);

      // Delete the old PDF only after the new metadata is saved.
      const oldKey = existingBook.pdf_key || "";
      const newKey = Object.prototype.hasOwnProperty.call(data, "pdfKey")
        ? (data.pdfKey || "")
        : oldKey;

      if (oldKey && oldKey !== newKey) {
        try {
          await deletePdf(oldKey);
        } catch (deleteError) {
          console.error("Old PDF cleanup failed:", deleteError);
        }
      }

      return res.status(200).json(result);
    }

    if (req.method === "DELETE") {
      // Worker returns the deleted book's PDF key.
      const result = await callWorker(`/books/${id}`, "DELETE");

      if (result.deletedPdfKey) {
        try {
          await deletePdf(result.deletedPdfKey);
        } catch (deleteError) {
          console.error("Deleted book PDF cleanup failed:", deleteError);
        }
      }

      return res.status(200).json({
        ...result,
        message: "Book deleted successfully."
      });
    }

    res.setHeader("Allow", "PUT, DELETE");

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });

  } catch (error) {
    console.error("Admin book API error:", error);

    return res.status(error.status || 502).json({
      success: false,
      error: error.message || "Unable to update book."
    });
  }
};
