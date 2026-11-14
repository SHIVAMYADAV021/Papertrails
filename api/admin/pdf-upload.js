
const crypto = require("crypto");

const isAdminAuthenticated = require("../../lib/admin-auth");
const { callWorker } = require("../../lib/worker-api");
const { createUploadUrl } = require("../../lib/tigris");

const MAX_PDF_SIZE = 25 * 1024 * 1024;
const MAX_TOTAL_STORAGE = 125 * 1024 * 1024;

module.exports = async (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized."
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    const { filename, contentType, sizeBytes, bookId } = req.body || {};

    if (
      typeof filename !== "string" ||
      !filename.toLowerCase().endsWith(".pdf") ||
      contentType !== "application/pdf"
    ) {
      return res.status(400).json({
        success: false,
        error: "Please select a valid PDF file."
      });
    }

    if (
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > MAX_PDF_SIZE
    ) {
      return res.status(413).json({
        success: false,
        error: "Each PDF must be between 1 byte and 25 MB."
      });
    }

    const result = await callWorker("/admin/books", "GET");
    const books = result.books || [];

    let existingBook = null;

    if (bookId !== undefined && bookId !== null && bookId !== "") {
      if (!/^\d+$/.test(String(bookId))) {
        return res.status(400).json({
          success: false,
          error: "Invalid book ID."
        });
      }

      existingBook = books.find(
        book => String(book.id) === String(bookId)
      );

      if (!existingBook) {
        return res.status(404).json({
          success: false,
          error: "Book not found."
        });
      }
    }

    const currentUsage = books.reduce(
      (total, book) => total + Number(book.pdf_size_bytes || 0),
      0
    );

    const oldPdfSize = Number(
      existingBook?.pdf_size_bytes || 0
    );

    const projectedUsage = currentUsage - oldPdfSize + sizeBytes;

    if (projectedUsage > MAX_TOTAL_STORAGE) {
      return res.status(413).json({
        success: false,
        error: "The total PDF storage limit of 125 MB would be exceeded."
      });
    }

    const key = `books/${crypto.randomUUID()}.pdf`;
    const uploadUrl = await createUploadUrl(key);

    return res.status(200).json({
      success: true,
      uploadUrl,
      key,
      contentType: "application/pdf",
      expiresIn: 300
    });

  } catch (error) {
    console.error("PDF upload URL error:", error);

    return res.status(error.status || 500).json({
      success: false,
      error: error.message || "Unable to prepare PDF upload."
    });
  }
};
