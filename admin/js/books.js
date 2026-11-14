
/* PAPER TRAILS - BOOK MANAGEMENT
   Cloudflare D1 + Private Tigris PDF Storage
*/

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookForm");
  const modal = document.getElementById("bookModal");
  const tableBody = document.getElementById("booksTableBody");
  const addButton = document.getElementById("addBookButton");
  const closeButton = document.getElementById("closeBookModal");
  const cancelButton = document.getElementById("cancelBookModal");

  if (!form || !modal || !tableBody) return;

  const field = id => document.getElementById(id);

  const coverInput = field("bookCover");
  const coverPreview = field("coverPreview");
  const pdfInput = field("bookPdf");

  let books = [];
  let selectedCover = "";
  let selectedPdf = null;

  const MAX_PDF_SIZE = 25 * 1024 * 1024;

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || data.message || `Request failed (${response.status}).`
      );
    }

    return data;
  }

  async function loadBooks() {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="empty-state">Loading books...</td></tr>';

    try {
      const data = await api("/api/admin/books");

      books = Array.isArray(data.books) ? data.books : [];

      renderBooks();
    } catch (error) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            ${escapeHTML(error.message)}
          </td>
        </tr>
      `;
    }
  }

  function renderBooks() {
    const search = (field("bookSearch")?.value || "").toLowerCase();
    const genre = field("genreFilter")?.value || "";
    const type = field("typeFilter")?.value || "";

    const filtered = books.filter(book =>
      `${book.title || ""} ${book.author || ""}`
        .toLowerCase()
        .includes(search) &&
      (!genre || book.genre === genre) &&
      (!type || book.type === type)
    );

    if (!filtered.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            No books found. Add your first book!
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = filtered.map(book => {
        const bookType = book.type || "Free";

        return `
          <tr>
            <td>
              <img
                src="${escapeHTML(book.cover || "")}"
                alt="Book cover"
                style="width:55px;height:78px;object-fit:cover;border-radius:6px"
              >
            </td>

            <td>
              <strong>${escapeHTML(book.title)}</strong>
              <br>
              <small>${escapeHTML(book.author)}</small>
            </td>

            <td>
              <span class="genre-badge">
                ${escapeHTML(book.genre)}
              </span>
            </td>

            <td>${escapeHTML(book.ageGroup)}</td>

            <td>
              <span class="book-type-badge ${escapeHTML(bookType.toLowerCase())}">
                ${escapeHTML(bookType)}
              </span>
            </td>

            <td>
              <button
                type="button"
                data-action="edit"
                data-id="${escapeHTML(book.id)}"
                title="Edit"
              >✎</button>

              <button
                type="button"
                data-action="view"
                data-id="${escapeHTML(book.id)}"
                title="View"
              >◉</button>

              <button
                type="button"
                data-action="delete"
                data-id="${escapeHTML(book.id)}"
                title="Delete"
              >🗑</button>
            </td>
          </tr>
        `;
      }).join("");
    }

    if (field("totalBooks")) {
      field("totalBooks").textContent = books.length;
    }

    if (field("freeBooks")) {
      field("freeBooks").textContent =
        books.filter(book => book.type === "Free").length;
    }

    if (field("paidBooks")) {
      field("paidBooks").textContent =
        books.filter(book => book.type === "Premium").length;
    }
  }

  function openModal() {
    const editing = Boolean(field("bookId")?.value);

    if (field("modalTitle")) {
      field("modalTitle").textContent =
        editing ? "Edit Book" : "Add New Book";
    }

    modal.classList.add("active");
    modal.style.display = "flex";
  }

  function closeModal() {
    modal.classList.remove("active");
    modal.style.display = "none";

    form.reset();

    selectedCover = "";
    selectedPdf = null;

    if (coverPreview) coverPreview.src = "";

    if (field("bookId")) {
      field("bookId").value = "";
    }

    if (field("currentPdf")) {
      field("currentPdf").textContent = "No PDF selected";
    }

    if (coverInput) coverInput.value = "";
    if (pdfInput) pdfInput.value = "";
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(file);
    });
  }

  // =========================================
  // UPLOAD PDF TO PRIVATE TIGRIS STORAGE
  // =========================================

  async function uploadPdf(file, bookId = "") {
    // Request temporary upload URL.
    const uploadInfo = await api("/api/admin/pdf-upload", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: "application/pdf",
        sizeBytes: file.size,
        bookId: bookId || undefined
      })
    });

    if (!uploadInfo.uploadUrl || !uploadInfo.key) {
      throw new Error("Unable to generate PDF upload link.");
    }

    // Upload directly to private Tigris storage.
    const uploadResponse = await fetch(uploadInfo.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf"
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `PDF upload failed (${uploadResponse.status}).`
      );
    }

    // Verify actual file size and content type on the server.
    const verification = await api("/api/admin/pdf-verify", {
      method: "POST",
      body: JSON.stringify({
        key: uploadInfo.key,
        filename: file.name,
        bookId: bookId || undefined
      })
    });

    if (!verification.success) {
      throw new Error("PDF verification failed.");
    }

    return {
      pdfKey: verification.key,
      pdfName: verification.pdfName,
      pdfSizeBytes: verification.pdfSizeBytes
    };
  }

  // =========================================
  // MODAL EVENTS
  // =========================================

  addButton?.addEventListener("click", () => {
    closeModal();
    openModal();
  });

  closeButton?.addEventListener("click", closeModal);
  cancelButton?.addEventListener("click", closeModal);

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      modal.classList.contains("active")
    ) {
      closeModal();
    }
  });

  // =========================================
  // COVER IMAGE UPLOAD
  // =========================================

  coverInput?.addEventListener("change", async () => {
    const file = coverInput.files[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Please select a JPG, PNG or WEBP image.");
      coverInput.value = "";
      return;
    }

    if (file.size > 900 * 1024) {
      alert("For now, please use a cover image smaller than 900 KB.");
      coverInput.value = "";
      return;
    }

    try {
      selectedCover = await readFile(file);

      if (coverPreview) {
        coverPreview.src = selectedCover;
      }
    } catch {
      alert("Unable to read the cover image. Please try again.");
    }
  });

  // =========================================
  // PDF FILE SELECTION
  // =========================================

  pdfInput?.addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) {
      selectedPdf = null;
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");

      event.target.value = "";
      selectedPdf = null;
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      alert("PDF must be smaller than 25 MB.");

      event.target.value = "";
      selectedPdf = null;
      return;
    }

    selectedPdf = file;

    if (field("currentPdf")) {
      field("currentPdf").textContent =
        "Selected: " + file.name;
    }
  });

  // =========================================
  // SAVE BOOK
  // =========================================

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const id = field("bookId")?.value || "";

    const existing = books.find(
      book => String(book.id) === String(id)
    );

    const book = {
      title: field("bookTitle")?.value.trim() || "",
      author: field("bookAuthor")?.value.trim() || "",
      description: field("bookDescription")?.value.trim() || "",
      genre: field("bookGenre")?.value || "",
      ageGroup: field("bookAgeGroup")?.value || "",
      type: field("bookType")?.value || "Free",
      cover: selectedCover || existing?.cover || ""
    };

    if (
      !book.title ||
      !book.author ||
      !book.genre ||
      !book.ageGroup ||
      !book.cover
    ) {
      alert("Please complete all required fields and add a cover.");
      return;
    }

    if (book.cover.length > 1400000) {
      alert("Cover image is too large. Please choose a smaller image.");
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }

    try {
      // Upload and verify a newly selected PDF first.
      if (selectedPdf) {
        if (selectedPdf.size > MAX_PDF_SIZE) {
          throw new Error("PDF must be smaller than 25 MB.");
        }

        if (field("currentPdf")) {
          field("currentPdf").textContent = "Uploading PDF...";
        }

        const pdfMetadata = await uploadPdf(selectedPdf, id);

        book.pdfKey = pdfMetadata.pdfKey;
        book.pdfName = pdfMetadata.pdfName;
        book.pdfSizeBytes = pdfMetadata.pdfSizeBytes;
      }

      // Save book metadata to D1 through Vercel.
      if (id) {
        await api(
          `/api/admin/book?id=${encodeURIComponent(id)}`,
          {
            method: "PUT",
            body: JSON.stringify(book)
          }
        );
      } else {
        await api("/api/admin/books", {
          method: "POST",
          body: JSON.stringify(book)
        });
      }

      await loadBooks();

      closeModal();

      alert(
        id
          ? "Book updated successfully!"
          : "Book added successfully!"
      );

    } catch (error) {
      console.error("Book save error:", error);

      alert(`Unable to save book: ${error.message}`);

      if (field("currentPdf") && selectedPdf) {
        field("currentPdf").textContent =
          "Upload failed: " + selectedPdf.name;
      }

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "✓ Save Book";
      }
    }
  });

  // =========================================
  // EDIT, VIEW AND DELETE
  // =========================================

  tableBody.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    const book = books.find(
      item => String(item.id) === String(id)
    );

    if (!book) return;

    // DELETE
    if (action === "delete") {
      if (!confirm(`Delete "${book.title}"?`)) return;

      try {
        await api(
          `/api/admin/book?id=${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );

        await loadBooks();

        alert("Book deleted successfully!");

      } catch (error) {
        alert(`Unable to delete book: ${error.message}`);
      }
    }

    // VIEW
    if (action === "view") {
      const sizeMB = (
        Number(book.pdfSizeBytes || 0) / (1024 * 1024)
      ).toFixed(2);

      alert(
        `${book.title}\n` +
        `Author: ${book.author}\n` +
        `Genre: ${book.genre}\n` +
        `Age: ${book.ageGroup}\n` +
        `Type: ${book.type}\n` +
        `PDF: ${book.pdfName || "Not uploaded"}\n` +
        `PDF size: ${book.pdfName ? sizeMB + " MB" : "0 MB"}`
      );
    }

    // EDIT
    if (action === "edit") {
      field("bookId").value = book.id;
      field("bookTitle").value = book.title || "";
      field("bookAuthor").value = book.author || "";
      field("bookDescription").value = book.description || "";
      field("bookGenre").value = book.genre || "";
      field("bookAgeGroup").value = book.ageGroup || "";
      field("bookType").value = book.type || "Free";

      selectedCover = book.cover || "";
      selectedPdf = null;

      if (coverPreview) {
        coverPreview.src = selectedCover;
      }

      if (field("currentPdf")) {
        field("currentPdf").textContent =
          book.pdfName || "No PDF uploaded";
      }

      if (pdfInput) {
        pdfInput.value = "";
      }

      openModal();
    }
  });

  // =========================================
  // SEARCH AND FILTERS
  // =========================================

  ["bookSearch", "genreFilter", "typeFilter"].forEach(id => {
    field(id)?.addEventListener("input", renderBooks);
    field(id)?.addEventListener("change", renderBooks);
  });

  // =========================================
  // INITIAL LOAD
  // =========================================

  loadBooks();

  const params = new URLSearchParams(window.location.search);

  if (params.get("add") === "1") {
    closeModal();
    openModal();

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }
});
