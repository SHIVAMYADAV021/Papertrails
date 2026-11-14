
/* =========================================
   PAPER TRAILS - DASHBOARD JAVASCRIPT
   Updated: Books, Genres, Submissions & PDF Storage
   ========================================= */

(() => {
  "use strict";

  const STORAGE_LIMIT_MB = 125;
  const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * 1024 * 1024;

  /* =========================================
     1. CHECK ADMIN SESSION
     ========================================= */

  async function checkAdminSession() {
    try {
      const response = await fetch("/api/verify", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) {
        window.location.href = "login.html";
        return false;
      }

      const result = await response.json();

      if (!result.authenticated) {
        window.location.href = "login.html";
        return false;
      }

      return true;

    } catch (error) {
      console.error("Session verification failed:", error);
      window.location.href = "login.html";
      return false;
    }
  }

  /* =========================================
     2. ADMIN LOGOUT
     ========================================= */

  async function logoutAdmin() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin"
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    window.location.href = "login.html";
  }

  /* =========================================
     3. SAFE HTML
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
     4. NORMALIZE BOOK DATA
     Supports camelCase and D1 column names
     ========================================= */

  function normalizeBook(book) {
    return {
      id: book.id,
      title: book.title || "",
      author: book.author || "",
      description: book.description || "",
      genre: book.genre || "",
      ageGroup: book.ageGroup || book.age_group || "",
      type: book.type || book.book_type || "Free",
      cover: book.cover || book.cover_url || "",
      pdfUrl: "",
      pdfName: book.pdfName || book.pdf_name || "",
      pdfSizeBytes: Number(
        book.pdfSizeBytes || book.pdf_size_bytes || 0
      )
    };
  }

  /* =========================================
     5. GET BOOKS
     ========================================= */

  async function getDashboardBooks() {
    const response = await fetch("/api/admin/books", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });

    const result = await response.json();

    if (response.status === 401) {
      window.location.href = "login.html";
      throw new Error("Admin session expired.");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Unable to load books.");
    }

    return Array.isArray(result.books)
      ? result.books.map(normalizeBook)
      : [];
  }

  /* =========================================
     6. GET STORY SUBMISSIONS
     ========================================= */

  async function getDashboardSubmissions() {
    const response = await fetch("/api/admin/submissions", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });

    const result = await response.json();

    if (response.status === 401) {
      window.location.href = "login.html";
      throw new Error("Admin session expired.");
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Unable to load story submissions."
      );
    }

    return Array.isArray(result.submissions)
      ? result.submissions
      : [];
  }

  /* =========================================
     7. UPDATE BOOK STATISTICS
     ========================================= */

  function updateBookStatistics(books) {
    const totalBooks = document.getElementById("totalBooks");
    const totalGenres = document.getElementById("totalGenres");

    if (totalBooks) {
      totalBooks.textContent = books.length;
    }

    if (totalGenres) {
      const uniqueGenres = new Set(
        books
          .map(book => String(book.genre || "").trim().toLowerCase())
          .filter(Boolean)
      );

      totalGenres.textContent = uniqueGenres.size;
    }
  }

  /* =========================================
     8. RENDER BOOK TABLE
     Dashboard page only
     ========================================= */

  function renderBookTable(books) {
    const tableBody = document.getElementById("booksTableBody");

    if (!tableBody) return;

    if (!books.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            No books added yet. Add your first book!
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = books.slice(0, 5).map(book => `
      <tr>
        <td>
          ${
            book.cover
              ? `<img
                   src="${escapeHTML(book.cover)}"
                   alt="Book cover"
                   style="width:45px;height:65px;object-fit:cover;border-radius:6px;"
                 >`
              : "📖"
          }
        </td>

        <td>
          <strong>${escapeHTML(book.title || "Untitled")}</strong>
          <br>
          <small>${escapeHTML(book.author)}</small>
        </td>

        <td>${escapeHTML(book.genre || "-")}</td>

        <td>${escapeHTML(book.ageGroup || "-")}</td>

        <td>${escapeHTML(book.type)}</td>

        <td>
          <a href="books.html">Manage</a>
        </td>
      </tr>
    `).join("");
  }

  /* =========================================
     9. CALCULATE PDF STORAGE
     Uses actual PDF sizes from Tigris/D1
     ========================================= */

  function calculatePdfStorageBytes(books) {
    return books.reduce((total, book) => {
      return total + Math.max(
        0,
        Number(book.pdfSizeBytes || 0)
      );
    }, 0);
  }

  function updateStorageStatistics(books) {
    const storageElement = document.getElementById("usedStorage");
    const progressElement = document.getElementById("storageProgress");

    if (!storageElement || !progressElement) return;

    const bytes = calculatePdfStorageBytes(books);
    const megabytes = bytes / (1024 * 1024);

    storageElement.textContent =
      megabytes < 0.01
        ? "0 MB"
        : `${megabytes.toFixed(2)} MB`;

    const percentage = Math.min(
      100,
      (bytes / STORAGE_LIMIT_BYTES) * 100
    );

    progressElement.style.width = `${percentage}%`;

    progressElement.setAttribute(
      "aria-valuenow",
      percentage.toFixed(1)
    );

    progressElement.setAttribute("aria-valuemin", "0");
    progressElement.setAttribute("aria-valuemax", "100");
  }

  /* =========================================
     10. FORMAT DATE
     ========================================= */

  function formatSubmissionDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(
      String(value).includes("T")
        ? value
        : String(value).replace(" ", "T") + "Z"
    );

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  /* =========================================
     11. RENDER RECENT SUBMISSIONS
     ========================================= */

  function renderRecentSubmissions(submissions) {
    const list = document.getElementById("recentSubmissionsList");

    if (!list) return;

    if (!submissions.length) {
      list.innerHTML = `
        <div class="empty-state">
          No story submissions yet.
        </div>
      `;
      return;
    }

    const latestSubmissions = [...submissions]
      .sort((a, b) => {
        return new Date(b.created_at || 0) -
               new Date(a.created_at || 0);
      })
      .slice(0, 5);

    list.innerHTML = latestSubmissions.map(story => {
      const title = story.story_title || "Untitled Story";
      const author = story.first_name || "Unknown Author";
      const age = story.age || "";
      const status = story.status || "New";
      const date = formatSubmissionDate(story.created_at);

      return `
        <a
          href="submissions.html"
          class="recent-submission-item"
          style="text-decoration:none;color:inherit;"
          title="Open story submissions"
        >
          <span class="recent-submission-icon">📄</span>

          <span class="recent-submission-info">
            <strong>${escapeHTML(title)}</strong>

            <small>
              ${escapeHTML(author)}
              ${age ? ` · Age ${escapeHTML(age)}` : ""}
              · ${escapeHTML(date)}
            </small>
          </span>

          <span class="recent-submission-status">
            ${escapeHTML(status)}
          </span>

          <span aria-hidden="true">›</span>
        </a>
      `;
    }).join("");
  }

  /* =========================================
     12. UPDATE SUBMISSION COUNT
     ========================================= */

  function updateSubmissionCount(submissions) {
    const totalSubmissions =
      document.getElementById("totalSubmissions");

    if (totalSubmissions) {
      totalSubmissions.textContent = submissions.length;
    }
  }

  /* =========================================
     13. LOAD DASHBOARD BOOKS
     IMPORTANT:
     Only run on dashboard.html.
     Never overwrite the books.html management table.
     ========================================= */

  async function loadDashboardBooks() {

    const isDashboardPage =
      window.location.pathname.endsWith("dashboard.html");

    // Critical fix: books.js manages the books.html table.
    if (!isDashboardPage) return;

    const tableBody = document.getElementById("booksTableBody");

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            Loading books...
          </td>
        </tr>
      `;
    }

    try {
      const books = await getDashboardBooks();

      updateBookStatistics(books);
      renderBookTable(books);
      updateStorageStatistics(books);

    } catch (error) {
      console.error("Dashboard books error:", error);

      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" class="empty-state">
              Unable to load books. Please refresh.
            </td>
          </tr>
        `;
      }
    }
  }

  /* =========================================
     14. LOAD DASHBOARD SUBMISSIONS
     ========================================= */

  async function loadDashboardSubmissions() {
    const totalSubmissions =
      document.getElementById("totalSubmissions");

    const recentList =
      document.getElementById("recentSubmissionsList");

    if (totalSubmissions) {
      totalSubmissions.textContent = "…";
    }

    if (recentList) {
      recentList.innerHTML = `
        <div class="empty-state">
          Loading recent stories...
        </div>
      `;
    }

    try {
      const submissions = await getDashboardSubmissions();

      updateSubmissionCount(submissions);
      renderRecentSubmissions(submissions);

    } catch (error) {
      console.error("Dashboard submissions error:", error);

      if (totalSubmissions) {
        totalSubmissions.textContent = "—";
      }

      if (recentList) {
        recentList.innerHTML = `
          <div class="empty-state">
            Unable to load submissions.
            <br>
            <small>${escapeHTML(error.message)}</small>
          </div>
        `;
      }
    }
  }

  /* =========================================
     15. DASHBOARD ADD BOOK BUTTON
     ========================================= */

  function setupAddBookButton() {
    const isDashboardPage =
      window.location.pathname.endsWith("dashboard.html");

    if (!isDashboardPage) return;

    const addBookButton =
      document.getElementById("addBookButton");

    if (!addBookButton) return;

    addBookButton.addEventListener("click", () => {
      window.location.href = "books.html?add=1";
    });
  }

  /* =========================================
     16. QUICK ACTIONS
     ========================================= */

  function setupQuickActions() {
    const uploadPdfButton =
      document.getElementById("uploadPdfButton");

    const updateCoverButton =
      document.getElementById("updateCoverButton");

    const manageGenresButton =
      document.getElementById("manageGenresButton");

    if (uploadPdfButton) {
      uploadPdfButton.addEventListener("click", () => {
        alert(
          "PDF uploading is not connected yet. " +
          "Online PDF storage needs to be configured first."
        );
      });
    }

    if (updateCoverButton) {
      updateCoverButton.addEventListener("click", () => {
        window.location.href = "books.html";
      });
    }

    if (manageGenresButton) {
      manageGenresButton.addEventListener("click", () => {
        window.location.href = "genres.html";
      });
    }
  }

  /* =========================================
     17. SIDEBAR MOBILE MENU
     ========================================= */

  function setupSidebarMenu() {
    const menuToggle = document.getElementById("menuToggle");

    if (!menuToggle) return;

    menuToggle.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("sidebar-open");

      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    document.querySelectorAll(".sidebar a, .sidebar-nav a").forEach(link => {
      link.addEventListener("click", () => {
        document.body.classList.remove("sidebar-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        document.body.classList.remove("sidebar-open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* =========================================
     18. LOGOUT BUTTON
     ========================================= */

  function setupLogoutButton() {
    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", logoutAdmin);
  }

  /* =========================================
     19. INITIALIZE DASHBOARD
     ========================================= */

  document.addEventListener("DOMContentLoaded", async () => {
    const authenticated = await checkAdminSession();

    if (!authenticated) return;

    setupLogoutButton();
    setupSidebarMenu();
    setupAddBookButton();
    setupQuickActions();

    // Load dashboard data independently.
    await Promise.all([
      loadDashboardBooks(),
      loadDashboardSubmissions()
    ]);
  });

})();
