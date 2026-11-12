
/* =========================================
   PAPER TRAILS - BOOK MANAGEMENT
   ========================================= */

const BOOKS_KEY = "paperTrailsBooks";


/* =========================================
   1. GET BOOKS
   ========================================= */

function getBooks() {
  try {
    const books = JSON.parse(localStorage.getItem(BOOKS_KEY));
    return Array.isArray(books) ? books : [];
  } catch {
    return [];
  }
}


/* =========================================
   2. SAVE BOOKS
   ========================================= */

function saveBooks(books) {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}


/* =========================================
   3. ESCAPE HTML
   ========================================= */

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}


/* =========================================
   4. INITIALIZE BOOK MANAGEMENT
   ========================================= */

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

  let selectedCover = "";
  let selectedPdfName = "";


  /* =========================================
     5. OPEN ADD / EDIT MODAL
     ========================================= */

  function openModal() {
    const isEditing = Boolean(field("bookId")?.value);

    if (field("modalTitle")) {
      field("modalTitle").textContent = isEditing
        ? "Edit Book"
        : "Add New Book";
    }

    modal.classList.add("active");
    modal.style.display = "flex";
  }


  /* =========================================
     6. CLOSE MODAL AND RESET FORM
     ========================================= */

  function closeModal() {
    modal.classList.remove("active");
    modal.style.display = "none";

    form.reset();

    selectedCover = "";
    selectedPdfName = "";

    if (coverPreview) coverPreview.src = "";

    if (field("bookId")) {
      field("bookId").value = "";
    }

    if (field("currentPdf")) {
      field("currentPdf").textContent = "";
    }

    if (coverInput) coverInput.value = "";

    if (field("bookPdf")) {
      field("bookPdf").value = "";
    }
  }


  /* =========================================
     7. RENDER BOOKS TABLE
     ========================================= */

  function renderBooks() {

    let books = getBooks();

    const search = (field("bookSearch")?.value || "").toLowerCase();
    const genre = field("genreFilter")?.value || "";
    const type = field("typeFilter")?.value || "";

    books = books.filter(book =>
      `${book.title || ""} ${book.author || ""}`
        .toLowerCase()
        .includes(search) &&
      (!genre || book.genre === genre) &&
      (!type || book.type === type)
    );

    if (!books.length) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            No books found. Add your first book!
          </td>
        </tr>
      `;

    } else {

      tableBody.innerHTML = books.map(book => {

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

    const allBooks = getBooks();

    if (field("totalBooks")) {
      field("totalBooks").textContent = allBooks.length;
    }

    if (field("freeBooks")) {
      field("freeBooks").textContent =
        allBooks.filter(book => book.type === "Free").length;
    }

    if (field("paidBooks")) {
      field("paidBooks").textContent =
        allBooks.filter(book => book.type === "Premium").length;
    }

  }


  /* =========================================
     8. READ UPLOADED IMAGE
     ========================================= */

  function readFile(file) {

    return new Promise((resolve, reject) => {

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(file);

    });

  }


  /* =========================================
     9. ADD NEW BOOK BUTTON
     ========================================= */

  addButton?.addEventListener("click", () => {

    closeModal();
    openModal();

  });


  /* =========================================
     10. CLOSE MODAL BUTTONS
     ========================================= */

  closeButton?.addEventListener("click", closeModal);

  cancelButton?.addEventListener("click", closeModal);


  /* =========================================
     11. CLOSE WHEN CLICKING OUTSIDE
     ========================================= */

  modal.addEventListener("click", event => {

    if (event.target === modal) {
      closeModal();
    }

  });


  /* =========================================
     12. CLOSE WITH ESCAPE KEY
     ========================================= */

  document.addEventListener("keydown", event => {

    if (
      event.key === "Escape" &&
      modal.classList.contains("active")
    ) {
      closeModal();
    }

  });


  /* =========================================
     13. COVER IMAGE UPLOAD
     ========================================= */

  coverInput?.addEventListener("change", async () => {

    const file = coverInput.files[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {

      alert("Please select a JPG, PNG or WEBP image.");

      coverInput.value = "";
      return;

    }

    if (file.size > 5 * 1024 * 1024) {

      alert("Cover image must be smaller than 5 MB.");

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


  /* =========================================
     14. PDF UPLOAD VALIDATION
     ========================================= */

  field("bookPdf")?.addEventListener("change", event => {

    const file = event.target.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {

      alert("Please select a PDF file.");

      event.target.value = "";
      return;

    }

    if (file.size > 25 * 1024 * 1024) {

      alert("PDF must be smaller than 25 MB.");

      event.target.value = "";
      return;

    }

    selectedPdfName = file.name;

    if (field("currentPdf")) {
      field("currentPdf").textContent = "Selected: " + file.name;
    }

  });


  /* =========================================
     15. SAVE BOOK
     ========================================= */

  form.addEventListener("submit", event => {

    event.preventDefault();

    const books = getBooks();
    const id = field("bookId")?.value || "";

    const existing = books.find(book => book.id === id);

    const book = {

      id: id || String(Date.now()),

      title: field("bookTitle")?.value.trim() || "",

      author: field("bookAuthor")?.value.trim() || "",

      description: field("bookDescription")?.value.trim() || "",

      genre: field("bookGenre")?.value || "",

      ageGroup: field("bookAgeGroup")?.value || "",

      type: field("bookType")?.value || "Free",

      cover: selectedCover || existing?.cover || "",

      pdfName: selectedPdfName || existing?.pdfName || ""

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

    try {

      const updatedBooks = existing
        ? books.map(item => item.id === id ? book : item)
        : [...books, book];

      saveBooks(updatedBooks);

      renderBooks();

      closeModal();

      alert(
        existing
          ? "Book updated successfully!"
          : "Book added successfully!"
      );

    } catch (error) {

      alert(
        "Browser storage is full. Try a smaller cover image."
      );

    }

  });


  /* =========================================
     16. EDIT / VIEW / DELETE BOOK
     ========================================= */

  tableBody.addEventListener("click", event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    const books = getBooks();

    const book = books.find(item => item.id === id);

    if (!book) return;


    /* DELETE BOOK */
    if (action === "delete") {

      if (!confirm(`Delete "${book.title}"?`)) return;

      saveBooks(books.filter(item => item.id !== id));

      renderBooks();

    }


    /* VIEW BOOK */
    if (action === "view") {

      alert(
        `${book.title}\n` +
        `Author: ${book.author}\n` +
        `Genre: ${book.genre}\n` +
        `Age: ${book.ageGroup}\n` +
        `Type: ${book.type}\n` +
        `PDF: ${book.pdfName || "Not selected"}`
      );

    }


    /* EDIT BOOK */
    if (action === "edit") {

      field("bookId").value = book.id;

      field("bookTitle").value = book.title || "";

      field("bookAuthor").value = book.author || "";

      field("bookDescription").value = book.description || "";

      field("bookGenre").value = book.genre || "";

      field("bookAgeGroup").value = book.ageGroup || "";

      field("bookType").value = book.type || "Free";

      selectedCover = book.cover || "";

      selectedPdfName = book.pdfName || "";

      if (coverPreview) {
        coverPreview.src = selectedCover;
      }

      if (field("currentPdf")) {
        field("currentPdf").textContent =
          selectedPdfName || "No PDF selected";
      }

      openModal();

    }

  });


  /* =========================================
     17. SEARCH AND FILTERS
     ========================================= */

  ["bookSearch", "genreFilter", "typeFilter"].forEach(id => {

    field(id)?.addEventListener("input", renderBooks);

    field(id)?.addEventListener("change", renderBooks);

  });


  /* =========================================
     18. INITIAL RENDER
     ========================================= */

  renderBooks();


  /* =========================================
     19. OPEN MODAL FROM DASHBOARD
     ========================================= */

  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get("add") === "1") {

    // Open the Add New Book modal automatically
    closeModal();
    openModal();

    // Remove the query parameter from the address bar
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

  }

});
