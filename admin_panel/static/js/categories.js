/* =========================================================================
   MARKETSPHERE ADMIN — CATEGORY MANAGEMENT (list.js)
   Frontend interactivity for admin_panel/templates/catalog/categories/categories.html.
   Vanilla JS, IIFE-scoped, no external libraries.

   Sections:
     1. Demo Data (Products & Activity) & Backend Category Integration
     2. State
     3. DOM Cache
     4. Toast Helper
     5. Scroll Reveal / Animated Counters
     6. Ripple
     7. Dropdown Menus
     8. Tree Rendering
     9. Tree Interactions (expand/collapse/select)
    10. Table View Rendering
    11. View Switching (Tree <-> Table)
    12. Search / Filter / Sort
    13. Drawer (open/close/tabs/populate)
    14. Drawer Panels (overview, info, seo, display, subcategories,
        products, analytics, activity)
    15. Add / Edit Category Modal
    16. Move Category Modal
    17. Assign Products Modal
    18. Delete Category Workflow
    19. Import / Export Modals
    20. Bulk Actions (table view)
    21. Generic Modal Plumbing
    22. Init
   ========================================================================= */

(function () {
    "use strict";

    var root = document.getElementById("cmPage");
    if (!root) return;
    var CATEGORY_API_URL = root.getAttribute("data-category-api-url") || "";
    var CATEGORY_EXPORT_URL = root.getAttribute("data-category-export-url") || "";

    /* ================= 1. CATEGORY DATA & ISOLATED DEMO ACTIVITY ================= */
    var ACTIVITY_EVENTS = [
        { type: "category", icon: "created", title: "Category created", desc: "Category was added to the catalog structure.", actor: "Hammad Ashraf", time: "3 months ago", status: "success" },
        { type: "visibility", icon: "featured", title: "Marked as Featured", desc: "Category now appears in the featured carousel.", actor: "Sana Raza", time: "2 months ago", status: "success" },
        { type: "products", icon: "assigned", title: "18 products assigned", desc: "Bulk product assignment completed for this category.", actor: "Hammad Ashraf", time: "6 weeks ago", status: "info" },
        { type: "category", icon: "renamed", title: "Category renamed", desc: "Display name updated for clarity.", actor: "Sana Raza", time: "5 weeks ago", status: "info" },
        { type: "visibility", icon: "hidden", title: "Hidden from navigation", desc: "Removed from the main site navigation temporarily.", actor: "Hammad Ashraf", time: "3 weeks ago", status: "warning" },
        { type: "admin", icon: "updated", title: "Display order changed", desc: "Reordered relative to sibling categories.", actor: "Sana Raza", time: "9 days ago", status: "info" },
        { type: "products", icon: "removed", title: "3 products removed", desc: "Out-of-policy listings were removed from this category.", actor: "Hammad Ashraf", time: "2 days ago", status: "danger" },
    ];

    function escapeHtml(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function idKey(id) {
        return id === null || id === undefined || id === "" ? "" : String(id);
    }

    function sameId(a, b) { return idKey(a) !== "" && idKey(a) === idKey(b); }

    function productCount(cat) {
        if (Array.isArray(cat.products)) return cat.products.length;
        if (typeof cat.product_count === "number") return cat.product_count;
        return Number(cat.products) || 0;
    }

    function childCount(cat) {
        if (Array.isArray(cat.children)) return cat.children.length;
        return Number(cat.subcategory_count) || 0;
    }

    function categoryStatus(cat) {
        if (typeof cat.is_active === "boolean") return cat.is_active ? "active" : "inactive";
        return String(cat.status || "active").toLowerCase() === "inactive" ? "inactive" : "active";
    }

    function formatCategoryTimestamp(value) {
        if (!value) return "—";

        var date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    }

    function categoryCreated(cat) {
        return formatCategoryTimestamp(
            cat.created_at || cat.created
        );
    }

    function categoryUpdated(cat) {
        return formatCategoryTimestamp(
            cat.updated_at || cat.updated
        );
    }
    // Load actual category data provided by Django. Invalid or missing data means empty UI.
    var CATEGORY_TREE = [];
    var categoryDataElement = document.getElementById("category-tree-data");

    function setCategoryData(payload) {
        var data = payload && payload.category_tree ? payload.category_tree : payload;
        if (Array.isArray(data)) CATEGORY_TREE = data;
        else if (data && Array.isArray(data.children)) CATEGORY_TREE = data.children;
        else if (data && Array.isArray(data.categories)) CATEGORY_TREE = data.categories;
        else CATEGORY_TREE = [];
    }

    if (categoryDataElement) {
        try { setCategoryData(JSON.parse(categoryDataElement.textContent.trim() || "null")); }
        catch (error) { CATEGORY_TREE = []; console.error("Failed to parse category data:", error); }
    }

    function csrfToken() {
        var match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
        if (match) return decodeURIComponent(match[1]);
        var input = document.querySelector("input[name=csrfmiddlewaretoken]");
        return input ? input.value : "";
    }

    function apiRequest(url, options) {
        options = options || {};
        options.headers = Object.assign({ "Accept": "application/json" }, options.headers || {});
        if (options.body && !(options.body instanceof FormData) && !options.headers["Content-Type"]) {
            options.headers["Content-Type"] = "application/json";
        }
        if (options.method && options.method !== "GET") options.headers["X-CSRFToken"] = csrfToken();
        return fetch(url, options).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (payload) {
                if (!response.ok || payload.ok === false) throw new Error(payload.error || "Category request failed.");
                return payload;
            });
        });
    }

    function reloadCategories() {
        if (!CATEGORY_API_URL) return Promise.resolve();
        return apiRequest(CATEGORY_API_URL).then(function (payload) {
            setCategoryData(payload);
            renderTree();
            renderTable();
            if (state.activeCategoryId !== null) {
                var active = findCategory(state.activeCategoryId);
                if (active) populateDrawer(active); else closeDrawer();
            }
        }).catch(function (error) {
            showToast(error.message || "Unable to load categories.", "danger");
            throw error;
        });
    }

    function categoryApiUrl(id) { return CATEGORY_API_URL + idKey(id) + "/"; }

    function saveCategory(id, data) {
        var isCreate = id === null || id === undefined;

        var url = isCreate
            ? CATEGORY_API_URL
            : categoryApiUrl(id);

        var formData = new FormData();

        Object.keys(data).forEach(function (key) {
            var value = data[key];

            if (value === undefined || value === null) {
                return;
            }

            if (key === "image") {
                if (typeof File !== "undefined" && value instanceof File) {
                    formData.append("image", value);
                }
                return;
            }

            formData.append(key, String(value));
        });

        return apiRequest(url, {
            method: "POST",
            body: formData
        }).then(function (payload) {
            return reloadCategories().then(function () {
                return payload;
            });
        });
    }
    /* Flatten helper used across search/filter/table/selects.
       Returns copies of nodes to prevent mutating the original tree structure. */
    function flatten(nodes, depth, parent, out) {
        depth = depth || 0;
        out = out || [];
        if (!Array.isArray(nodes)) return out;
        nodes.forEach(function (node) {
            if (!node || typeof node !== "object") return;
            var copy = Object.assign({}, node);
            copy._depth = depth;
            copy._parentName = parent ? parent.name : null;
            if (!Object.prototype.hasOwnProperty.call(copy, "parent_id")) copy.parent_id = parent ? parent.id : null;
            copy.status = categoryStatus(copy);
            out.push(copy);

            if (Array.isArray(node.children) && node.children.length) {
                flatten(node.children, depth + 1, copy, out);
            }
        });
        return out;
    }

    function allCategoriesFlat() {
        return flatten(CATEGORY_TREE);
    }

    function findCategory(id) {
        return allCategoriesFlat().find(function (c) { return sameId(c.id, id); });
    }

    /* ================= 2. STATE ================= */
    var state = {
        view: "tree",
        filter: "all",
        search: "",
        sort: "name",
        expanded: new Set(),
        selectedTableIds: new Set(),
        activeCategoryId: null,
        infoEditing: false,
    };

    /* ================= 3. DOM CACHE ================= */
    var dom = {
        tree: document.getElementById("cmTree"),
        treeView: document.getElementById("cmTreeView"),
        treeEmpty: document.getElementById("cmTreeEmptyState"),
        treeResultCount: document.getElementById("cmTreeResultCount"),
        tableView: document.getElementById("cmTableView"),
        tableBody: document.getElementById("cmCategoryTableBody"),
        searchInput: document.getElementById("cmSearchInput"),
        sortFilter: document.getElementById("cmSortFilter"),
        chips: document.getElementById("cmFilterChips"),
        expandAllBtn: document.getElementById("cmExpandAllBtn"),
        collapseAllBtn: document.getElementById("cmCollapseAllBtn"),
        collapseAllHeaderBtn: document.getElementById("cmCollapseAllHeaderBtn"),
        resetFiltersBtn: document.getElementById("cmResetFiltersBtn"),
        emptyResetBtn: document.getElementById("cmEmptyResetBtn"),
        viewBtns: Array.prototype.slice.call(document.querySelectorAll(".cm-view-btn")),
        bulkBar: document.getElementById("cmBulkBar"),
        bulkCount: document.getElementById("cmBulkCount"),
        tableSelectAll: document.getElementById("cmTableSelectAll"),
        clearSelectionBtn: document.getElementById("cmClearSelectionBtn"),

        drawerOverlay: document.getElementById("cmDrawerOverlay"),
        drawer: document.getElementById("cmDrawer"),
        drawerClose: document.getElementById("cmDrawerClose"),
        drawerTabs: document.getElementById("cmDrawerTabs"),

        addCategoryBtn: document.getElementById("cmAddCategoryBtn"),
        categoryModal: document.getElementById("cmCategoryModal"),
        categoryModalTitle: document.getElementById("cmCategoryModalTitle"),
        categoryModalSubmit: document.getElementById("cmCategoryModalSubmit"),

        moveModal: document.getElementById("cmMoveModal"),
        assignModal: document.getElementById("cmAssignModal"),
        deleteModal: document.getElementById("cmDeleteModal"),
        exportModal: document.getElementById("cmExportModal"),
        importModal: document.getElementById("cmImportModal"),

        toastContainer: document.getElementById("cmToastContainer"),
    };

    /* ================= 5. SCROLL REVEAL / COUNTERS ================= */
    function initReveal() {
        var items = Array.prototype.slice.call(document.querySelectorAll(".cm-reveal"));
        if (!("IntersectionObserver" in window)) {
            items.forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }
        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });
        items.forEach(function (el) { observer.observe(el); });
    }

    function initCounters() {
        var counters = Array.prototype.slice.call(document.querySelectorAll("[data-cm-count-to]"));
        function animate(el) {
            var target = parseFloat(el.getAttribute("data-cm-count-to")) || 0;
            var duration = 800;
            var start = null;
            function step(ts) {
                if (!start) start = ts;
                var progress = Math.min((ts - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(target * eased).toLocaleString("en-US");
                if (progress < 1) window.requestAnimationFrame(step);
                else el.textContent = target.toLocaleString("en-US");
            }
            window.requestAnimationFrame(step);
        }
        if (!("IntersectionObserver" in window)) { counters.forEach(animate); return; }
        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); }
            });
        }, { threshold: 0.3 });
        counters.forEach(function (el) { observer.observe(el); });
    }

    /* ================= 6. RIPPLE ================= */
    function bindRipple(el) {
        el.addEventListener("click", function (e) {
            var rect = el.getBoundingClientRect();
            var ripple = document.createElement("span");
            var size = Math.max(rect.width, rect.height);
            ripple.style.position = "absolute";
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
            ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
            ripple.style.borderRadius = "50%";
            ripple.style.background = "rgba(255,255,255,.35)";
            ripple.style.pointerEvents = "none";
            ripple.style.transform = "scale(0)";
            ripple.style.transition = "transform .5s ease, opacity .6s ease";
            el.style.position = el.style.position || "relative";
            el.style.overflow = "hidden";
            el.appendChild(ripple);
            window.requestAnimationFrame(function () {
                ripple.style.transform = "scale(2.2)";
                ripple.style.opacity = "0";
            });
            window.setTimeout(function () { ripple.remove(); }, 600);
        });
    }
    function initRipples() {
        document.querySelectorAll(".cm-btn-primary, .cm-btn-danger, .cm-quick-action").forEach(bindRipple);
    }

    /* ================= 7. DROPDOWN MENUS ================= */
    function initDropdowns() {
        var dropdowns = Array.prototype.slice.call(document.querySelectorAll(".cm-dropdown"));

        function closeAll(except) {
            dropdowns.forEach(function (d) { if (d !== except) d.classList.remove("is-open"); });
        }

        document.addEventListener("click", function (e) {
            var trigger = e.target.closest("[id$='Trigger']");
            var dropdown = trigger ? trigger.closest(".cm-dropdown") : null;

            if (dropdown) {
                e.stopPropagation();
                var willOpen = !dropdown.classList.contains("is-open");
                closeAll();
                dropdown.classList.toggle("is-open", willOpen);
            } else if (!e.target.closest(".cm-dropdown-menu")) {
                closeAll();
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeAll();
        });
    }

    /* ================= 8. TREE RENDERING ================= */
    var STATUS_LABELS = { active: "Active", inactive: "Inactive" };

    function categoryMatchesFilter(cat) {
        var f = state.filter;

        if (f === "all") return true;

        if (f === "active") {
            return categoryStatus(cat) === "active";
        }

        if (f === "inactive") {
            return categoryStatus(cat) === "inactive";
        }

        if (f === "parent") {
            return cat.parent_id === null || cat.parent_id === undefined;
        }

        if (f === "subcategory") {
            return cat.parent_id !== null && cat.parent_id !== undefined;
        }

        if (f === "empty") {
            return productCount(cat) === 0;
        }

        return true;
    }

    function categoryMatchesSearch(cat) {
        if (!state.search) return true;
        var q = state.search.toLowerCase();
        return (
            String(cat.name || "").toLowerCase().indexOf(q) !== -1 ||
            String(cat.slug || "").toLowerCase().indexOf(q) !== -1 ||
            String(cat._parentName || "").toLowerCase().indexOf(q) !== -1
        );
    }

    // A node is visible in the tree if it (or any descendant) matches.
    function nodeVisible(node, parent) {
        var viewNode = Object.assign({}, node, {
            parent_id: Object.prototype.hasOwnProperty.call(node, "parent_id") ? node.parent_id : (parent ? parent.id : null),
            _parentName: parent ? parent.name : null,
            status: categoryStatus(node)
        });
        var selfMatch = categoryMatchesFilter(viewNode) && categoryMatchesSearch(viewNode);
        var childVisible = (node.children || []).some(function (child) { return nodeVisible(child, node); });
        return selfMatch || childVisible;
    }

    function countSubcategories(node) {
        var count = 0;
        (node.children || []).forEach(function (child) {
            count += 1 + countSubcategories(child);
        });
        return count;
    }

    function renderTreeNode(node, depth, parent) {
        if (!nodeVisible(node, parent)) return null;

        node = Object.assign({}, node, {
            _depth: depth || 0,
            _parentName: parent ? parent.name : null,
            parent_id: Object.prototype.hasOwnProperty.call(node, "parent_id") ? node.parent_id : (parent ? parent.id : null),
            status: categoryStatus(node)
        });

        var wrap = document.createElement("div");
        wrap.className = "cm-tree-node";
        wrap.setAttribute("data-cm-depth", node._depth);
        wrap.style.setProperty("--cm-depth", node._depth);

        var hasChildren = node.children && node.children.length > 0;
        var isOpen = state.expanded.has(idKey(node.id)) || !!state.search;

        var row = document.createElement("div");
        row.className = "cm-tree-row";
        row.setAttribute("role", "treeitem");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-expanded", hasChildren ? String(isOpen) : "false");
        row.setAttribute("aria-selected", String(state.activeCategoryId === node.id));
        row.dataset.categoryId = node.id;
        if (state.activeCategoryId === node.id) row.classList.add("is-selected");

        var toggleHtml = hasChildren
            ? '<button type="button" class="cm-tree-toggle' + (isOpen ? " is-open" : "") + '" data-cm-toggle aria-label="' + escapeHtml((isOpen ? "Collapse" : "Expand") + " " + (node.name || "category")) + '"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M9 18l6-6-6-6"></path></svg></button>'
            : '<span class="cm-tree-toggle-spacer"></span>';

        var badgesHtml = "";

        if (categoryStatus(node) === "inactive") {
            badgesHtml += '<span class="cm-badge c-muted">Inactive</span>';
        }

        row.innerHTML =
            toggleHtml +
            '<span class="cm-tree-icon"><i class="' + escapeHtml(node.icon || "bi bi-grid") + '"></i></span>' +
            '<span class="cm-tree-label">' +
            '<span class="cm-tree-name">' + escapeHtml(node.name || "Unnamed Category") + '</span>' +
            '<span class="cm-tree-slug">/' + escapeHtml(node.slug || "") + '</span>' +
            '</span>' +
            '<span class="cm-tree-meta">' +
            '<span class="cm-tree-meta-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8 12 3 3 8l9 5 9-5Z"></path><path d="M3 8v8l9 5 9-5V8"></path></svg>' + productCount(node) + ' products</span>' +
            (hasChildren ? '<span class="cm-tree-meta-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h6v6H4z"></path><path d="M14 4h6v6h-6z"></path></svg>' + childCount(node) + ' sub</span>' : "") +
            '</span>' +
            '<span class="cm-tree-badges">' + badgesHtml + '</span>' +
            '<span class="cm-tree-actions">' +
            '<div class="cm-dropdown">' +
            '<button type="button" class="cm-tree-icon-btn" data-cm-row-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="More actions for ' + escapeHtml(node.name || "category") + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.2"></circle><circle cx="12" cy="12" r="1.2"></circle><circle cx="12" cy="19" r="1.2"></circle></svg></button>' +
            '<div class="cm-dropdown-menu" role="menu">' +
            '<button type="button" class="cm-dropdown-item" data-cm-row-action="view">View / Open</button>' +
            '<button type="button" class="cm-dropdown-item" data-cm-row-action="edit">Edit</button>' +
            '<button type="button" class="cm-dropdown-item" data-cm-row-action="add-sub">Add Subcategory</button>' +
            '<button type="button" class="cm-dropdown-item" data-cm-row-action="move">Move</button>' +
            '<button type="button" class="cm-dropdown-item" data-cm-row-action="assign">Assign Products</button>' +
            '<button type="button" class="cm-dropdown-item" data-cm-row-action="feature">Feature (backend required)</button>' +
            '<button type="button" class="cm-dropdown-item" data-cm-row-action="toggle-status">' + (categoryStatus(node) === "active" ? "Deactivate" : "Activate") + '</button>' +
            '<div class="cm-dropdown-divider"></div>' +
            '<button type="button" class="cm-dropdown-item is-danger" data-cm-row-action="delete">Delete</button>' +
            '</div>' +
            '</div>' +
            '</span>';

        wrap.appendChild(row);

        if (hasChildren) {
            var childrenWrap = document.createElement("div");
            childrenWrap.className = "cm-tree-children" + (isOpen ? " is-open" : "");
            node.children.forEach(function (child) {
                var childEl = renderTreeNode(child, node._depth + 1, node);
                if (childEl) childrenWrap.appendChild(childEl);
            });
            wrap.appendChild(childrenWrap);
        }

        return wrap;
    }

    function renderTree() {
        if (!dom.tree) return;
        dom.tree.innerHTML = "";

        var visibleTopLevel = CATEGORY_TREE.filter(nodeVisible);

        if (!visibleTopLevel.length) {
            dom.treeEmpty.classList.remove("cm-hidden");
            dom.tree.classList.add("cm-hidden");
        } else {
            dom.treeEmpty.classList.add("cm-hidden");
            dom.tree.classList.remove("cm-hidden");
            visibleTopLevel.forEach(function (node) {
                var el = renderTreeNode(node);
                if (el) dom.tree.appendChild(el);
            });
        }

        var totalVisible = allCategoriesFlat().filter(function (c) {
            return categoryMatchesFilter(c) && categoryMatchesSearch(c);
        }).length;
        if (dom.treeResultCount) {
            dom.treeResultCount.textContent = totalVisible + " categor" + (totalVisible === 1 ? "y" : "ies");
        }
    }

    /* ================= 9. TREE INTERACTIONS ================= */
    function initTreeInteractions() {
        if (!dom.tree) return;

        dom.tree.addEventListener("click", function (e) {
            var toggleBtn = e.target.closest("[data-cm-toggle]");
            var rowMenuTrigger = e.target.closest("[data-cm-row-menu-trigger]");
            var rowAction = e.target.closest("[data-cm-row-action]");
            var row = e.target.closest(".cm-tree-row");

            if (toggleBtn) {
                e.stopPropagation();
                var node = row.closest(".cm-tree-node");
                var id = row.dataset.categoryId;
                id = idKey(id);
                if (state.expanded.has(id)) state.expanded.delete(id);
                else state.expanded.add(id);
                renderTree();
                return;
            }

            if (rowAction) {
                e.stopPropagation();
                handleRowAction(rowAction.dataset.cmRowAction, row.dataset.categoryId);
                return;
            }

            if (rowMenuTrigger) {
                return; // handled by initDropdowns delegation
            }

            if (row) {
                openDrawer(row.dataset.categoryId);
            }
        });

        dom.tree.addEventListener("keydown", function (e) {
            if (e.key !== "Enter" && e.key !== " ") return;
            var row = e.target.closest(".cm-tree-row");
            if (row && e.target === row) {
                e.preventDefault();
                openDrawer(row.dataset.categoryId);
            }
        });
    }

    function expandAll() {
        allCategoriesFlat().forEach(function (c) {
            if (c.children && c.children.length) state.expanded.add(idKey(c.id));
        });
        renderTree();
    }
    function collapseAll() {
        state.expanded.clear();
        renderTree();
    }

    function handleRowAction(action, id) {
        var cat = findCategory(id);
        if (!cat) return;

        switch (action) {
            case "view":
                openDrawer(id);
                break;
            case "edit":
                openDrawer(id);
                openCategoryModal("edit", cat);
                break;
            case "add-sub":
                openCategoryModal("add-sub", null, cat);
                break;
            case "move":
                openMoveModal(cat);
                break;
            case "assign":
                openAssignModal(cat);
                break;
            case "feature":
                showToast("Feature state requires backend integration.", "info");
                break;
            case "toggle-status":
                saveCategory(cat.id, { is_active: categoryStatus(cat) !== "active" })
                    .then(function () { showToast('"' + cat.name + '" status updated.', "success"); })
                    .catch(function (error) { showToast(error.message, "danger"); });
                break;
            case "delete":
                openDeleteModal(cat);
                break;
        }
    }

    /* ================= 10. TABLE VIEW ================= */
    function renderTable() {
        if (!dom.tableBody) return;

        dom.tableBody.innerHTML = "";

        var rows = allCategoriesFlat().filter(function (c) {
            return categoryMatchesFilter(c) && categoryMatchesSearch(c);
        });

        rows.sort(function (a, b) {
            if (state.sort === "name") {
                return (a.name || "").localeCompare(b.name || "");
            }

            if (state.sort === "products-desc") {
                return productCount(b) - productCount(a);
            }

            if (state.sort === "created") {
                return new Date(categoryCreated(b)).getTime() - new Date(categoryCreated(a)).getTime();
            }

            return (a.name || "").localeCompare(b.name || "");
        });

        rows.forEach(function (cat) {
            var tr = document.createElement("tr");

            tr.dataset.categoryId = cat.id;

            var sub = countSubcategories(cat);

            tr.innerHTML =
                '<td data-label="">' +
                '<label class="cm-checkbox">' +
                '<input type="checkbox" class="cm-row-checkbox" data-cm-table-check ' +
                (state.selectedTableIds.has(idKey(cat.id)) ? "checked" : "") +
                ' />' +
                '<span class="cm-checkbox-box"></span>' +
                '</label>' +
                '</td>' +

                '<td data-label="Category">' +
                '<div class="cm-table-cat-cell" data-cm-table-open>' +
                '<span class="cm-table-cat-icon">' +
                '<i class="' + escapeHtml(cat.icon || "bi bi-grid") + '"></i>' +
                '</span>' +
                '<span>' +
                '<span class="cm-table-cat-name">' +
                escapeHtml(cat.name || "Unnamed Category") +
                '</span>' +
                '<span class="cm-table-cat-slug">/' +
                escapeHtml(cat.slug || "") +
                '</span>' +
                '</span>' +
                '</div>' +
                '</td>' +

                '<td data-label="Parent">' +
                (cat._parentName || "—") +
                '</td>' +

                '<td data-label="Products">' +
                productCount(cat) +
                '</td>' +

                '<td data-label="Subcategories">' +
                sub +
                '</td>' +

                '<td data-label="Status">' +
                '<span class="cm-badge ' +
                (categoryStatus(cat) === "active" ? "c-success" : "c-muted") +
                '">' +
                (STATUS_LABELS[categoryStatus(cat)] || "Unknown") +
                '</span>' +
                '</td>' +

                '<td data-label="Order">' +
                (cat.analytics.orders === undefined ? "—" : cat.analytics.orders) +
                '</td>' +

                '<td data-label="Created">' +
                escapeHtml(categoryCreated(cat)) +
                '</td>' +

                '<td data-label="" class="cm-col-actions">' +
                '<button type="button" class="cm-tree-icon-btn" ' +
                'data-cm-table-open ' +
                'aria-label="Open ' + escapeHtml(cat.name || "category") + '">' +
                '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M9 18l6-6-6-6"></path>' +
                '</svg>' +
                '</button>' +
                '</td>';

            dom.tableBody.appendChild(tr);
        });
    }

    function initTableInteractions() {
        if (!dom.tableBody) return;

        dom.tableBody.addEventListener("click", function (e) {
            var openTrigger = e.target.closest("[data-cm-table-open]");
            if (openTrigger) {
                var tr = e.target.closest("tr");
                openDrawer(tr.dataset.categoryId);
            }
        });

        dom.tableBody.addEventListener("change", function (e) {
            if (!e.target.matches("[data-cm-table-check]")) return;
            var tr = e.target.closest("tr");
            var id = idKey(tr.dataset.categoryId);
            if (e.target.checked) state.selectedTableIds.add(id);
            else state.selectedTableIds.delete(id);
            updateBulkBar();
        });

        if (dom.tableSelectAll) {
            dom.tableSelectAll.addEventListener("change", function () {
                var checked = dom.tableSelectAll.checked;
                Array.prototype.slice.call(dom.tableBody.querySelectorAll("tr")).forEach(function (tr) {
                    var id = idKey(tr.dataset.categoryId);
                    if (checked) state.selectedTableIds.add(id);
                    else state.selectedTableIds.delete(id);
                });
                renderTable();
                updateBulkBar();
            });
        }
    }

    function updateBulkBar() {
        var count = state.selectedTableIds.size;
        if (dom.bulkCount) dom.bulkCount.textContent = String(count);
        if (dom.bulkBar) dom.bulkBar.classList.toggle("cm-hidden", count === 0);
    }

    /* ================= 20. BULK ACTIONS ================= */
    function initBulkActions() {
        document.querySelectorAll("[data-cm-bulk]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var action = btn.dataset.cmBulk;
                var count = state.selectedTableIds.size;
                if (!count) return;

                var ids = Array.from(state.selectedTableIds);

                if (action === "delete") {
                    showToast(count + " categor" + (count === 1 ? "y" : "ies") + " marked for deletion review.", "danger");
                } else if (action === "activate" || action === "deactivate") {
                    ids.forEach(function (id) {
                        var cat = findCategory(id);
                        if (cat) { cat.is_active = action === "activate"; cat.status = categoryStatus(cat); }
                    });
                    showToast(count + " categor" + (count === 1 ? "y" : "ies") + " " + (action === "activate" ? "activated" : "deactivated") + ".", "success");
                } else if (action === "feature" || action === "hide") {
                    showToast("This action requires backend integration.", "info");
                } else if (action === "export") {
                    showToast("Preparing export for " + count + " categor" + (count === 1 ? "y" : "ies") + "\u2026", "info");
                }

                renderTree();
                renderTable();
            });
        });

        if (dom.clearSelectionBtn) {
            dom.clearSelectionBtn.addEventListener("click", function () {
                state.selectedTableIds.clear();
                renderTable();
                updateBulkBar();
            });
        }
    }

    /* ================= 11. VIEW SWITCHING ================= */
    function initViewSwitch() {
        dom.viewBtns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                var view = btn.dataset.cmView;
                state.view = view;
                dom.viewBtns.forEach(function (b) {
                    var active = b === btn;
                    b.classList.toggle("is-active", active);
                    b.setAttribute("aria-pressed", String(active));
                });
                dom.treeView.classList.toggle("cm-hidden", view !== "tree");
                dom.tableView.classList.toggle("cm-hidden", view !== "table");
                if (view === "table") renderTable();
            });
        });
    }

    /* ================= 12. SEARCH / FILTER / SORT ================= */
    function refreshAll() {
        renderTree();
        if (state.view === "table") renderTable();
    }

    function initFilters() {
        if (dom.searchInput) {
            var debounceTimer = null;
            dom.searchInput.addEventListener("input", function () {
                window.clearTimeout(debounceTimer);
                debounceTimer = window.setTimeout(function () {
                    state.search = dom.searchInput.value.trim();
                    refreshAll();
                }, 200);
            });
        }

        if (dom.chips) {
            dom.chips.addEventListener("click", function (e) {
                var chip = e.target.closest(".cm-chip");
                if (!chip) return;
                dom.chips.querySelectorAll(".cm-chip").forEach(function (c) { c.classList.toggle("is-active", c === chip); });
                state.filter = chip.dataset.cmFilter;
                refreshAll();
            });
        }

        if (dom.sortFilter) {
            dom.sortFilter.addEventListener("change", function () {
                state.sort = dom.sortFilter.value;
                if (state.view === "table") renderTable();
            });
        }

        if (dom.expandAllBtn) dom.expandAllBtn.addEventListener("click", expandAll);
        if (dom.collapseAllBtn) dom.collapseAllBtn.addEventListener("click", collapseAll);
        if (dom.collapseAllHeaderBtn) dom.collapseAllHeaderBtn.addEventListener("click", function () {
            collapseAll();
            showToast("All categories collapsed.", "info");
        });

        function resetFilters() {
            state.search = "";
            state.filter = "all";
            if (dom.searchInput) dom.searchInput.value = "";
            if (dom.chips) {
                dom.chips.querySelectorAll(".cm-chip").forEach(function (c, i) { c.classList.toggle("is-active", i === 0); });
            }
            refreshAll();
        }
        if (dom.resetFiltersBtn) dom.resetFiltersBtn.addEventListener("click", resetFilters);
        if (dom.emptyResetBtn) dom.emptyResetBtn.addEventListener("click", resetFilters);
    }

    /* ================= 13. DRAWER ================= */
    function openDrawer(id) {
        var cat = findCategory(id);
        if (!cat) return;

        state.activeCategoryId = id;
        populateDrawer(cat);

        dom.drawerOverlay.classList.remove("cm-hidden");
        dom.drawerOverlay.setAttribute("aria-hidden", "false");
        window.requestAnimationFrame(function () { dom.drawerOverlay.classList.add("is-open"); });
        document.body.style.overflow = "hidden";

        switchDrawerTab("overview");
        renderTree();
    }

    function closeDrawer() {
        dom.drawerOverlay.classList.remove("is-open");
        document.body.style.overflow = "";
        window.setTimeout(function () {
            dom.drawerOverlay.classList.add("cm-hidden");
            dom.drawerOverlay.setAttribute("aria-hidden", "true");
        }, 300);
        state.activeCategoryId = null;
        renderTree();
    }

    function initDrawer() {
        if (dom.drawerClose) dom.drawerClose.addEventListener("click", closeDrawer);
        if (dom.drawerOverlay) {
            dom.drawerOverlay.addEventListener("click", function (e) {
                if (e.target === dom.drawerOverlay) closeDrawer();
            });
        }
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && dom.drawerOverlay.classList.contains("is-open")) closeDrawer();
        });

        if (dom.drawerTabs) {
            dom.drawerTabs.addEventListener("click", function (e) {
                var tab = e.target.closest(".cm-drawer-tab");
                if (tab) switchDrawerTab(tab.dataset.cmTab);
            });
        }

        document.querySelectorAll("[data-cm-goto-tab]").forEach(function (el) {
            el.addEventListener("click", function () { switchDrawerTab(el.dataset.cmGotoTab); });
        });
    }

    function switchDrawerTab(name) {
        document.querySelectorAll(".cm-drawer-tab").forEach(function (t) {
            var active = t.dataset.cmTab === name;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", String(active));
        });
        document.querySelectorAll(".cm-drawer-panel").forEach(function (p) {
            p.classList.toggle("is-active", p.dataset.cmPanel === name);
        });
        if (name === "analytics") {
            window.setTimeout(function () {
                var barChart = document.getElementById("cmGrowthChart");
                if (barChart) barChart.classList.add("is-animated");
            }, 60);
        }
    }

    /* ================= 14. DRAWER PANELS ================= */
    function populateDrawer(cat) {
        var sub = childCount(cat);
        var analytics = cat.analytics || {};

        // Header
        document.getElementById("cmDrawerIcon").innerHTML = '<i class="' + escapeHtml(cat.icon || "bi bi-grid") + '"></i>';
        document.getElementById("cmDrawerTitle").textContent = cat.name;
        document.getElementById("cmDrawerSlug").textContent = "/" + (cat.slug || "");
        document.getElementById("cmDrawerParent").textContent = cat._parentName || (cat.parent && cat.parent.name) || "— Top Level —";
        document.getElementById("cmDrawerCreated").textContent = categoryCreated(cat);
        document.getElementById("cmDrawerUpdated").textContent = categoryUpdated(cat);
        document.getElementById("cmDrawerProductCount").textContent = productCount(cat);
        document.getElementById("cmDrawerSubCount").textContent = sub;

        var statusBadge = document.getElementById("cmDrawerStatusBadge");
        statusBadge.textContent = STATUS_LABELS[categoryStatus(cat)] || "Unknown";
        statusBadge.className = "cm-badge " + (categoryStatus(cat) === "active" ? "c-success" : "c-muted");

        document.getElementById("cmDrawerFeaturedBadge").classList.add("cm-hidden");
        document.getElementById("cmDrawerFeatureLabel").textContent = "Feature (backend required)";
        document.getElementById("cmDrawerToggleStatusLabel").textContent = categoryStatus(cat) === "active" ? "Deactivate" : "Activate";

        // Overview
        document.getElementById("ovTotalProducts").textContent = productCount(cat);
        document.getElementById("ovPublished").textContent = analytics.published === undefined ? "—" : analytics.published;
        document.getElementById("ovPending").textContent = analytics.pending === undefined ? "—" : analytics.pending;
        document.getElementById("ovOutOfStock").textContent = analytics.out_of_stock === undefined ? "—" : analytics.out_of_stock;
        document.getElementById("ovSubcategories").textContent = sub;
        document.getElementById("ovOrders").textContent = analytics.orders === undefined ? "—" : analytics.orders;
        document.getElementById("ovRevenue").textContent = analytics.revenue === undefined ? "—" : "Rs. " + analytics.revenue;
        document.getElementById("ovConversion").textContent = analytics.conversion_rate === undefined || analytics.conversion_rate === null ? "—" : analytics.conversion_rate + "%";
        document.getElementById("ovDescription").textContent = cat.description || "No description provided yet.";

        // Information
        populateInfoPanel(cat);

        // SEO
        populateSeoPanel(cat);

        // Display Settings
        ["tgFeatured", "tgHomepage", "tgNav", "tgFooter", "tgVisible", "tgAllowProducts", "tgAllowSub", "dispOrder"].forEach(function (id) {
            var field = document.getElementById(id);
            if (field) { field.checked = false; field.value = ""; field.disabled = true; }
        });
        document.getElementById("dispIcon").value = cat.icon || "";

        // Subcategories
        renderSubcategoriesPanel(cat);

        // Products
        renderProductsPanel(cat);

        // Analytics
        renderTopProducts(cat);
        renderAnalytics(cat);

        // Activity
        renderActivityTimeline(cat);

        // exit edit mode if it was open
        state.infoEditing = false;
        document.getElementById("cmInfoDisplay").classList.remove("cm-hidden");
        document.getElementById("cmInfoForm").classList.add("cm-hidden");
    }

    function populateInfoPanel(cat) {
        document.getElementById("infoName").textContent = cat.name;
        document.getElementById("infoSlug").textContent = "/" + cat.slug;
        document.getElementById("infoParent").textContent = cat._parentName || (cat.parent && cat.parent.name) || "— Top Level —";
        document.getElementById("infoType").textContent = cat.type || "—";
        document.getElementById("infoStatus").textContent = STATUS_LABELS[categoryStatus(cat)] || "Unknown";
        document.getElementById("infoOrder").textContent = "—";
        document.getElementById("infoIcon").textContent = cat.icon || "—";
        document.getElementById("infoFeatured").textContent = cat.featured === undefined ? "—" : (cat.featured ? "Yes" : "No");
        document.getElementById("infoDescription").textContent = cat.description || "No description provided yet.";

        // populate form for edit mode
        document.getElementById("fName").value = cat.name;
        document.getElementById("fSlug").value = cat.slug;
        document.getElementById("fType").value = "";
        document.getElementById("fStatus").value = categoryStatus(cat);
        document.getElementById("fOrder").value = "";
        document.getElementById("fIcon").value = cat.icon || "";
        document.getElementById("fDescription").value = cat.description || "";
        document.getElementById("fImage").value = "";
        populateParentSelect(document.getElementById("fParent"), cat.id, cat._parentName);
    }

    function populateParentSelect(selectEl, excludeId, selectedName) {
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="">— No Parent (Top Level) —</option>';
        var excluded = new Set();
        if (excludeId !== null && excludeId !== undefined) {
            excluded.add(idKey(excludeId));
            var current = findCategory(excludeId);
            (function collect(children) {
                (children || []).forEach(function (child) { excluded.add(idKey(child.id)); collect(child.children); });
            })(current && current.children);
        }
        allCategoriesFlat().forEach(function (c) {
            if (excluded.has(idKey(c.id))) return;
            var opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = (c._depth > 0 ? "— " : "") + c.name;
            if (selectedName && c.name === selectedName) opt.selected = true;
            selectEl.appendChild(opt);
        });
    }

    function populateSeoPanel(cat) {
        var title = cat.seo_title || "";
        var desc = cat.seo_description || "";
        var keywords = cat.seo_keywords || "";
        document.getElementById("seoTitle").value = title;
        document.getElementById("seoDesc").value = desc;
        document.getElementById("seoKeywords").value = keywords;
        document.getElementById("seoCanonical").value = cat.seo_canonical || "";
        document.getElementById("seoPreviewUrl").textContent = cat.seo_canonical || "—";
        document.getElementById("seoPreviewTitle").textContent = title;
        document.getElementById("seoPreviewDesc").textContent = desc;
    }

    function renderSubcategoriesPanel(cat) {
        var list = document.getElementById("cmSubList");
        var empty = document.getElementById("cmSubEmptyState");
        list.innerHTML = "";

        if (!cat.children || !cat.children.length) {
            empty.classList.remove("cm-hidden");
            return;
        }
        empty.classList.add("cm-hidden");

        cat.children.forEach(function (child) {
            var row = document.createElement("div");
            row.className = "cm-sub-row";
            row.innerHTML =
                '<span class="cm-sub-icon"><i class="' + escapeHtml(child.icon || "bi bi-grid") + '"></i></span>' +
                '<span class="cm-sub-info"><strong>' + escapeHtml(child.name || "Unnamed Category") + '</strong><span>' + productCount(child) + ' products &middot; ' + (STATUS_LABELS[categoryStatus(child)] || "Unknown") + '</span></span>' +
                '<span class="cm-sub-actions">' +
                '<button type="button" class="cm-tree-icon-btn" data-cm-sub-open="' + escapeHtml(child.id) + '" aria-label="Open ' + escapeHtml(child.name || "category") + '"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"></path></svg></button>' +
                '</span>';
            list.appendChild(row);
        });

        list.querySelectorAll("[data-cm-sub-open]").forEach(function (btn) {
            btn.addEventListener("click", function () { openDrawer(btn.dataset.cmSubOpen); });
        });
    }

    function renderProductsPanel(cat) {
        var body = document.getElementById("cmProductsTableBody");
        body.innerHTML = "";
        var products = Array.isArray(cat.products) ? cat.products : [];
        if (!products.length) {
            var tr = document.createElement("tr");
            tr.innerHTML = '<td colspan="8" style="text-align:center;color:var(--cm-caption);padding:24px;">Product details are unavailable in category data.</td>';
            body.appendChild(tr);
            return;
        }
        products.slice(0, 6).forEach(function (p) {
            var tr = document.createElement("tr");
            var statusBadge = p.status === "published" ? "c-success" : (p.status === "out_of_stock" ? "c-danger" : "c-muted");
            tr.innerHTML =
                '<td data-label="Product" onclick="window.open(\'/product/' + p.slug + '/\', \'_blank\')">' + '<strong>' + escapeHtml(p.name || "Unnamed Product") + '</strong>' + '</td>' +
                '<td data-label="SKU">' + escapeHtml(p.sku || "—") + '</td>' +
                '<td data-label="Seller">' + escapeHtml(p.seller || "—") + '</td>' +
                '<td data-label="Price">' + escapeHtml(p.price || "—") + '</td>' +
                '<td data-label="Stock">' + escapeHtml(p.stock_quantity === undefined ? "—" : p.stock_quantity) + '</td>' +
                '<td data-label="Status"><span class="cm-badge ' + statusBadge + '">' + escapeHtml(p.status || "—") + '</span></td>' +
                '<td data-label="Orders">' + escapeHtml(p.orders === undefined ? "—" : p.orders) + '</td>' +
                '<td data-label="" class="cm-col-actions">—</td>';
            body.appendChild(tr);
        });
    }

    function renderTopProducts(cat) {
        var list = document.getElementById("cmTopProductsList");
        if (!list) return;
        list.innerHTML = "";
        var products = cat && cat.analytics && Array.isArray(cat.analytics.top_products) ? cat.analytics.top_products : [];
        if (!products.length) {
            list.textContent = "No paid orders recorded for this category.";
            return;
        }
        var max = Number(products[0].orders) || 1;
        products.forEach(function (product, index) {
            var row = document.createElement("div");
            row.className = "cm-top-row";
            var pct = Math.round((Number(product.orders) / max) * 100);
            row.innerHTML = '<span class="cm-top-rank">' + (index + 1) + '</span>' +
                '<span class="cm-top-info"><strong>' + escapeHtml(product.name || "Unnamed Product") + '</strong><span class="cm-top-bar"><span class="cm-top-bar-fill" style="width:' + pct + '%;"></span></span></span>' +
                '<span class="cm-top-value">' + escapeHtml(product.orders) + ' sold</span>';
            list.appendChild(row);
        });
    }

    function renderAnalytics(cat) {
        var analytics = cat && cat.analytics ? cat.analytics : {};
        var revenueChart = document.getElementById("cmRevenueChart");
        var growthChart = document.getElementById("cmGrowthChart");
        if (revenueChart) {
            var revenuePoints = Array.isArray(analytics.revenue_trend) ? analytics.revenue_trend : [];
            var revenueSvg = revenueChart.querySelector("svg");
            var revenuePath = revenueChart.querySelector(".cm-line-chart-path");
            var revenueArea = revenueChart.querySelector(".cm-line-chart-area");
            if (revenueSvg && revenuePath && revenueArea && revenuePoints.length) {
                var width = 480;
                var height = 180;
                var values = revenuePoints.map(function (item) { return Number(item.value) || 0; });
                var maxValue = Math.max.apply(Math, values);
                var minValue = Math.min.apply(Math, values);
                var range = maxValue - minValue || 1;
                var points = values.map(function (value, index) {
                    var x = revenuePoints.length === 1 ? width / 2 : (index * width) / (revenuePoints.length - 1);
                    var y = height - 18 - ((value - minValue) / range) * (height - 36);
                    return Math.round(x) + "," + Math.round(y);
                });
                revenuePath.setAttribute("d", "M" + points.join(" L"));
                revenueArea.setAttribute("d", "M" + points.join(" L") + " L" + width + "," + height + " L0," + height + " Z");
                revenueSvg.setAttribute("aria-label", "Monthly revenue trend");
            }
        }
        if (growthChart) {
            var growthPoints = Array.isArray(analytics.growth_trend) ? analytics.growth_trend : [];
            var growthValues = growthPoints.map(function (item) { return Number(item.value) || 0; });
            var growthMax = growthValues.length ? Math.max.apply(Math, growthValues) : 0;
            growthChart.innerHTML = growthPoints.map(function (item) {
                var value = Number(item.value) || 0;
                var barHeight = growthMax ? Math.max(4, Math.round((value / growthMax) * 100)) : 4;
                var bar = document.createElement("span");
                bar.style.setProperty("--cm-bar-h", barHeight + "%");
                bar.setAttribute("title", item.label + ": " + value + " paid orders");
                return bar.outerHTML;
            }).join("");
            var caption = growthChart.nextElementSibling;
            if (caption) {
                caption.innerHTML = growthPoints.map(function (item) {
                    return "<span>" + escapeHtml(item.label) + "</span>";
                }).join("");
            }
        }
        var kpis = document.querySelectorAll('[data-cm-panel="analytics"] .cm-kpi-card strong');
        if (kpis.length >= 4) {
            kpis[0].textContent = analytics.views === undefined ? "—" : analytics.views;
            kpis[1].textContent = analytics.conversion_rate === undefined || analytics.conversion_rate === null ? "—" : analytics.conversion_rate + "%";
            kpis[2].textContent = analytics.wishlist_adds === undefined ? "—" : analytics.wishlist_adds;
            kpis[3].textContent = analytics.sales_growth === undefined || analytics.sales_growth === null ? "—" : analytics.sales_growth + "%";
        }
    }

    function renderActivityTimeline(cat, filter) {
        filter = filter || "all";
        var ul = document.getElementById("cmActivityTimeline");
        if (!ul) return;
        ul.innerHTML = "";

        var dotClassMap = { success: "c-success", warning: "c-warning", danger: "c-danger", info: "c-info" };

        var events = [];
        if (cat && cat.created_at) events.push({ type: "category", title: "Category created", desc: "Category was created in the catalog.", actor: "", time: categoryCreated(cat), status: "success" });
        if (cat && cat.updated_at && cat.updated_at !== cat.created_at) events.push({ type: "category", title: "Category updated", desc: "Category details were updated.", actor: "", time: categoryUpdated(cat), status: "info" });
        events.forEach(function (ev) {
            if (filter !== "all" && ev.type !== filter) return;
            var li = document.createElement("li");
            li.className = "cm-timeline-item";
            li.innerHTML =
                '<span class="cm-timeline-dot ' + (dotClassMap[ev.status] || "") + '"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle></svg></span>' +
                '<div class="cm-timeline-body">' +
                '<div class="cm-timeline-top"><strong>' + ev.title + '</strong></div>' +
                '<p>' + ev.desc + '</p>' +
                '<span class="cm-timeline-time">' + (ev.actor ? escapeHtml(ev.actor) + ' &middot; ' : '') + escapeHtml(ev.time) + '</span>' +
                '</div>';
            ul.appendChild(li);
        });
    }

    function initActivityFilters() {
        var bar = document.getElementById("cmActivityFilters");
        if (!bar) return;
        bar.addEventListener("click", function (e) {
            var pill = e.target.closest(".cm-pill");
            if (!pill) return;
            bar.querySelectorAll(".cm-pill").forEach(function (p) { p.classList.toggle("is-active", p === pill); });
            renderActivityTimeline(findCategory(state.activeCategoryId), pill.dataset.cmActivityFilter);
        });
    }

    /* ---- Info edit toggle & save ---- */
    function initInfoEdit() {
        var toggleBtn = document.getElementById("cmInfoEditToggle");
        var editBtn = document.getElementById("cmDrawerEditBtn");
        var cancelBtn = document.getElementById("cmInfoCancelBtn");
        var saveBtn = document.getElementById("cmInfoSaveBtn");
        var display = document.getElementById("cmInfoDisplay");
        var form = document.getElementById("cmInfoForm");

        function enterEdit() {
            switchDrawerTab("information");
            display.classList.add("cm-hidden");
            form.classList.remove("cm-hidden");
        }
        function exitEdit() {
            display.classList.remove("cm-hidden");
            form.classList.add("cm-hidden");
        }

        if (toggleBtn) toggleBtn.addEventListener("click", enterEdit);
        if (editBtn) editBtn.addEventListener("click", enterEdit);
        if (cancelBtn) cancelBtn.addEventListener("click", exitEdit);

        if (saveBtn) {
            saveBtn.addEventListener("click", function () {
                var cat = findCategory(state.activeCategoryId);

                if (!cat) return;

                var imageInput = document.getElementById("fImage");

                var categoryData = {
                    name: document.getElementById("fName").value.trim(),
                    slug: document.getElementById("fSlug").value.trim(),
                    parent_id: document.getElementById("fParent").value || "",
                    is_active: document.getElementById("fStatus").value === "active",
                    icon: document.getElementById("fIcon").value.trim(),
                    description: document.getElementById("fDescription").value.trim(),
                    image: imageInput && imageInput.files.length
                        ? imageInput.files[0]
                        : null
                };

                if (!categoryData.name) {
                    showToast("Category name is required.", "danger");
                    return;
                }

                if (!categoryData.slug) {
                    showToast("Category slug is required.", "danger");
                    return;
                }

                saveCategory(cat.id, categoryData)
                    .then(function () {
                        exitEdit();
                        showToast("Category updated.", "success");
                    })
                    .catch(function (error) {
                        showToast(
                            error.message || "Failed to update category.",
                            "danger"
                        );
                    });
            });
        }
    }

    function initSeoPanel() {
        var saveBtn = document.getElementById("cmSeoSaveBtn");
        var resetBtn = document.getElementById("cmSeoResetBtn");
        ["seoTitle", "seoDesc", "seoKeywords"].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", function () {
                document.getElementById("seoPreviewTitle").textContent = document.getElementById("seoTitle").value;
                document.getElementById("seoPreviewDesc").textContent = document.getElementById("seoDesc").value;
            });
        });
        if (saveBtn) saveBtn.addEventListener("click", function () { showToast("SEO settings saved locally.", "success"); });
        if (resetBtn) resetBtn.addEventListener("click", function () {
            var cat = findCategory(state.activeCategoryId);
            if (cat) populateSeoPanel(cat);
            showToast("SEO fields reset.", "info");
        });
    }

    function initDisplaySettingsPanel() {
        var saveBtn = document.getElementById("cmDisplaySaveBtn");
        var resetBtn = document.getElementById("cmDisplayResetBtn");
        if (saveBtn) {
            saveBtn.addEventListener("click", function () {
                var cat = findCategory(state.activeCategoryId);
                if (!cat) return;
                showToast("Display settings require backend fields and integration.", "info");
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener("click", function () {
                var cat = findCategory(state.activeCategoryId);
                if (cat) populateDrawer(cat);
                showToast("Display settings reset.", "info");
            });
        }
    }

    function initDrawerQuickActions() {
        document.getElementById("qaAddSub").addEventListener("click", function () {
            var cat = findCategory(state.activeCategoryId);
            openCategoryModal("add-sub", null, cat);
        });
        document.getElementById("qaAssign").addEventListener("click", function () {
            var cat = findCategory(state.activeCategoryId);
            openAssignModal(cat);
        });
        document.getElementById("qaMove").addEventListener("click", function () {
            var cat = findCategory(state.activeCategoryId);
            openMoveModal(cat);
        });
        document.getElementById("cmAddSubBtn2").addEventListener("click", function () {
            var cat = findCategory(state.activeCategoryId);
            openCategoryModal("add-sub", null, cat);
        });
        document.getElementById("cmDrawerAddSubBtn").addEventListener("click", function () {
            var cat = findCategory(state.activeCategoryId);
            openCategoryModal("add-sub", null, cat);
        });
        document.getElementById("cmDrawerMoveBtn").addEventListener("click", function () {
            openMoveModal(findCategory(state.activeCategoryId));
        });
        document.getElementById("cmDrawerAssignBtn").addEventListener("click", function () {
            openAssignModal(findCategory(state.activeCategoryId));
        });
        document.getElementById("cmDrawerFeatureBtn").addEventListener("click", function () {
            handleRowAction("feature", state.activeCategoryId);
        });
        document.getElementById("cmDrawerToggleStatusBtn").addEventListener("click", function () {
            handleRowAction("toggle-status", state.activeCategoryId);
        });
        document.getElementById("cmDrawerDeleteBtn").addEventListener("click", function () {
            openDeleteModal(findCategory(state.activeCategoryId));
        });
        document.getElementById("cmViewAllProductsBtn").addEventListener("click", function () {
            showToast("Opening Product Management filtered by this category\u2026", "info");
        });
    }

    /* ================= 15. ADD / EDIT CATEGORY MODAL ================= */
    var categoryModalMode = "add"; // add | edit | add-sub
    var categoryModalTargetParent = null;
    var categoryModalEditingCat = null;

    function openCategoryModal(mode, cat, parentCat) {
        categoryModalMode = mode;
        categoryModalEditingCat = cat || null;
        categoryModalTargetParent = parentCat || null;

        var title = mode === "edit" ? "Edit Category" : (mode === "add-sub" ? "Add Subcategory" : "Add Category");
        dom.categoryModalTitle.textContent = title;
        dom.categoryModalSubmit.textContent = mode === "edit" ? "Save Changes" : "Create Category";

        populateParentSelect(document.getElementById("mParent"), cat ? cat.id : null, cat ? cat._parentName : null);

        if (mode === "edit" && cat) {
            document.getElementById("mName").value = cat.name || "";
            document.getElementById("mSlug").value = cat.slug || "";
            document.getElementById("mParent").value = cat.parent_id === null || cat.parent_id === undefined ? "" : String(cat.parent_id);
            document.getElementById("mType").value = "";
            document.getElementById("mStatus").value = categoryStatus(cat);
            document.getElementById("mOrder").value = "";
            document.getElementById("mIcon").value = cat.icon || "";
            document.getElementById("mDescription").value = cat.description || "";
            document.getElementById("mImage").value = "";
            ["mFeatured", "mHomepage", "mNav", "mAllowProducts", "mAllowSub"].forEach(function (id) { document.getElementById(id).checked = false; document.getElementById(id).disabled = true; });
        } else {
            document.getElementById("mName").value = "";
            document.getElementById("mSlug").value = "";
            document.getElementById("mParent").value = parentCat ? parentCat.id : "";
            document.getElementById("mType").value = "";
            document.getElementById("mStatus").value = "active";
            document.getElementById("mOrder").value = "";
            document.getElementById("mIcon").value = "";
            document.getElementById("mDescription").value = "";
            document.getElementById("mImage").value = "";
            ["mFeatured", "mHomepage", "mNav", "mAllowProducts", "mAllowSub"].forEach(function (id) { document.getElementById(id).checked = false; document.getElementById(id).disabled = true; });
        }

        openModal(dom.categoryModal);
    }

    function initCategoryModal() {
        if (dom.addCategoryBtn) {
            dom.addCategoryBtn.addEventListener("click", function () { openCategoryModal("add"); });
        }

        if (dom.categoryModalSubmit) {
            dom.categoryModalSubmit.addEventListener("click", function () {
                var name = document.getElementById("mName").value.trim();
                if (!name) { showToast("Category name is required.", "danger"); return; }
                if (!document.getElementById("mSlug").value.trim()) { showToast("Category slug is required.", "danger"); return; }

                if (categoryModalMode === "edit" && categoryModalEditingCat) {

                    var cat = categoryModalEditingCat;

                    var imageInput = document.getElementById("mImage");
                    var imageFile = imageInput && imageInput.files.length
                        ? imageInput.files[0]
                        : null;

                    var categoryData = {
                        name: name,
                        slug: document.getElementById("mSlug").value.trim(),
                        parent_id: document.getElementById("mParent").value || "",
                        is_active: document.getElementById("mStatus").value === "active",
                        icon: document.getElementById("mIcon").value.trim(),
                        description: document.getElementById("mDescription").value.trim(),
                        image: imageFile
                    };

                    saveCategory(cat.id, categoryData)
                        .then(function () {
                            closeModal(dom.categoryModal);
                            showToast("Category updated.", "success");
                        })
                        .catch(function (error) {
                            showToast(error.message || "Failed to update category.", "danger");
                        });

                } else {

                    var imageInput = document.getElementById("mImage");
                    var imageFile = imageInput && imageInput.files.length
                        ? imageInput.files[0]
                        : null;

                    var categoryData = {
                        name: name,
                        slug: document.getElementById("mSlug").value.trim(),
                        parent_id: document.getElementById("mParent").value || "",
                        is_active: document.getElementById("mStatus").value === "active",
                        icon: document.getElementById("mIcon").value.trim(),
                        description: document.getElementById("mDescription").value.trim(),
                        image: imageFile
                    };
                    saveCategory(null, categoryData)
                        .then(function () {
                            closeModal(dom.categoryModal);
                            showToast("Category created.", "success");
                        })
                        .catch(function (error) {
                            showToast(error.message || "Failed to create category.", "danger");
                        });
                }
            });
        }
    }

    /* ================= 16. MOVE CATEGORY MODAL ================= */
    var moveModalCat = null;
    function openMoveModal(cat) {
        if (!cat) return;
        moveModalCat = cat;
        document.getElementById("moveCurrentParent").value = cat._parentName || "— Top Level —";
        populateParentSelect(document.getElementById("moveNewParent"), cat.id, null);
        document.getElementById("moveFromPreview").textContent = (cat._parentName ? cat._parentName + " \u203a " : "") + cat.name;
        document.getElementById("moveToPreview").textContent = (cat._parentName ? cat._parentName + " \u203a " : "") + cat.name;
        openModal(dom.moveModal);
    }

    function initMoveModal() {
        var newParentSelect = document.getElementById("moveNewParent");
        if (newParentSelect) {
            newParentSelect.addEventListener("change", function () {
                var selectedOption = newParentSelect.options[newParentSelect.selectedIndex];
                var parentName = newParentSelect.value ? selectedOption.textContent.replace(/^—\s*/, "") : "Top Level";
                document.getElementById("moveToPreview").textContent = (newParentSelect.value ? parentName + " \u203a " : "") + (moveModalCat ? moveModalCat.name : "");
            });
        }

        var confirmBtn = document.getElementById("cmMoveConfirmBtn");
        if (confirmBtn) {
            confirmBtn.addEventListener("click", function () {
                if (!moveModalCat) return;
                saveCategory(moveModalCat.id, { parent_id: newParentSelect.value || null })
                    .then(function () { closeModal(dom.moveModal); showToast("Category moved.", "success"); })
                    .catch(function (error) { showToast(error.message, "danger"); });
            });
        }
    }

    /* ================= 17. ASSIGN PRODUCTS MODAL ================= */
    var assignSelected = new Set();
    var assignTargetCat = null;

    function openAssignModal(cat) {
        assignTargetCat = cat;
        assignSelected.clear();
        document.getElementById("assignTargetName").textContent = cat ? cat.name : "this category";
        renderAssignList();
        updateAssignCount();
        openModal(dom.assignModal);
    }

    function renderAssignList(filterText) {
        var list = document.getElementById("cmAssignList");
        list.innerHTML = "";
        list.textContent = "Product assignment requires product data and backend integration.";
    }

    function updateAssignCount() {
        var el = document.getElementById("assignSelectedCount");
        if (el) el.textContent = assignSelected.size + " selected";
    }

    function initAssignModal() {
        var searchInput = document.getElementById("assignSearchInput");
        if (searchInput) {
            searchInput.addEventListener("input", function () { renderAssignList(searchInput.value.trim()); });
        }
        var selectAllBtn = document.getElementById("assignSelectAllBtn");
        if (selectAllBtn) {
            selectAllBtn.addEventListener("click", function () {
                renderAssignList(searchInput ? searchInput.value.trim() : "");
                updateAssignCount();
            });
        }
        var clearBtn = document.getElementById("assignClearBtn");
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                assignSelected.clear();
                renderAssignList(searchInput ? searchInput.value.trim() : "");
                updateAssignCount();
            });
        }
        var confirmBtn = document.getElementById("cmAssignConfirmBtn");
        if (confirmBtn) {
            confirmBtn.addEventListener("click", function () {
                if (!assignSelected.size) { showToast("Select at least one product to assign.", "danger"); return; }
                showToast("Product assignment requires backend integration.", "info");
            });
        }
    }

    /* ================= 18. DELETE CATEGORY WORKFLOW ================= */
    var deleteTargetCat = null;

    function openDeleteModal(cat) {
        if (!cat) return;
        deleteTargetCat = cat;
        document.getElementById("deleteTargetName").textContent = cat.name;
        document.getElementById("deleteProductCount").textContent = productCount(cat);
        document.getElementById("deleteSubCount").textContent = countSubcategories(cat);
        var input = document.getElementById("deleteConfirmInput");
        var confirmBtn = document.getElementById("cmDeleteConfirmBtn");
        input.value = "";
        confirmBtn.disabled = true;
        openModal(dom.deleteModal);
    }

    function removeCategoryFromTree(cat) {
        function removeFrom(list) {
            var idx = list.findIndex(function (c) { return c.id === cat.id; });
            if (idx !== -1) { list.splice(idx, 1); return true; }
            return list.some(function (c) { return c.children && removeFrom(c.children); });
        }
        removeFrom(CATEGORY_TREE);
    }

    function initDeleteModal() {
        var input = document.getElementById("deleteConfirmInput");
        var confirmBtn = document.getElementById("cmDeleteConfirmBtn");
        var deactivateBtn = document.getElementById("cmDeactivateInsteadBtn");

        if (input && confirmBtn) {
            input.addEventListener("input", function () {
                confirmBtn.disabled = input.value.trim().toUpperCase() !== "DELETE";
            });
            confirmBtn.addEventListener("click", function () {
                if (confirmBtn.disabled || !deleteTargetCat) return;
                apiRequest(categoryApiUrl(deleteTargetCat.id), { method: "DELETE" })
                    .then(function () {
                        closeModal(dom.deleteModal);
                        if (state.activeCategoryId === deleteTargetCat.id) closeDrawer();
                        deleteTargetCat = null;
                        return reloadCategories();
                    }).then(function () { showToast("Category deleted.", "success"); })
                    .catch(function (error) { showToast(error.message, "danger"); });
            });
        }

        if (deactivateBtn) {
            deactivateBtn.addEventListener("click", function () {
                if (!deleteTargetCat) return;
                saveCategory(deleteTargetCat.id, { is_active: false })
                    .then(function () { closeModal(dom.deleteModal); showToast("Category deactivated.", "success"); })
                    .catch(function (error) { showToast(error.message, "danger"); });
            });
        }
    }

    /* ================= 19. IMPORT / EXPORT MODALS ================= */

    function downloadCategoryExport() {
        var scope = document.getElementById("exportScope");
        var format = document.getElementById("exportFormat");
        var scopeValue = scope ? scope.value : "Export All Categories";
        var formatValue = format ? String(format.value || "CSV").toUpperCase() : "CSV";
        var ids = [];

        if (scopeValue === "Export Selected") {
            ids = Array.from(state.selectedTableIds);
            if (!ids.length) { showToast("Select at least one category to export.", "danger"); return; }
        } else if (scopeValue === "Export Visible (filtered)") {
            ids = allCategoriesFlat().filter(function (cat) {
                return categoryMatchesFilter(cat) && categoryMatchesSearch(cat);
            }).map(function (cat) { return cat.id; });
            if (!ids.length) { showToast("There are no visible categories to export.", "danger"); return; }
        }

        if (!CATEGORY_EXPORT_URL) { showToast("Category export is not configured.", "danger"); return; }
        var params = new URLSearchParams();
        params.set("format", formatValue);
        ids.forEach(function (id) { params.append("category_id", idKey(id)); });

        fetch(CATEGORY_EXPORT_URL + "?" + params.toString(), {
            credentials: "same-origin",
            headers: { "Accept": "text/csv, application/json, application/pdf" }
        }).then(function (response) {
            if (!response.ok) return response.json().catch(function () { return {}; }).then(function (payload) {
                throw new Error(payload.error || "Unable to export categories.");
            });
            var disposition = response.headers.get("Content-Disposition") || "";
            var match = disposition.match(/filename="?([^";]+)"?/i);
            return response.blob().then(function (blob) {
                return { blob: blob, filename: match ? match[1] : "categories." + formatValue.toLowerCase() };
            });
        }).then(function (result) {
            var link = document.createElement("a");
            link.href = URL.createObjectURL(result.blob);
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            window.setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
            closeModal(dom.exportModal);
            showToast("Categories exported successfully.", "success");
        }).catch(function (error) { showToast(error.message || "Unable to export categories.", "danger"); });
    }

    function parseCsv(text) {
        var rows = [], row = [], value = "", quoted = false;
        for (var i = 0; i < text.length; i += 1) {
            var char = text[i], next = text[i + 1];
            if (char === '"' && quoted && next === '"') { value += '"'; i += 1; continue; }
            if (char === '"') { quoted = !quoted; continue; }
            if (char === "," && !quoted) { row.push(value); value = ""; continue; }
            if ((char === "\n" || char === "\r") && !quoted) {
                if (char === "\r" && next === "\n") i += 1;
                row.push(value); value = "";
                if (row.some(function (cell) { return cell.trim() !== ""; })) rows.push(row);
                row = [];
                continue;
            }
            value += char;
        }
        if (value !== "" || row.length) { row.push(value); if (row.some(function (cell) { return cell.trim() !== ""; })) rows.push(row); }
        if (rows.length < 2) return [];
        var headers = rows.shift().map(function (header) { return header.trim().toLowerCase().replace(/[\s-]+/g, "_"); });
        return rows.map(function (cells) {
            var item = {};
            headers.forEach(function (header, index) { item[header] = (cells[index] || "").trim(); });
            return item;
        });
    }

    function flattenImportData(data, parent) {
        var result = [];
        if (!Array.isArray(data)) return result;
        data.forEach(function (item) {
            if (!item || typeof item !== "object") return;
            var copy = Object.assign({}, item);
            if ((copy.parent_id === undefined || copy.parent_id === null || copy.parent_id === "") && parent) copy.parent_id = parent.id;
            result.push(copy);
            if (Array.isArray(item.children)) result = result.concat(flattenImportData(item.children, item));
        });
        return result;
    }

    function importRowsFromText(text, filename) {
        var extension = filename.toLowerCase().split(".").pop();
        if (extension === "json") {
            var parsed = JSON.parse(text);
            var data = parsed && (parsed.category_tree || parsed.categories) ? (parsed.category_tree || parsed.categories) : parsed;
            return flattenImportData(data);
        }
        if (extension === "csv") return parseCsv(text);
        throw new Error("Only CSV and JSON category files are supported.");
    }

    function importCategoryRow(row) {
        var name = String(row.name || row.category || "").trim();
        var slug = String(row.slug || "").trim();
        if (!name || !slug) return Promise.reject(new Error("Each imported category needs a name and slug."));
        var existing = row.id ? findCategory(row.id) : null;
        if (!existing) existing = allCategoriesFlat().find(function (cat) { return cat.slug === slug; });
        var parentValue = row.parent_id === undefined ? row.parent : row.parent_id;
        if (parentValue && typeof parentValue === "object") parentValue = parentValue.id || parentValue.slug || parentValue.name;
        var parentId = "";
        if (parentValue !== undefined && parentValue !== null && String(parentValue).trim() !== "") {
            var parent = findCategory(parentValue) || allCategoriesFlat().find(function (cat) {
                return cat.slug === String(parentValue) || cat.name.toLowerCase() === String(parentValue).toLowerCase();
            });
            if (!parent) return Promise.reject(new Error("Parent category not found for " + name + "."));
            if (existing && sameId(parent.id, existing.id)) return Promise.reject(new Error("A category cannot be its own parent: " + name + "."));
            parentId = parent.id;
        }
        var activeValue = row.is_active;
        if (activeValue === undefined || activeValue === "") activeValue = String(row.status || "active").toLowerCase() !== "inactive";
        else activeValue = !["false", "0", "inactive", "no"].includes(String(activeValue).toLowerCase());
        return saveCategory(existing ? existing.id : null, {
            name: name, slug: slug, parent_id: parentId, description: row.description || "", icon: row.icon || "", is_active: activeValue
        });
    }

    function importCategories(file) {
        if (!file) return Promise.reject(new Error("Choose a CSV or JSON file first."));
        if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error("The import file must be 5 MB or smaller."));
        return file.text().then(function (text) {
            var rows = importRowsFromText(text.replace(/^\uFEFF/, ""), file.name);
            if (!rows.length) throw new Error("The import file does not contain any categories.");
            var pending = rows.slice(), imported = 0;
            function nextPass() {
                if (!pending.length) return Promise.resolve(imported);
                var deferred = [], progressed = false;
                return pending.reduce(function (chain, row) {
                    return chain.then(function () { return importCategoryRow(row).then(function () { imported += 1; progressed = true; }).catch(function (error) {
                        if (error.message.indexOf("Parent category not found") === 0) deferred.push(row); else throw error;
                    }); });
                }, Promise.resolve()).then(function () {
                    if (!deferred.length) return imported;
                    if (!progressed) throw new Error("Some imported categories reference missing parents.");
                    pending = deferred;
                    return nextPass();
                });
            }
            return nextPass();
        });
    }

    function initImportExport() {
        var exportBtn = document.getElementById("cmExportBtn");
        var exportConfirm = document.getElementById("cmExportConfirmBtn");

        if (exportBtn) {
            exportBtn.addEventListener("click", function () {
                openModal(dom.exportModal);
            });
        }

        if (exportConfirm) {
            exportConfirm.addEventListener("click", function () {
                downloadCategoryExport();
            });
        }

        var importBtn = document.getElementById("cmImportBtn");
        var importConfirm = document.getElementById("cmImportConfirmBtn");
        var uploadZone = document.getElementById("cmUploadZone");
        var fileInput = document.getElementById("cmImportFile");
        var fileNameEl = document.getElementById("cmImportFileName");

        if (importBtn) {
            importBtn.addEventListener("click", function () {
                openModal(dom.importModal);
            });
        }

        if (uploadZone && fileInput) {
            uploadZone.addEventListener("click", function () {
                fileInput.click();
            });

            uploadZone.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInput.click();
                }
            });

            fileInput.addEventListener("change", function () {
                if (fileInput.files && fileInput.files[0]) {
                    fileNameEl.textContent =
                        "Selected: " + fileInput.files[0].name;

                    fileNameEl.classList.remove("cm-hidden");
                }
            });

            ["dragenter", "dragover"].forEach(function (evt) {
                uploadZone.addEventListener(evt, function (e) {
                    e.preventDefault();
                    uploadZone.classList.add("is-dragover");
                });
            });

            ["dragleave", "drop"].forEach(function (evt) {
                uploadZone.addEventListener(evt, function (e) {
                    e.preventDefault();
                    uploadZone.classList.remove("is-dragover");
                });
            });

            uploadZone.addEventListener("drop", function (e) {
                var files = e.dataTransfer.files;

                if (files && files[0]) {
                    fileNameEl.textContent =
                        "Selected: " + files[0].name;

                    fileNameEl.classList.remove("cm-hidden");

                    try {
                        var dataTransfer = new DataTransfer();
                        dataTransfer.items.add(files[0]);
                        fileInput.files = dataTransfer.files;
                    } catch (error) {
                        // Browser does not allow assigning files.
                    }
                }
            });
        }

        if (importConfirm) {
            importConfirm.addEventListener("click", function () {
                var file = fileInput && fileInput.files ? fileInput.files[0] : null;
                importConfirm.disabled = true;
                importCategories(file).then(function (count) {
                    closeModal(dom.importModal);
                    if (fileInput) fileInput.value = "";
                    if (fileNameEl) fileNameEl.classList.add("cm-hidden");
                    showToast(count + " categor" + (count === 1 ? "y" : "ies") + " imported successfully.", "success");
                }).catch(function (error) {
                    showToast(error.message || "Unable to import categories.", "danger");
                }).then(function () {
                    importConfirm.disabled = false;
                });
                return;
            });
        }
    }
    /* ================= GENERIC TOAST TRIGGERS ================= */
    function initGenericToastTriggers() {
        document.addEventListener("click", function (e) {
            var el = e.target.closest("[data-cm-toast]");
            if (!el) return;
            var type = el.getAttribute("data-cm-toast") || "info";
            var message = el.getAttribute("data-cm-toast-msg") || "Done";
            showToast(message, type);
        });
    }

    /* ================= 21. GENERIC MODAL PLUMBING ================= */
    var lastFocusedEl = null;

    function openModal(modal) {
        if (!modal) return;
        lastFocusedEl = document.activeElement;
        modal.classList.remove("cm-hidden");
        document.body.style.overflow = "hidden";
        var closeBtn = modal.querySelector(".cm-modal-close");
        if (closeBtn) closeBtn.focus();
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add("cm-hidden");
        document.body.style.overflow = dom.drawerOverlay.classList.contains("is-open") ? "hidden" : "";
        if (lastFocusedEl && typeof lastFocusedEl.focus === "function") lastFocusedEl.focus();
    }

    function closeAllModals() {
        document.querySelectorAll("[data-cm-modal]").forEach(function (m) {
            if (!m.classList.contains("cm-hidden")) closeModal(m);
        });
    }

    function initModalPlumbing() {
        document.querySelectorAll("[data-cm-close-modal]").forEach(function (btn) {
            btn.addEventListener("click", function () { closeModal(btn.closest("[data-cm-modal]")); });
        });
        document.querySelectorAll("[data-cm-modal]").forEach(function (overlay) {
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) closeModal(overlay);
            });
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeAllModals();
        });
    }

    /* ================= 22. INIT ================= */
    function init() {
        initReveal();
        initCounters();
        initRipples();
        initDropdowns();

        initTreeInteractions();
        initTableInteractions();
        initViewSwitch();
        initFilters();
        initBulkActions();

        initDrawer();
        initInfoEdit();
        initSeoPanel();
        initDisplaySettingsPanel();
        initDrawerQuickActions();
        initActivityFilters();

        initCategoryModal();
        initMoveModal();
        initAssignModal();
        initDeleteModal();
        initImportExport();
        initModalPlumbing();
        initGenericToastTriggers();

        renderTree();
        renderTable();
        reloadCategories().catch(function () { });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
