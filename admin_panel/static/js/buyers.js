document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. STATE & DOM ELEMENTS
  // ==========================================
  const DOM = {
    searchInput: document.getElementById("buSearchInput"),
    statusFilter: document.getElementById("buStatusFilter"),
    sortFilter: document.getElementById("buSortFilter"),
    resetFiltersBtn: document.getElementById("buResetFiltersBtn"),
    refreshBtn: document.getElementById("buRefreshBtn"),
    emptyRefreshBtn: document.getElementById("buEmptyRefreshBtn"),
    
    // Table & Selection
    table: document.getElementById("buBuyersTable"),
    tableBody: document.getElementById("buBuyersTableBody"),
    selectAll: document.getElementById("buSelectAll"),
    rowCheckboxes: () => document.querySelectorAll(".bu-row-checkbox"),
    rows: () => document.querySelectorAll("#buBuyersTableBody .bu-row"),
    
    // Bulk Action Bar
    bulkBar: document.getElementById("buBulkBar"),
    bulkCount: document.getElementById("buBulkCount"),
    clearSelectionBtn: document.getElementById("buClearSelectionBtn"),
    bulkActionBtns: document.querySelectorAll("[data-bulk-action]"),
    
    // Header & Summary
    totalBadge: document.getElementById("buTotalBadge"),
    emptyState: document.getElementById("buEmptyState"),
    
    // Pagination Elements
    paginationNav: document.querySelector(".bu-pagination"),
    rowsPerPageSelect: document.getElementById("buRowsPerPage"),
    paginationCountText: document.querySelector(".bu-pagination-count"),
    
    // Modal & Toast
    deleteModalOverlay: document.getElementById("buDeleteModalOverlay"),
    deleteModalCancel: document.getElementById("buDeleteModalCancel"),
    deleteModalConfirm: document.getElementById("buDeleteModalConfirm"),
    toastContainer: document.getElementById("buToastContainer"),
    
    // Header Actions
    exportBtn: document.getElementById("buExportBtn"),
    addBuyerBtn: document.getElementById("buAddBuyerBtn")
  };

  let currentPage = 1;
  let rowsPerPage = parseInt(DOM.rowsPerPageSelect ? DOM.rowsPerPageSelect.value : 8, 10);
  let pendingDeleteTarget = null; // Stores target row or 'bulk' for deletion modal

  // ==========================================
  // 2. TOAST NOTIFICATION SYSTEM
  // ==========================================
  function showToast(message, type = "info") {
    if (!DOM.toastContainer) return;
    
    const toast = document.createElement("div");
    toast.className = `bu-toast bu-toast-${type}`;
    toast.style.cssText = `
      padding: 12px 16px;
      margin-top: 8px;
      border-radius: 6px;
      background: ${type === 'danger' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: #fff;
      font-size: 0.875rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(10px);
    `;
    toast.textContent = message;

    DOM.toastContainer.appendChild(toast);

    // Trigger reflow for animation
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==========================================
  // 3. SEARCH, FILTERING, & SORTING
  // ==========================================
  function getFilteredAndSortedRows() {
    const allRows = Array.from(DOM.rows());
    const query = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : "";
    const selectedStatus = DOM.statusFilter ? DOM.statusFilter.value.toLowerCase() : "";
    const selectedSort = DOM.sortFilter ? DOM.sortFilter.value : "newest";

    // 1. Filter
    let filtered = allRows.filter((row) => {
      const name = (row.dataset.buyerName || "").toLowerCase();
      const username = (row.dataset.buyerUsername || "").toLowerCase();
      const email = (row.dataset.buyerEmail || "").toLowerCase();
      const status = (row.dataset.status || "").toLowerCase();
      const rowText = row.textContent.toLowerCase();

      const matchesSearch = !query || name.includes(query) || username.includes(query) || email.includes(query) || rowText.includes(query);
      
      let matchesStatus = true;
      if (selectedStatus) {
        if (selectedStatus === "email-verified") {
          matchesStatus = row.querySelector(".bu-buyer-verified") !== null;
        } else {
          matchesStatus = status === selectedStatus;
        }
      }

      return matchesSearch && matchesStatus;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case "newest":
        case "date-joined":
          return new Date(b.dataset.joined || 0) - new Date(a.dataset.joined || 0);
        case "oldest":
          return new Date(a.dataset.joined || 0) - new Date(b.dataset.joined || 0);
        case "most-orders":
          return parseInt(b.dataset.orders || 0, 10) - parseInt(a.dataset.orders || 0, 10);
        case "highest-spending":
          return parseFloat(b.dataset.spent || 0) - parseFloat(a.dataset.spent || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }

  function updateTableDisplay() {
    const allRows = Array.from(DOM.rows());
    const visibleRows = getFilteredAndSortedRows();

    // Hide all rows initially
    allRows.forEach((row) => (row.style.display = "none"));

    // Handle empty state
    if (visibleRows.length === 0) {
      if (DOM.emptyState) DOM.emptyState.classList.remove("bu-hidden");
      if (DOM.table) DOM.table.style.display = "none";
      updatePagination(0);
      return;
    }

    if (DOM.emptyState) DOM.emptyState.classList.add("bu-hidden");
    if (DOM.table) DOM.table.style.display = "";

    // Paginate visible rows
    const totalItems = visibleRows.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = startIdx + rowsPerPage;
    const pageRows = visibleRows.slice(startIdx, endIdx);

    // Render current page rows in sorted order
    pageRows.forEach((row) => {
      row.style.display = "";
      DOM.tableBody.appendChild(row); // Ensures sorted DOM order
    });

    updatePagination(totalItems, startIdx + 1, Math.min(endIdx, totalItems));
    updateSelectionState();
  }

  // ==========================================
  // 4. PAGINATION CONTROLS
  // ==========================================
  function updatePagination(totalItems, startItem = 0, endItem = 0) {
    if (DOM.paginationCountText) {
      DOM.paginationCountText.innerHTML = `Showing <strong>${startItem}&ndash;${endItem}</strong> of <strong>${totalItems}</strong> Buyers`;
    }

    if (!DOM.paginationNav) return;

    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
    DOM.paginationNav.innerHTML = "";

    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "bu-page-btn";
    prevBtn.disabled = currentPage === 1;
    prevBtn.setAttribute("aria-label", "Previous page");
    prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>`;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        updateTableDisplay();
      }
    });
    DOM.paginationNav.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        const pageBtn = document.createElement("button");
        pageBtn.type = "button";
        pageBtn.className = `bu-page-btn ${i === currentPage ? "is-active" : ""}`;
        if (i === currentPage) pageBtn.setAttribute("aria-current", "page");
        pageBtn.textContent = i;
        pageBtn.addEventListener("click", () => {
          currentPage = i;
          updateTableDisplay();
        });
        DOM.paginationNav.appendChild(pageBtn);
      } else if (
        (i === 2 && currentPage > 3) ||
        (i === totalPages - 1 && currentPage < totalPages - 2)
      ) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "bu-page-ellipsis";
        ellipsis.innerHTML = "&hellip;";
        DOM.paginationNav.appendChild(ellipsis);
      }
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "bu-page-btn";
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    nextBtn.setAttribute("aria-label", "Next page");
    nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>`;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        updateTableDisplay();
      }
    });
    DOM.paginationNav.appendChild(nextBtn);
  }

  // ==========================================
  // 5. ROW SELECTION & BULK ACTIONS
  // ==========================================
  function updateSelectionState() {
    const visibleCheckboxes = Array.from(DOM.rowCheckboxes()).filter(
      (cb) => cb.closest(".bu-row").style.display !== "none"
    );
    const checkedCount = visibleCheckboxes.filter((cb) => cb.checked).length;

    if (DOM.selectAll) {
      DOM.selectAll.checked = visibleCheckboxes.length > 0 && checkedCount === visibleCheckboxes.length;
      DOM.selectAll.indeterminate = checkedCount > 0 && checkedCount < visibleCheckboxes.length;
    }

    if (DOM.bulkBar) {
      if (checkedCount > 0) {
        DOM.bulkBar.classList.remove("bu-hidden");
        if (DOM.bulkCount) DOM.bulkCount.textContent = checkedCount;
      } else {
        DOM.bulkBar.classList.add("bu-hidden");
      }
    }
  }

  if (DOM.selectAll) {
    DOM.selectAll.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      DOM.rowCheckboxes().forEach((cb) => {
        if (cb.closest(".bu-row").style.display !== "none") {
          cb.checked = isChecked;
        }
      });
      updateSelectionState();
    });
  }

  if (DOM.tableBody) {
    DOM.tableBody.addEventListener("change", (e) => {
      if (e.target.classList.contains("bu-row-checkbox")) {
        updateSelectionState();
      }
    });
  }

  if (DOM.clearSelectionBtn) {
    DOM.clearSelectionBtn.addEventListener("click", () => {
      DOM.rowCheckboxes().forEach((cb) => (cb.checked = false));
      if (DOM.selectAll) DOM.selectAll.checked = false;
      updateSelectionState();
    });
  }

  // Handle Bulk Operations
  DOM.bulkActionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.bulkAction;
      const selectedRows = Array.from(DOM.rowCheckboxes())
        .filter((cb) => cb.checked)
        .map((cb) => cb.closest(".bu-row"));

      if (selectedRows.length === 0) return;

      if (action === "delete") {
        pendingDeleteTarget = "bulk";
        openDeleteModal(`Delete ${selectedRows.length} selected buyers?`);
      } else if (action === "activate" || action === "suspend") {
        selectedRows.forEach((row) => updateRowStatus(row, action === "activate" ? "active" : "suspended"));
        showToast(`Successfully updated ${selectedRows.length} buyers`, "success");
        clearSelections();
        updateTableDisplay();
      } else if (action === "export") {
        exportRowsToCSV(selectedRows);
      }
    });
  });

  function clearSelections() {
    DOM.rowCheckboxes().forEach((cb) => (cb.checked = false));
    if (DOM.selectAll) DOM.selectAll.checked = false;
    updateSelectionState();
  }

  // ==========================================
  // 6. DROPDOWN MENUS & ROW ACTIONS
  // ==========================================
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".bu-dropdown-trigger");
    const activeDropdown = document.querySelector(".bu-dropdown.is-open");

    // Close existing dropdown if clicked outside
    if (activeDropdown && !e.target.closest(".bu-dropdown")) {
      activeDropdown.classList.remove("is-open");
      const btn = activeDropdown.querySelector(".bu-dropdown-trigger");
      if (btn) btn.setAttribute("aria-expanded", "false");
    }

    // Toggle current dropdown
    if (trigger) {
      e.stopPropagation();
      const parentDropdown = trigger.closest(".bu-dropdown");
      const isExpanded = trigger.getAttribute("aria-expanded") === "true";

      if (activeDropdown && activeDropdown !== parentDropdown) {
        activeDropdown.classList.remove("is-open");
      }

      parentDropdown.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", !isExpanded);
    }
  });

  if (DOM.tableBody) {
    DOM.tableBody.addEventListener("click", (e) => {
      const actionItem = e.target.closest("[data-row-action]");
      if (!actionItem) return;

      const action = actionItem.dataset.rowAction;
      const row = actionItem.closest(".bu-row");
      const buyerName = row.dataset.buyerName || "Buyer";

      // Close dropdown menu
      const dropdown = actionItem.closest(".bu-dropdown");
      if (dropdown) dropdown.classList.remove("is-open");

      switch (action) {
        case "view-profile":
          showToast(`Opening profile for ${buyerName}...`, "info");
          break;
        case "view-orders":
          showToast(`Fetching order history for ${buyerName}...`, "info");
          break;
        case "view-wishlist":
          showToast(`Opening wishlist for ${buyerName}...`, "info");
          break;
        case "send-email":
          window.location.href = `mailto:${row.dataset.buyerEmail || ""}`;
          break;
        case "activate":
          updateRowStatus(row, "active");
          showToast(`${buyerName} activated`, "success");
          break;
        case "suspend":
          updateRowStatus(row, "suspended");
          showToast(`${buyerName} suspended`, "danger");
          break;
        case "block":
          updateRowStatus(row, "blocked");
          showToast(`${buyerName} blocked`, "danger");
          break;
        case "delete":
          pendingDeleteTarget = row;
          openDeleteModal(`Delete buyer account for ${buyerName}?`);
          break;
      }
    });
  }

  function updateRowStatus(row, newStatus) {
    row.dataset.status = newStatus;
    const badge = row.querySelector(".bu-badge");
    if (badge) {
      badge.className = `bu-badge bu-badge-${newStatus}`;
      badge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    }
  }

  // ==========================================
  // 7. MODAL DIALOGS
  // ==========================================
  function openDeleteModal(message) {
    if (DOM.deleteModalOverlay) {
      const text = DOM.deleteModalOverlay.querySelector("#buDeleteModalText");
      if (text) text.textContent = message;
      DOM.deleteModalOverlay.classList.remove("bu-hidden");
    }
  }

  function closeDeleteModal() {
    if (DOM.deleteModalOverlay) {
      DOM.deleteModalOverlay.classList.add("bu-hidden");
    }
    pendingDeleteTarget = null;
  }

  if (DOM.deleteModalCancel) {
    DOM.deleteModalCancel.addEventListener("click", closeDeleteModal);
  }

  if (DOM.deleteModalConfirm) {
    DOM.deleteModalConfirm.addEventListener("click", () => {
      if (pendingDeleteTarget === "bulk") {
        const selectedRows = Array.from(DOM.rowCheckboxes())
          .filter((cb) => cb.checked)
          .map((cb) => cb.closest(".bu-row"));

        selectedRows.forEach((row) => row.remove());
        showToast(`Deleted ${selectedRows.length} buyers`, "danger");
        clearSelections();
      } else if (pendingDeleteTarget instanceof HTMLElement) {
        const buyerName = pendingDeleteTarget.dataset.buyerName || "Buyer";
        pendingDeleteTarget.remove();
        showToast(`Deleted ${buyerName}`, "danger");
      }

      closeDeleteModal();
      updateTableDisplay();
    });
  }

  // ==========================================
  // 8. CSV EXPORT UTILITY
  // ==========================================
  function exportRowsToCSV(rowsToExport) {
    const headers = ["Name", "Username", "Email", "Orders", "Spent (PKR)", "Joined", "Status"];
    const csvRows = [headers.join(",")];

    rowsToExport.forEach((row) => {
      const data = [
        `"${row.dataset.buyerName || ""}"`,
        `"${row.dataset.buyerUsername || ""}"`,
        `"${row.dataset.buyerEmail || ""}"`,
        row.dataset.orders || "0",
        row.dataset.spent || "0",
        row.dataset.joined || "",
        row.dataset.status || ""
      ];
      csvRows.push(data.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `buyers_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    showToast(`Exported ${rowsToExport.length} rows to CSV`, "success");
  }

  if (DOM.exportBtn) {
    DOM.exportBtn.addEventListener("click", () => {
      const visibleRows = getFilteredAndSortedRows();
      if (visibleRows.length === 0) {
        showToast("No data to export", "info");
        return;
      }
      exportRowsToCSV(visibleRows);
    });
  }

  // ==========================================
  // 9. EVENT LISTENERS & INITIALIZATION
  // ==========================================
  if (DOM.searchInput) {
    DOM.searchInput.addEventListener("input", () => {
      currentPage = 1;
      updateTableDisplay();
    });
  }

  if (DOM.statusFilter) {
    DOM.statusFilter.addEventListener("change", () => {
      currentPage = 1;
      updateTableDisplay();
    });
  }

  if (DOM.sortFilter) {
    DOM.sortFilter.addEventListener("change", () => {
      currentPage = 1;
      updateTableDisplay();
    });
  }

  if (DOM.rowsPerPageSelect) {
    DOM.rowsPerPageSelect.addEventListener("change", (e) => {
      rowsPerPage = parseInt(e.target.value, 10);
      currentPage = 1;
      updateTableDisplay();
    });
  }

  if (DOM.resetFiltersBtn) {
    DOM.resetFiltersBtn.addEventListener("click", () => {
      if (DOM.searchInput) DOM.searchInput.value = "";
      if (DOM.statusFilter) DOM.statusFilter.value = "";
      if (DOM.sortFilter) DOM.sortFilter.value = "newest";
      currentPage = 1;
      updateTableDisplay();
      showToast("Filters reset", "info");
    });
  }

  const handleRefresh = () => {
    updateTableDisplay();
    showToast("Buyer list refreshed", "info");
  };

  if (DOM.refreshBtn) DOM.refreshBtn.addEventListener("click", handleRefresh);
  if (DOM.emptyRefreshBtn) DOM.emptyRefreshBtn.addEventListener("click", handleRefresh);

  if (DOM.addBuyerBtn) {
    DOM.addBuyerBtn.addEventListener("click", () => {
      showToast("Add Buyer modal feature triggered", "info");
    });
  }

  // Initial Run
  updateTableDisplay();
});