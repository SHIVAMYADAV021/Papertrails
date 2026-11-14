
const isAdminAuthenticated = require("../../lib/admin-auth");
const { callWorker } = require("../../lib/worker-api");

module.exports = async (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized."
    });
  }

  try {
    if (req.method === "GET") {
      const data = await callWorker("/admin/books", "GET");

      const books = (data.books || []).map(book => ({
        id: String(book.id),
        title: book.title || "",
        author: book.author || "",
        description: book.description || "",
        genre: book.genre || "",
        ageGroup: book.age_group || "",
        type: book.book_type || "Free",
        cover: book.cover_url || "",
        pdfUrl: "",
        pdfName: book.pdf_name || "",
        pdfSizeBytes: Number(book.pdf_size_bytes || 0),
        pdfKey: book.pdf_key || ""
      }));

      return res.status(200).json({
        success: true,
        books
      });
    }

    if (req.method === "POST") {
      const data = await callWorker("/books", "POST", req.body || {});

      return res.status(201).json(data);
    }

    res.setHeader("Allow", "GET, POST");

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });

  } catch (error) {
    console.error("Admin books API error:", error);

    return res.status(error.status || 502).json({
      success: false,
      error: error.message || "Unable to process books."
    });
  }
};
