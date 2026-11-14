
const isAdminAuthenticated = require("../../lib/admin-auth");
const { getPdfMetadata } = require("../../lib/tigris");
const { callWorker } = require("../../lib/worker-api");

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
    const { key, filename, bookId } = req.body || {};

    if (
      typeof key !== "string" ||
      !/^books\/[a-f0-9-]+\.pdf$/i.test(key) ||
      typeof filename !== "string" ||
      !filename.toLowerCase().endsWith(".pdf")
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid PDF details."
      });
    }

    const metadata = await getPdfMetadata(key);

    if (
      metadata.contentType.split(";")[0].trim().toLowerCase() !==
      "application/pdf"
    ) {
      return res.status(400).json({
        success: false,
        error: "The uploaded file is not a PDF."
      });
    }

    if (metadata.size <= 0 || metadata.size > MAX_PDF_SIZE) {
      return res.status(413).json({
        success: false,
        error: "PDF must be no larger than 25 MB."
      });
    }

    const result = await callWorker("/admin/books", "GET");
    const books = result.books || [];

    let existingBook = null;

    if (bookId !== undefined && bookId !== null && bookId !== "") {
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

    if (currentUsage - oldPdfSize + metadata.size > MAX_TOTAL_STORAGE) {
      return res.status(413).json({
        success: false,
        error: "Total PDF storage limit of 125 MB exceeded."
      });
    }

    return res.status(200).json({
      success: true,
      key,
      pdfName: filename,
      pdfSizeBytes: metadata.size,
      message: "PDF uploaded and verified successfully."
    });

  } catch (error) {
    console.error("PDF verification error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to verify uploaded PDF."
    });
  }
};
