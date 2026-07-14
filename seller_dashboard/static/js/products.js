/**
 * MarketSphere - Seller Dashboard: products.js
 * Handles interactive elements, bulk selections, filters, dropdowns, and modals.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const table = document.getElementById('pmProductsTable');
  const tableBody = document.getElementById('pmProductsTableBody');
  const selectAllCheckbox = document.getElementById('pmSelectAll');
  const rowCheckboxes = document.querySelectorAll('.pm-row-checkbox');
  const bulkBar = document.getElementById('pmBulkBar');
  const bulkCount = document.getElementById('pmBulkCount');
  const clearSelectionBtn = document.getElementById('pmClearSelectionBtn');
  const emptyState = document.getElementById('pmEmptyState');

  // Filter & Search Elements
  const searchInput = document.getElementById('pmSearchInput');
  const categoryFilter = document.getElementById('pmCategoryFilter');
  const statusFilter = document.getElementById('pmStatusFilter');
  const sortFilter = document.getElementById('pmSortFilter');
  const applyFiltersBtn = document.getElementById('pmApplyFiltersBtn');
  const resetFiltersBtn = document.getElementById('pmResetFiltersBtn');

  // Delete Modal Elements
  const deleteModalOverlay = document.getElementById('pmDeleteModalOverlay');
  const deleteModalTitle = document.getElementById('pmDeleteModalTitle');
  const deleteModalText = document.getElementById('pmDeleteModalText');
  const deleteModalConfirm = document.getElementById('pmDeleteModalConfirm');
  const deleteModalCancel = document.getElementById('pmDeleteModalCancel');

  // Active state variables
  let rowToDelete = null;

  /* ==========================================================================
     1. DROPDOWN MANAGEMENT (Row actions & Bulk actions)
     ========================================================================== */
  
  // Toggle dropdown visibility using delegation
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.pm-dropdown-trigger');
    
    if (trigger) {
      e.preventDefault();
      const dropdown = trigger.closest('.pm-dropdown');
      const isActive = dropdown.classList.contains('pm-active');
      
      // Close all other dropdowns first
      closeAllDropdowns();
      
      // Toggle current
      if (!isActive) {
        dropdown.classList.add('pm-active');
        trigger.setAttribute('aria-expanded', 'true');
      }
    } else if (!e.target.closest('.pm-dropdown-menu')) {
      // Clicked completely outside dropdowns, close them all
      closeAllDropdowns();
    }
  });

  function closeAllDropdowns() {
    document.querySelectorAll('.pm-dropdown.pm-active').forEach(dropdown => {
      dropdown.classList.remove('pm-active');
      const trigger = dropdown.querySelector('.pm-dropdown-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  /* ==========================================================================
     2. CHECKBOX & BULK ACTIONS SELECTION
     ========================================================================== */

  // Sync Master checkbox with individual row checkboxes
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', () => {
      const isChecked = selectAllCheckbox.checked;
      getVisibleRows().forEach(row => {
        const cb = row.querySelector('.pm-row-checkbox');
        if (cb) {
          cb.checked = isChecked;
          toggleRowHighlight(row, isChecked);
        }
      });
      updateBulkBarState();
    });
  }

  // Row checkbox changes
  tableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('pm-row-checkbox')) {
      const row = e.target.closest('.pm-row');
      toggleRowHighlight(row, e.target.checked);
      updateBulkBarState();
    }
  });

  // Highlight rows that are selected
  function toggleRowHighlight(row, highlight) {
    if (highlight) {
      row.style.backgroundColor = 'var(--pm-primary-light)';
    } else {
      row.style.backgroundColor = '';
    }
  }

  // Update selection UI and action bar display
  function updateBulkBarState() {
    const checkedRows = Array.from(rowCheckboxes).filter(cb => cb.checked);
    const totalCount = checkedRows.length;

    if (totalCount > 0) {
      bulkCount.textContent = totalCount;
      bulkBar.classList.remove('pm-hidden');
    } else {
      bulkBar.classList.add('pm-hidden');
    }

    // Keep Master checkbox status accurate (checked / unchecked / indeterminate)
    if (selectAllCheckbox) {
      const visibleCheckboxes = getVisibleRows().map(row => row.querySelector('.pm-row-checkbox')).filter(Boolean);
      const visibleChecked = visibleCheckboxes.filter(cb => cb.checked);

      if (visibleChecked.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      } else if (visibleChecked.length === visibleCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
      }
    }
  }

  // Clear all current selections
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', () => {
      rowCheckboxes.forEach(cb => {
        cb.checked = false;
        toggleRowHighlight(cb.closest('.pm-row'), false);
      });
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      }
      updateBulkBarState();
    });
  }

  // Helper to retrieve only current non-hidden rows
  function getVisibleRows() {
    return Array.from(tableBody.querySelectorAll('.pm-row')).filter(row => !row.classList.contains('pm-hidden'));
  }

  /* ==========================================================================
     3. BULK ACTIONS HANDLING
     ========================================================================== */
  
  document.querySelectorAll('[data-bulk-action]').forEach(button => {
    button.addEventListener('click', (e) => {
      const action = e.target.closest('[data-bulk-action]').dataset.bulkAction;
      const selectedIds = Array.from(rowCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => {
           // If utilizing real Django IDs, read them off data attributes (e.g. data-product-id)
           const row = cb.closest('.pm-row');
           return row.dataset.productName || 'product';
        });

      if (selectedIds.length === 0) return;

      if (action === 'delete') {
        // Trigger Delete confirmation for selected items
        openDeleteModal(`Delete ${selectedIds.length} Products?`, 
          `Are you sure you want to delete these ${selectedIds.length} selected products? This cannot be undone.`,
          () => {
            console.log(`Sending Bulk Delete Request to backend for:`, selectedIds);
            // Dynamic UI deletion fallback for frontend testing:
            rowCheckboxes.forEach(cb => {
              if (cb.checked) cb.closest('.pm-row').remove();
            });
            updateBulkBarState();
            checkAndShowEmptyState();
          }
        );
      } else {
        // Mock update actions (Publish / Hide)
        console.log(`Bulk processing [${action}] action for items:`, selectedIds);
        // Display toast or redirect to your Django view accordingly.
        alert(`Bulk Action [${action}] successful for ${selectedIds.length} items!`);
        closeAllDropdowns();
      }
    });
  });

  /* ==========================================================================
     4. INDIVIDUAL ROW ACTIONS
     ========================================================================== */

  tableBody.addEventListener('click', (e) => {
    const actionItem = e.target.closest('[data-row-action]');
    if (!actionItem) return;

    const action = actionItem.dataset.rowAction;
    const row = actionItem.closest('.pm-row');
    const productName = row.dataset.productName || row.querySelector('.pm-product-name').textContent;

    if (action === 'delete') {
      rowToDelete = row;
      openDeleteModal(
        'Delete product?',
        `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
        () => {
          if (rowToDelete) {
            console.log('Deleting single product:', productName);
            rowToDelete.remove();
            rowToDelete = null;
            checkAndShowEmptyState();
          }
        }
      );
    } else if (action === 'edit') {
      console.log('Redirecting to edit details for:', productName);
      // Backend routing e.g., window.location.href = `/seller/products/edit/${productId}/`;
    } else if (action === 'duplicate') {
      console.log('Duplicating product:', productName);
      // Handle cloning request here
    } else if (action === 'hide') {
      console.log('Hiding product status to drafts/hidden:', productName);
      const statusBadge = row.querySelector('.pm-badge');
      if (statusBadge) {
        statusBadge.className = 'pm-badge pm-badge-hidden';
        statusBadge.textContent = 'Hidden';
      }
    }
    closeAllDropdowns();
  });

  /* ==========================================================================
     5. DELETE MODAL FUNCTIONALITY
     ========================================================================== */

  let confirmCallback = null;

  function openDeleteModal(title, text, onConfirm) {
    deleteModalTitle.textContent = title;
    deleteModalText.textContent = text;
    confirmCallback = onConfirm;
    
    deleteModalOverlay.classList.remove('pm-hidden');
    document.body.style.overflow = 'hidden'; // Lock scrolling background
  }

  function closeDeleteModal() {
    deleteModalOverlay.classList.add('pm-hidden');
    document.body.style.overflow = '';
    confirmCallback = null;
  }

  if (deleteModalCancel) {
    deleteModalCancel.addEventListener('click', closeDeleteModal);
  }

  // Close modal when clicking dark backdrop directly
  if (deleteModalOverlay) {
    deleteModalOverlay.addEventListener('click', (e) => {
      if (e.target === deleteModalOverlay) closeDeleteModal();
    });
  }

  if (deleteModalConfirm) {
    deleteModalConfirm.addEventListener('click', () => {
      if (confirmCallback) {
        confirmCallback();
      }
      closeDeleteModal();
    });
  }

  // Handle escape key to close active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !deleteModalOverlay.classList.contains('pm-hidden')) {
      closeDeleteModal();
    }
  });

  /* ==========================================================================
     6. CLIENT-SIDE SEARCH, FILTERS & SORTING
     ========================================================================== */

  function performFiltering() {
    const searchVal = searchInput.value.toLowerCase().trim();
    const catVal = categoryFilter.value.toLowerCase();
    const statusVal = statusFilter.value.toLowerCase();
    
    const rows = Array.from(tableBody.querySelectorAll('.pm-row'));

    rows.forEach(row => {
      const pName = row.dataset.productName || row.querySelector('.pm-product-name').textContent.toLowerCase();
      const pSku = row.querySelector('.pm-product-sku')?.textContent.toLowerCase() || "";
      const pCategory = row.querySelector('[data-label="Category"]').textContent.toLowerCase();
      const pStatusBadge = row.querySelector('.pm-badge');
      
      let pStatus = "";
      if (pStatusBadge) {
        // Read clean class modifiers (e.g. published, draft, out-of-stock, hidden)
        pStatus = Array.from(pStatusBadge.classList)
                       .find(cls => cls.startsWith('pm-badge-'))
                       ?.replace('pm-badge-', '') || pStatusBadge.textContent.toLowerCase().replace(" ", "-");
      }

      // Check search query matches
      const matchesSearch = !searchVal || pName.includes(searchVal) || pSku.includes(searchVal);
      // Check category match
      const matchesCategory = !catVal || pCategory === catVal;
      // Check status match
      const matchesStatus = !statusVal || pStatus === statusVal;

      if (matchesSearch && matchesCategory && matchesStatus) {
        row.classList.remove('pm-hidden');
      } else {
        row.classList.add('pm-hidden');
        // Uncheck if it got hidden during filter change
        const cb = row.querySelector('.pm-row-checkbox');
        if (cb) cb.checked = false;
      }
    });

    performSorting();
    updateBulkBarState();
    checkAndShowEmptyState();
  }

  function performSorting() {
    const sortVal = sortFilter.value;
    const rows = getVisibleRows();

    rows.sort((rowA, rowB) => {
      if (sortVal === 'newest' || sortVal === 'oldest') {
        // Simple date parsing fallback
        const dateA = new Date(rowA.querySelector('.pm-date').textContent);
        const dateB = new Date(rowB.querySelector('.pm-date').textContent);
        return sortVal === 'newest' ? dateB - dateA : dateA - dateB;
      }

      if (sortVal === 'price-low-high' || sortVal === 'price-high-low') {
        const priceA = parseFloat(rowA.querySelector('.pm-price').textContent.replace(/[^0-9]/g, ''));
        const priceB = parseFloat(rowB.querySelector('.pm-price').textContent.replace(/[^0-9]/g, ''));
        return sortVal === 'price-low-high' ? priceA - priceB : priceB - priceA;
      }

      if (sortVal === 'stock-low-high') {
        const stockA = parseInt(rowA.querySelector('.pm-stock').textContent, 10) || 0;
        const stockB = parseInt(rowB.querySelector('.pm-stock').textContent, 10) || 0;
        return stockA - stockB;
      }

      if (sortVal === 'name-a-z') {
        const nameA = rowA.querySelector('.pm-product-name').textContent.toLowerCase();
        const nameB = rowB.querySelector('.pm-product-name').textContent.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    // Re-append rows in new sorted order
    rows.forEach(row => tableBody.appendChild(row));
  }

  function checkAndShowEmptyState() {
    const visibleCount = getVisibleRows().length;
    if (visibleCount === 0) {
      table.style.display = 'none';
      emptyState.classList.remove('pm-hidden');
    } else {
      table.style.display = '';
      emptyState.classList.add('pm-hidden');
    }
  }

  // Attach filter events
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', performFiltering);
  }

  // Keyup real-time search
  if (searchInput) {
    searchInput.addEventListener('input', performFiltering);
  }

  // Reset filter values
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      categoryFilter.value = '';
      statusFilter.value = '';
      sortFilter.value = 'newest';
      performFiltering();
    });
  }
});