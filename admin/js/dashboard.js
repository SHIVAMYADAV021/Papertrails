
/* =========================================
   PAPER TRAILS - DASHBOARD JAVASCRIPT
   ========================================= */

(() => {

  "use strict";

  const BOOKS_STORAGE_KEY = "paperTrailsBooks";


  /* =========================================
     1. CHECK ADMIN SESSION
     ========================================= */

  async function checkAdminSession() {

    try {

      const response = await fetch("/api/verify", {
        method: "GET",
        credentials: "same-origin"
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
     4. GET DASHBOARD BOOKS
     ========================================= */

  function getDashboardBooks() {

    try {

      const books = JSON.parse(
        localStorage.getItem(BOOKS_STORAGE_KEY)
      );

      return Array.isArray(books) ? books : [];

    } catch (error) {

      console.error("Unable to load books:", error);

      return [];

    }

  }


  /* =========================================
     5. LOAD DASHBOARD BOOKS
     ========================================= */

  function loadDashboardBooks() {

    const tableBody = document.getElementById("booksTableBody");

    if (!tableBody) return;

    const books = getDashboardBooks();

    const totalBooks = document.getElementById("totalBooks");

    if (totalBooks) {
      totalBooks.textContent = books.length;
    }

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
          <img
            src="${escapeHTML(book.cover || "")}"
            alt="Book cover"
            style="width:45px;height:65px;object-fit:cover;border-radius:6px;"
          >
        </td>

        <td>
          <strong>${escapeHTML(book.title || "Untitled")}</strong>
          <br>
          <small>${escapeHTML(book.author || "")}</small>
        </td>

        <td>
          ${escapeHTML(book.genre || "-")}
        </td>

        <td>
          ${escapeHTML(book.ageGroup || "-")}
        </td>

        <td>
          ${escapeHTML(book.type || "Free")}
        </td>

        <td>
          <a href="books.html">Manage</a>
        </td>

      </tr>

    `).join("");

  }


  /* =========================================
     6. DASHBOARD ADD BOOK BUTTON
     ========================================= */

  function setupAddBookButton() {

    const isDashboardPage =
      window.location.pathname.endsWith("dashboard.html");

    // Never attach the Dashboard redirect on Books page.
    if (!isDashboardPage) return;

    const addBookButton = document.getElementById("addBookButton");

    if (!addBookButton) return;

    addBookButton.addEventListener("click", () => {

      window.location.href = "books.html?add=1";

    });

  }


  /* =========================================
     7. SIDEBAR MOBILE MENU
     ========================================= */

  function setupSidebarMenu() {

    const menuToggle = document.getElementById("menuToggle");

    if (!menuToggle) return;

    menuToggle.addEventListener("click", () => {

      document.body.classList.toggle("sidebar-open");

    });

    document.querySelectorAll(".sidebar a").forEach(link => {

      link.addEventListener("click", () => {

        document.body.classList.remove("sidebar-open");

      });

    });

    document.addEventListener("keydown", event => {

      if (event.key === "Escape") {

        document.body.classList.remove("sidebar-open");

      }

    });

  }


  /* =========================================
     8. LOGOUT BUTTON
     ========================================= */

  function setupLogoutButton() {

    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", logoutAdmin);

  }


  /* =========================================
     9. INITIALIZE DASHBOARD
     ========================================= */

  document.addEventListener("DOMContentLoaded", async () => {

    const authenticated = await checkAdminSession();

    if (!authenticated) return;

    setupLogoutButton();

    setupSidebarMenu();

    setupAddBookButton();

    loadDashboardBooks();

  });

})();
