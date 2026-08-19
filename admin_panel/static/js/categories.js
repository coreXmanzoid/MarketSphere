/* =========================================================================
   MARKETSPHERE ADMIN — CATEGORY MANAGEMENT (list.js)
   Frontend-only interactivity for admin_panel/templates/catalog/categories/list.html.
   Vanilla JS, IIFE-scoped, no external libraries, no network calls.
   All category data below is realistic demo/placeholder data used to
   drive the UI until the backend model + views are wired up.

   Sections:
     1. Demo Data
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

    /* ================= 1. DEMO DATA ================= */
    var PRODUCT_POOL = [
        { name: "Wireless Over-Ear Headphones", sku: "SW-HP-2201", seller: "SoundWave", price: 6399, stock: 42, status: "published", orders: 214 },
        { name: "Smart Watch Series 4", sku: "TT-SW-0044", seller: "TimeTech", price: 12999, stock: 8, status: "published", orders: 96 },
        { name: "4K Action Camera", sku: "NV-AC-0091", seller: "NovaTech", price: 18500, stock: 0, status: "out_of_stock", orders: 51 },
        { name: "Leather Crossbody Bag", sku: "UC-BG-1123", seller: "UrbanCarry", price: 4200, stock: 27, status: "published", orders: 133 },
        { name: "Bluetooth Portable Speaker", sku: "SW-SP-0087", seller: "SoundWave", price: 3899, stock: 61, status: "pending", orders: 12 },
        { name: "Ergonomic Office Chair", sku: "HM-CH-0210", seller: "HomeMakers", price: 15999, stock: 14, status: "published", orders: 44 },
    ];

    var TOP_PRODUCTS = [
        { name: "Wireless Over-Ear Headphones", sold: 214 },
        { name: "Smart Watch Series 4", sold: 96 },
        { name: "Bluetooth Portable Speaker", sold: 63 },
        { name: "4K Action Camera", sold: 51 },
    ];

    var ACTIVITY_EVENTS = [
        { type: "category", icon: "created", title: "Category created", desc: "Category was added to the catalog structure.", actor: "Hammad Ashraf", time: "3 months ago", status: "success" },
        { type: "visibility", icon: "featured", title: "Marked as Featured", desc: "Category now appears in the featured carousel.", actor: "Sana Raza", time: "2 months ago", status: "success" },
        { type: "products", icon: "assigned", title: "18 products assigned", desc: "Bulk product assignment completed for this category.", actor: "Hammad Ashraf", time: "6 weeks ago", status: "info" },
        { type: "category", icon: "renamed", title: "Category renamed", desc: "Display name updated for clarity.", actor: "Sana Raza", time: "5 weeks ago", status: "info" },
        { type: "visibility", icon: "hidden", title: "Hidden from navigation", desc: "Removed from the main site navigation temporarily.", actor: "Hammad Ashraf", time: "3 weeks ago", status: "warning" },
        { type: "admin", icon: "updated", title: "Display order changed", desc: "Reordered relative to sibling categories.", actor: "Sana Raza", time: "9 days ago", status: "info" },
        { type: "products", icon: "removed", title: "3 products removed", desc: "Out-of-policy listings were removed from this category.", actor: "Hammad Ashraf", time: "2 days ago", status: "danger" },
    ];

    function makeCategory(opts) {
        return Object.assign({
            id: idCounter++,
            slug: (opts.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
            icon: "bi bi-grid",
            description: "",
            type: "Standard",
            status: "active",
            featured: false,
            homepage: true,
            nav: true,
            footer: false,
            visible: true,
            allowProducts: true,
            allowSubcategories: true,
            order: 1,
            created: "Jan 12, 2026",
            updated: "2 weeks ago",
            children: [],
        }, opts);
    }

    var idCounter = 1;

    var CATEGORY_TREE = [
        makeCategory({
            name: "Electronics", icon: "bi bi-cpu", products: 2140, featured: true, order: 1,
            description: "Consumer electronics including phones, laptops, and accessories.",
            children: [
                makeCategory({
                    name: "Mobile Phones", icon: "bi bi-phone", products: 640, featured: true, order: 1,
                    description: "Smartphones and feature phones from all major brands.",
                    children: [
                        makeCategory({ name: "Android Phones", icon: "bi bi-phone", products: 410, order: 1 }),
                        makeCategory({ name: "iPhones", icon: "bi bi-phone", products: 230, order: 2 }),
                    ],
                }),
                makeCategory({
                    name: "Laptops", icon: "bi bi-laptop", products: 380, order: 2,
                    children: [
                        makeCategory({ name: "Gaming Laptops", icon: "bi bi-laptop", products: 140, order: 1 }),
                        makeCategory({ name: "Business Laptops", icon: "bi bi-laptop", products: 180, order: 2 }),
                    ],
                }),
                makeCategory({ name: "Accessories", icon: "bi bi-usb-plug", products: 520, order: 3, status: "active" }),
                makeCategory({ name: "Smart Home", icon: "bi bi-house-gear", products: 0, order: 4, status: "inactive" }),
            ],
        }),
        makeCategory({
            name: "Fashion", icon: "bi bi-bag-heart", products: 1890, featured: true, order: 2,
            description: "Apparel and accessories for men, women, and kids.",
            children: [
                makeCategory({ name: "Men", icon: "bi bi-person", products: 640, order: 1 }),
                makeCategory({ name: "Women", icon: "bi bi-person-dress", products: 890, order: 2 }),
                makeCategory({ name: "Kids", icon: "bi bi-emoji-smile", products: 360, order: 3 }),
            ],
        }),
        makeCategory({
            name: "Home & Living", icon: "bi bi-house-door", products: 1120, order: 3,
            description: "Furniture, kitchenware, and home decoration.",
            children: [
                makeCategory({ name: "Furniture", icon: "bi bi-house-door", products: 410, order: 1 }),
                makeCategory({ name: "Kitchen", icon: "bi bi-cup-hot", products: 380, order: 2 }),
                makeCategory({ name: "Decoration", icon: "bi bi-flower1", products: 330, order: 3, status: "active" }),
            ],
        }),
        makeCategory({
            name: "Beauty & Personal Care", icon: "bi bi-droplet", products: 740, order: 4,
            children: [
                makeCategory({ name: "Skincare", icon: "bi bi-droplet-half", products: 320, order: 1 }),
                makeCategory({ name: "Makeup", icon: "bi bi-palette", products: 260, order: 2 }),
                makeCategory({ name: "Fragrances", icon: "bi bi-flower2", products: 160, order: 3, status: "inactive" }),
            ],
        }),
        makeCategory({
            name: "Sports & Outdoors", icon: "bi bi-bicycle", products: 480, order: 5,
            children: [
                makeCategory({ name: "Fitness Equipment", icon: "bi bi-activity", products: 210, order: 1 }),
                makeCategory({ name: "Camping & Hiking", icon: "bi bi-tree", products: 140, order: 2 }),
                makeCategory({ name: "Cycling", icon: "bi bi-bicycle", products: 130, order: 3 }),
            ],
        }),
        makeCategory({
            name: "Books & Stationery", icon: "bi bi-book", products: 0, order: 6, status: "active",
            children: [],
        }),
        makeCategory({
            name: "Groceries", icon: "bi bi-basket", products: 610, order: 7, status: "inactive",
            children: [
                makeCategory({ name: "Beverages", icon: "bi bi-cup-straw", products: 210, order: 1 }),
                makeCategory({ name: "Snacks", icon: "bi bi-basket2", products: 400, order: 2 }),
            ],
        }),
        makeCategory({
            name: "Toys & Games", icon: "bi bi-controller", products: 260, order: 8,
            children: [
                makeCategory({ name: "Board Games", icon: "bi bi-dice-5", products: 90, order: 1 }),
                makeCategory({ name: "Action Figures", icon: "bi bi-robot", products: 170, order: 2 }),
            ],
        }),
        makeCategory({
            name: "Automotive", icon: "bi bi-car-front", products: 0, order: 9, status: "inactive",
            children: [],
        }),
    ];

    /* Flatten helper used across search/filter/table/selects */
    function flatten(nodes, depth, parent, out) {
        depth = depth || 0;
        out = out || [];
        nodes.forEach(function (node) {
            node._depth = depth;
            node._parentName = parent ? parent.name : null;
            out.push(node);
            if (node.children && node.children.length) {
                flatten(node.children, depth + 1, node, out);
            }
        });
        return out;
    }

    function allCategoriesFlat() {
        return flatten(CATEGORY_TREE);
    }

    function findCategory(id) {
        return allCategoriesFlat().find(function (c) { return c.id === Number(id); });
    }

    /* ================= 2. STATE ================= */
    var state = {
        view: "tree",
        filter: "all",
        search: "",
        sort: "order",
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

    /* ================= 4. TOAST HELPER ================= */
    var TOAST_ICONS = {
        success: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"></path></svg>',
        danger: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"></line></svg>',
        info: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    };

    function showToast(message, type) {
        type = type || "info";
        if (!dom.toastContainer) return;

        var toast = document.createElement("div");
        toast.className = "cm-toast cm-toast-" + type;
        toast.innerHTML = (TOAST_ICONS[type] || TOAST_ICONS.info) + "<span>" + message + "</span>";
        dom.toastContainer.appendChild(toast);

        window.setTimeout(function () {
            toast.classList.add("is-leaving");
            window.setTimeout(function () { toast.remove(); }, 220);
        }, 3600);
    }

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
        if (f === "active") return cat.status === "active";
        if (f === "inactive") return cat.status === "inactive";
        if (f === "parent") return cat._depth === 0;
        if (f === "subcategory") return cat._depth > 0;
        if (f === "featured") return !!cat.featured;
        if (f === "hidden") return !cat.visible || !cat.nav;
        if (f === "empty") return (cat.products || 0) === 0;
        return true;
    }

    function categoryMatchesSearch(cat) {
        if (!state.search) return true;
        var q = state.search.toLowerCase();
        return (
            cat.name.toLowerCase().indexOf(q) !== -1 ||
            cat.slug.toLowerCase().indexOf(q) !== -1 ||
            (cat._parentName || "").toLowerCase().indexOf(q) !== -1
        );
    }

    // A node is visible in the tree if it (or any descendant) matches.
    function nodeVisible(node) {
        var selfMatch = categoryMatchesFilter(node) && categoryMatchesSearch(node);
        var childVisible = (node.children || []).some(nodeVisible);
        return selfMatch || childVisible;
    }

    function countSubcategories(node) {
        var count = 0;
        (node.children || []).forEach(function (child) {
            count += 1 + countSubcategories(child);
        });
        return count;
    }

    function renderTreeNode(node) {
        if (!nodeVisible(node)) return null;

        var wrap = document.createElement("div");
        wrap.className = "cm-tree-node";
        wrap.setAttribute("data-cm-depth", node._depth);
        wrap.style.setProperty("--cm-depth", node._depth);

        var hasChildren = node.children && node.children.length > 0;
        var isOpen = state.expanded.has(node.id) || !!state.search;

        var row = document.createElement("div");
        row.className = "cm-tree-row";
        row.setAttribute("role", "treeitem");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-expanded", hasChildren ? String(isOpen) : "false");
        row.setAttribute("aria-selected", String(state.activeCategoryId === node.id));
        row.dataset.categoryId = node.id;
        if (state.activeCategoryId === node.id) row.classList.add("is-selected");

        var toggleHtml = hasChildren
            ? '<button type="button" class="cm-tree-toggle' + (isOpen ? " is-open" : "") + '" data-cm-toggle aria-label="' + (isOpen ? "Collapse" : "Expand") + ' ' + node.name + '"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M9 18l6-6-6-6"></path></svg></button>'
            : '<span class="cm-tree-toggle-spacer"></span>';

        var badgesHtml = "";
        if (node.status === "inactive") badgesHtml += '<span class="cm-badge c-muted">Inactive</span>';
        if (node.featured) badgesHtml += '<span class="cm-badge c-accent">Featured</span>';
        if (!node.visible || !node.nav) badgesHtml += '<span class="cm-badge c-warning">Hidden</span>';

        row.innerHTML =
            toggleHtml +
            '<span class="cm-tree-icon"><i class="' + node.icon + '"></i></span>' +
            '<span class="cm-tree-label">' +
                '<span class="cm-tree-name">' + node.name + '</span>' +
                '<span class="cm-tree-slug">/' + node.slug + '</span>' +
            '</span>' +
            '<span class="cm-tree-meta">' +
                '<span class="cm-tree-meta-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8 12 3 3 8l9 5 9-5Z"></path><path d="M3 8v8l9 5 9-5V8"></path></svg>' + (node.products || 0) + ' products</span>' +
                (hasChildren ? '<span class="cm-tree-meta-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h6v6H4z"></path><path d="M14 4h6v6h-6z"></path></svg>' + node.children.length + ' sub</span>' : "") +
                '<span class="cm-tree-meta-item">Order ' + node.order + '</span>' +
            '</span>' +
            '<span class="cm-tree-badges">' + badgesHtml + '</span>' +
            '<span class="cm-tree-actions">' +
                '<div class="cm-dropdown">' +
                    '<button type="button" class="cm-tree-icon-btn" data-cm-row-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="More actions for ' + node.name + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.2"></circle><circle cx="12" cy="12" r="1.2"></circle><circle cx="12" cy="19" r="1.2"></circle></svg></button>' +
                    '<div class="cm-dropdown-menu" role="menu">' +
                        '<button type="button" class="cm-dropdown-item" data-cm-row-action="view">View / Open</button>' +
                        '<button type="button" class="cm-dropdown-item" data-cm-row-action="edit">Edit</button>' +
                        '<button type="button" class="cm-dropdown-item" data-cm-row-action="add-sub">Add Subcategory</button>' +
                        '<button type="button" class="cm-dropdown-item" data-cm-row-action="move">Move</button>' +
                        '<button type="button" class="cm-dropdown-item" data-cm-row-action="assign">Assign Products</button>' +
                        '<button type="button" class="cm-dropdown-item" data-cm-row-action="feature">' + (node.featured ? "Unfeature" : "Feature") + '</button>' +
                        '<button type="button" class="cm-dropdown-item" data-cm-row-action="toggle-status">' + (node.status === "active" ? "Deactivate" : "Activate") + '</button>' +
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
                var childEl = renderTreeNode(child);
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
                var id = Number(row.dataset.categoryId);
                if (state.expanded.has(id)) state.expanded.delete(id);
                else state.expanded.add(id);
                renderTree();
                return;
            }

            if (rowAction) {
                e.stopPropagation();
                handleRowAction(rowAction.dataset.cmRowAction, Number(row.dataset.categoryId));
                return;
            }

            if (rowMenuTrigger) {
                return; // handled by initDropdowns delegation
            }

            if (row) {
                openDrawer(Number(row.dataset.categoryId));
            }
        });

        dom.tree.addEventListener("keydown", function (e) {
            if (e.key !== "Enter" && e.key !== " ") return;
            var row = e.target.closest(".cm-tree-row");
            if (row && e.target === row) {
                e.preventDefault();
                openDrawer(Number(row.dataset.categoryId));
            }
        });
    }

    function expandAll() {
        allCategoriesFlat().forEach(function (c) {
            if (c.children && c.children.length) state.expanded.add(c.id);
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
                cat.featured = !cat.featured;
                showToast(cat.featured ? '"' + cat.name + '" is now featured.' : '"' + cat.name + '" removed from featured.', "success");
                renderTree();
                renderTable();
                if (state.activeCategoryId === id) populateDrawer(cat);
                break;
            case "toggle-status":
                cat.status = cat.status === "active" ? "inactive" : "active";
                showToast('"' + cat.name + '" is now ' + STATUS_LABELS[cat.status] + ".", "success");
                renderTree();
                renderTable();
                if (state.activeCategoryId === id) populateDrawer(cat);
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
            if (state.sort === "name") return a.name.localeCompare(b.name);
            if (state.sort === "products-desc") return (b.products || 0) - (a.products || 0);
            if (state.sort === "updated") return 0;
            return (a.order || 0) - (b.order || 0);
        });

        rows.forEach(function (cat) {
            var tr = document.createElement("tr");
            tr.dataset.categoryId = cat.id;

            var sub = countSubcategories(cat);

            tr.innerHTML =
                '<td data-label=""><label class="cm-checkbox"><input type="checkbox" class="cm-row-checkbox" data-cm-table-check ' + (state.selectedTableIds.has(cat.id) ? "checked" : "") + ' /><span class="cm-checkbox-box"></span></label></td>' +
                '<td data-label="Category"><div class="cm-table-cat-cell" data-cm-table-open><span class="cm-table-cat-icon"><i class="' + cat.icon + '"></i></span><span><span class="cm-table-cat-name">' + cat.name + '</span><span class="cm-table-cat-slug">/' + cat.slug + '</span></span></div></td>' +
                '<td data-label="Parent">' + (cat._parentName || "—") + '</td>' +
                '<td data-label="Products">' + (cat.products || 0) + '</td>' +
                '<td data-label="Subcategories">' + sub + '</td>' +
                '<td data-label="Status"><span class="cm-badge ' + (cat.status === "active" ? "c-success" : "c-muted") + '">' + STATUS_LABELS[cat.status] + '</span></td>' +
                '<td data-label="Featured">' + (cat.featured ? '<span class="cm-badge c-accent">Featured</span>' : "—") + '</td>' +
                '<td data-label="Visibility">' + (cat.visible ? '<span class="cm-badge c-success">Visible</span>' : '<span class="cm-badge c-warning">Hidden</span>') + '</td>' +
                '<td data-label="Order">' + cat.order + '</td>' +
                '<td data-label="Updated">' + cat.updated + '</td>' +
                '<td data-label="" class="cm-col-actions"><button type="button" class="cm-tree-icon-btn" data-cm-table-open aria-label="Open ' + cat.name + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"></path></svg></button></td>';

            dom.tableBody.appendChild(tr);
        });
    }

    function initTableInteractions() {
        if (!dom.tableBody) return;

        dom.tableBody.addEventListener("click", function (e) {
            var openTrigger = e.target.closest("[data-cm-table-open]");
            if (openTrigger) {
                var tr = e.target.closest("tr");
                openDrawer(Number(tr.dataset.categoryId));
            }
        });

        dom.tableBody.addEventListener("change", function (e) {
            if (!e.target.matches("[data-cm-table-check]")) return;
            var tr = e.target.closest("tr");
            var id = Number(tr.dataset.categoryId);
            if (e.target.checked) state.selectedTableIds.add(id);
            else state.selectedTableIds.delete(id);
            updateBulkBar();
        });

        if (dom.tableSelectAll) {
            dom.tableSelectAll.addEventListener("change", function () {
                var checked = dom.tableSelectAll.checked;
                Array.prototype.slice.call(dom.tableBody.querySelectorAll("tr")).forEach(function (tr) {
                    var id = Number(tr.dataset.categoryId);
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
                        if (cat) cat.status = action === "activate" ? "active" : "inactive";
                    });
                    showToast(count + " categor" + (count === 1 ? "y" : "ies") + " " + (action === "activate" ? "activated" : "deactivated") + ".", "success");
                } else if (action === "feature") {
                    ids.forEach(function (id) { var cat = findCategory(id); if (cat) cat.featured = true; });
                    showToast(count + " categor" + (count === 1 ? "y" : "ies") + " featured.", "success");
                } else if (action === "hide") {
                    ids.forEach(function (id) { var cat = findCategory(id); if (cat) cat.visible = false; });
                    showToast(count + " categor" + (count === 1 ? "y" : "ies") + " hidden.", "success");
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
        var sub = countSubcategories(cat);

        // Header
        document.getElementById("cmDrawerIcon").innerHTML = '<i class="' + cat.icon + '"></i>';
        document.getElementById("cmDrawerTitle").textContent = cat.name;
        document.getElementById("cmDrawerSlug").textContent = "/" + cat.slug;
        document.getElementById("cmDrawerParent").textContent = cat._parentName || "— Top Level —";
        document.getElementById("cmDrawerCreated").textContent = cat.created;
        document.getElementById("cmDrawerUpdated").textContent = cat.updated;
        document.getElementById("cmDrawerProductCount").textContent = cat.products || 0;
        document.getElementById("cmDrawerSubCount").textContent = sub;

        var statusBadge = document.getElementById("cmDrawerStatusBadge");
        statusBadge.textContent = STATUS_LABELS[cat.status];
        statusBadge.className = "cm-badge " + (cat.status === "active" ? "c-success" : "c-muted");

        document.getElementById("cmDrawerFeaturedBadge").classList.toggle("cm-hidden", !cat.featured);
        document.getElementById("cmDrawerFeatureLabel").textContent = cat.featured ? "Unfeature Category" : "Feature Category";
        document.getElementById("cmDrawerToggleStatusLabel").textContent = cat.status === "active" ? "Deactivate" : "Activate";

        // Overview
        var revenue = (cat.products || 0) * 1450;
        document.getElementById("ovTotalProducts").textContent = cat.products || 0;
        document.getElementById("ovPublished").textContent = Math.round((cat.products || 0) * 0.82);
        document.getElementById("ovPending").textContent = Math.round((cat.products || 0) * 0.08);
        document.getElementById("ovOutOfStock").textContent = Math.round((cat.products || 0) * 0.1);
        document.getElementById("ovSubcategories").textContent = sub;
        document.getElementById("ovOrders").textContent = Math.round((cat.products || 0) * 0.6);
        document.getElementById("ovRevenue").textContent = "Rs. " + revenue.toLocaleString("en-US");
        document.getElementById("ovConversion").textContent = (cat.products ? 3.4 : 0) + "%";
        document.getElementById("ovDescription").textContent = cat.description || "No description provided yet.";

        // Information
        populateInfoPanel(cat);

        // SEO
        populateSeoPanel(cat);

        // Display Settings
        document.getElementById("tgFeatured").checked = !!cat.featured;
        document.getElementById("tgHomepage").checked = !!cat.homepage;
        document.getElementById("tgNav").checked = !!cat.nav;
        document.getElementById("tgFooter").checked = !!cat.footer;
        document.getElementById("tgVisible").checked = !!cat.visible;
        document.getElementById("tgAllowProducts").checked = !!cat.allowProducts;
        document.getElementById("tgAllowSub").checked = !!cat.allowSubcategories;
        document.getElementById("dispOrder").value = cat.order;
        document.getElementById("dispIcon").value = cat.icon;

        // Subcategories
        renderSubcategoriesPanel(cat);

        // Products
        renderProductsPanel(cat);

        // Analytics
        renderTopProducts();

        // Activity
        renderActivityTimeline();

        // exit edit mode if it was open
        state.infoEditing = false;
        document.getElementById("cmInfoDisplay").classList.remove("cm-hidden");
        document.getElementById("cmInfoForm").classList.add("cm-hidden");
    }

    function populateInfoPanel(cat) {
        document.getElementById("infoName").textContent = cat.name;
        document.getElementById("infoSlug").textContent = "/" + cat.slug;
        document.getElementById("infoParent").textContent = cat._parentName || "— Top Level —";
        document.getElementById("infoType").textContent = cat.type;
        document.getElementById("infoStatus").textContent = STATUS_LABELS[cat.status];
        document.getElementById("infoOrder").textContent = cat.order;
        document.getElementById("infoIcon").textContent = cat.icon;
        document.getElementById("infoFeatured").textContent = cat.featured ? "Yes" : "No";
        document.getElementById("infoDescription").textContent = cat.description || "No description provided yet.";

        // populate form for edit mode
        document.getElementById("fName").value = cat.name;
        document.getElementById("fSlug").value = cat.slug;
        document.getElementById("fType").value = cat.type;
        document.getElementById("fStatus").value = cat.status;
        document.getElementById("fOrder").value = cat.order;
        document.getElementById("fIcon").value = cat.icon;
        document.getElementById("fDescription").value = cat.description || "";
        populateParentSelect(document.getElementById("fParent"), cat.id, cat._parentName);
    }

    function populateParentSelect(selectEl, excludeId, selectedName) {
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="">— No Parent (Top Level) —</option>';
        allCategoriesFlat().forEach(function (c) {
            if (excludeId && c.id === excludeId) return;
            var opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = (c._depth > 0 ? "— " : "") + c.name;
            if (selectedName && c.name === selectedName) opt.selected = true;
            selectEl.appendChild(opt);
        });
    }

    function populateSeoPanel(cat) {
        var title = "Buy " + cat.name + " Online in Pakistan | MarketSphere";
        var desc = "Shop the best " + cat.name.toLowerCase() + " from trusted sellers with fast delivery and secure checkout on MarketSphere.";
        document.getElementById("seoTitle").value = title;
        document.getElementById("seoDesc").value = desc;
        document.getElementById("seoKeywords").value = cat.name.toLowerCase() + ", buy " + cat.name.toLowerCase() + " online, marketsphere";
        document.getElementById("seoCanonical").value = "https://marketsphere.com/category/" + cat.slug;
        document.getElementById("seoPreviewUrl").textContent = "marketsphere.com \u203a category \u203a " + cat.slug;
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
                '<span class="cm-sub-icon"><i class="' + child.icon + '"></i></span>' +
                '<span class="cm-sub-info"><strong>' + child.name + '</strong><span>' + (child.products || 0) + ' products &middot; ' + STATUS_LABELS[child.status] + '</span></span>' +
                '<span class="cm-sub-actions">' +
                    '<button type="button" class="cm-tree-icon-btn" data-cm-sub-open="' + child.id + '" aria-label="Open ' + child.name + '"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"></path></svg></button>' +
                '</span>';
            list.appendChild(row);
        });

        list.querySelectorAll("[data-cm-sub-open]").forEach(function (btn) {
            btn.addEventListener("click", function () { openDrawer(Number(btn.dataset.cmSubOpen)); });
        });
    }

    function renderProductsPanel(cat) {
        var body = document.getElementById("cmProductsTableBody");
        body.innerHTML = "";

        var count = Math.min(6, cat.products ? Math.max(2, Math.min(6, Math.round(cat.products / 100))) : 0);
        if (!cat.products) {
            var tr = document.createElement("tr");
            tr.innerHTML = '<td colspan="8" style="text-align:center;color:var(--cm-caption);padding:24px;">No products in this category yet.</td>';
            body.appendChild(tr);
            return;
        }

        PRODUCT_POOL.slice(0, count || 4).forEach(function (p) {
            var tr = document.createElement("tr");
            var statusBadge = p.status === "published" ? "c-success" : (p.status === "out_of_stock" ? "c-danger" : "c-warning");
            tr.innerHTML =
                '<td data-label="Product"><div class="cm-product-cell"><span class="cm-product-thumb"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8 12 3 3 8l9 5 9-5Z"></path></svg></span><span class="cm-product-name-cell"><strong>' + p.name + '</strong></span></div></td>' +
                '<td data-label="SKU">' + p.sku + '</td>' +
                '<td data-label="Seller">' + p.seller + '</td>' +
                '<td data-label="Price">Rs. ' + p.price.toLocaleString("en-US") + '</td>' +
                '<td data-label="Stock">' + p.stock + '</td>' +
                '<td data-label="Status"><span class="cm-badge ' + statusBadge + '">' + p.status.replace("_", " ") + '</span></td>' +
                '<td data-label="Orders">' + p.orders + '</td>' +
                '<td data-label="" class="cm-col-actions">' +
                    '<div class="cm-dropdown">' +
                        '<button type="button" class="cm-tree-icon-btn" data-cm-row-menu-trigger aria-label="More actions"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.2"></circle><circle cx="12" cy="12" r="1.2"></circle><circle cx="12" cy="19" r="1.2"></circle></svg></button>' +
                        '<div class="cm-dropdown-menu" role="menu">' +
                            '<button type="button" class="cm-dropdown-item" data-cm-toast="info" data-cm-toast-msg="Opening product&hellip;">View Product</button>' +
                            '<button type="button" class="cm-dropdown-item" data-cm-toast="info" data-cm-toast-msg="Product removed from category.">Remove From Category</button>' +
                            '<button type="button" class="cm-dropdown-item" data-cm-toast="info" data-cm-toast-msg="Move Category flow isn&#8217;t available yet.">Move Category</button>' +
                        '</div>' +
                    '</div>' +
                '</td>';
            body.appendChild(tr);
        });
    }

    function renderTopProducts() {
        var list = document.getElementById("cmTopProductsList");
        if (!list) return;
        list.innerHTML = "";
        var max = TOP_PRODUCTS[0].sold;
        TOP_PRODUCTS.forEach(function (p, i) {
            var row = document.createElement("div");
            row.className = "cm-top-row";
            var pct = Math.round((p.sold / max) * 100);
            row.innerHTML =
                '<span class="cm-top-rank">' + (i + 1) + '</span>' +
                '<span class="cm-top-info"><strong>' + p.name + '</strong><span class="cm-top-bar"><span class="cm-top-bar-fill" style="width:' + pct + '%;"></span></span></span>' +
                '<span class="cm-top-value">' + p.sold + ' sold</span>';
            list.appendChild(row);
        });
    }

    function renderActivityTimeline(filter) {
        filter = filter || "all";
        var ul = document.getElementById("cmActivityTimeline");
        if (!ul) return;
        ul.innerHTML = "";

        var dotClassMap = { success: "c-success", warning: "c-warning", danger: "c-danger", info: "c-info" };

        ACTIVITY_EVENTS.forEach(function (ev) {
            if (filter !== "all" && ev.type !== filter) return;
            var li = document.createElement("li");
            li.className = "cm-timeline-item";
            li.innerHTML =
                '<span class="cm-timeline-dot ' + (dotClassMap[ev.status] || "") + '"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle></svg></span>' +
                '<div class="cm-timeline-body">' +
                    '<div class="cm-timeline-top"><strong>' + ev.title + '</strong></div>' +
                    '<p>' + ev.desc + '</p>' +
                    '<span class="cm-timeline-time">' + ev.actor + ' &middot; ' + ev.time + '</span>' +
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
            renderActivityTimeline(pill.dataset.cmActivityFilter);
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
                cat.name = document.getElementById("fName").value.trim() || cat.name;
                cat.slug = document.getElementById("fSlug").value.trim() || cat.slug;
                cat.type = document.getElementById("fType").value;
                cat.status = document.getElementById("fStatus").value;
                cat.order = Number(document.getElementById("fOrder").value) || cat.order;
                cat.icon = document.getElementById("fIcon").value.trim() || cat.icon;
                cat.description = document.getElementById("fDescription").value.trim();
                cat.updated = "Just now";

                exitEdit();
                populateDrawer(cat);
                renderTree();
                renderTable();
                showToast("Changes saved.", "success");
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
        if (saveBtn) saveBtn.addEventListener("click", function () { showToast("SEO settings saved.", "success"); });
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
                cat.featured = document.getElementById("tgFeatured").checked;
                cat.homepage = document.getElementById("tgHomepage").checked;
                cat.nav = document.getElementById("tgNav").checked;
                cat.footer = document.getElementById("tgFooter").checked;
                cat.visible = document.getElementById("tgVisible").checked;
                cat.allowProducts = document.getElementById("tgAllowProducts").checked;
                cat.allowSubcategories = document.getElementById("tgAllowSub").checked;
                cat.order = Number(document.getElementById("dispOrder").value) || cat.order;
                cat.icon = document.getElementById("dispIcon").value.trim() || cat.icon;
                populateDrawer(cat);
                renderTree();
                renderTable();
                showToast("Display settings saved.", "success");
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
            document.getElementById("mName").value = cat.name;
            document.getElementById("mSlug").value = cat.slug;
            document.getElementById("mParent").value = "";
            document.getElementById("mType").value = cat.type;
            document.getElementById("mStatus").value = cat.status;
            document.getElementById("mOrder").value = cat.order;
            document.getElementById("mIcon").value = cat.icon;
            document.getElementById("mDescription").value = cat.description || "";
            document.getElementById("mFeatured").checked = !!cat.featured;
            document.getElementById("mHomepage").checked = !!cat.homepage;
            document.getElementById("mNav").checked = !!cat.nav;
            document.getElementById("mAllowProducts").checked = !!cat.allowProducts;
            document.getElementById("mAllowSub").checked = !!cat.allowSubcategories;
        } else {
            document.getElementById("mName").value = "";
            document.getElementById("mSlug").value = "";
            document.getElementById("mParent").value = parentCat ? parentCat.id : "";
            document.getElementById("mType").value = "Standard";
            document.getElementById("mStatus").value = "active";
            document.getElementById("mOrder").value = "1";
            document.getElementById("mIcon").value = "";
            document.getElementById("mDescription").value = "";
            document.getElementById("mFeatured").checked = false;
            document.getElementById("mHomepage").checked = true;
            document.getElementById("mNav").checked = true;
            document.getElementById("mAllowProducts").checked = true;
            document.getElementById("mAllowSub").checked = true;
        }

        openModal(dom.categoryModal);
    }

    function initCategoryModal() {
        if (dom.addCategoryBtn) {
            dom.addCategoryBtn.addEventListener("click", function () { openCategoryModal("add"); });
        }

        var nameInput = document.getElementById("mName");
        var slugInput = document.getElementById("mSlug");
        if (nameInput && slugInput) {
            nameInput.addEventListener("input", function () {
                if (categoryModalMode !== "edit" && !slugInput.dataset.manuallyEdited) {
                    slugInput.value = nameInput.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                }
            });
            slugInput.addEventListener("input", function () { slugInput.dataset.manuallyEdited = "1"; });
        }

        if (dom.categoryModalSubmit) {
            dom.categoryModalSubmit.addEventListener("click", function () {
                var name = document.getElementById("mName").value.trim();
                if (!name) { showToast("Category name is required.", "danger"); return; }

                if (categoryModalMode === "edit" && categoryModalEditingCat) {
                    var cat = categoryModalEditingCat;
                    cat.name = name;
                    cat.slug = document.getElementById("mSlug").value.trim() || cat.slug;
                    cat.type = document.getElementById("mType").value;
                    cat.status = document.getElementById("mStatus").value;
                    cat.order = Number(document.getElementById("mOrder").value) || cat.order;
                    cat.icon = document.getElementById("mIcon").value.trim() || cat.icon;
                    cat.description = document.getElementById("mDescription").value.trim();
                    cat.featured = document.getElementById("mFeatured").checked;
                    cat.homepage = document.getElementById("mHomepage").checked;
                    cat.nav = document.getElementById("mNav").checked;
                    cat.allowProducts = document.getElementById("mAllowProducts").checked;
                    cat.allowSubcategories = document.getElementById("mAllowSub").checked;
                    cat.updated = "Just now";
                    showToast('"' + cat.name + '" updated.', "success");
                    if (state.activeCategoryId === cat.id) populateDrawer(cat);
                } else {
                    var newCat = makeCategory({
                        name: name,
                        slug: document.getElementById("mSlug").value.trim() || undefined,
                        type: document.getElementById("mType").value,
                        status: document.getElementById("mStatus").value,
                        order: Number(document.getElementById("mOrder").value) || 1,
                        icon: document.getElementById("mIcon").value.trim() || "bi bi-grid",
                        description: document.getElementById("mDescription").value.trim(),
                        featured: document.getElementById("mFeatured").checked,
                        homepage: document.getElementById("mHomepage").checked,
                        nav: document.getElementById("mNav").checked,
                        allowProducts: document.getElementById("mAllowProducts").checked,
                        allowSubcategories: document.getElementById("mAllowSub").checked,
                        products: 0,
                        children: [],
                    });

                    var parentSelectValue = document.getElementById("mParent").value;
                    var parentCat = parentSelectValue ? findCategory(parentSelectValue) : categoryModalTargetParent;

                    if (parentCat) {
                        parentCat.children.push(newCat);
                        if (parentCat.children.length && parentCat.children.length) state.expanded.add(parentCat.id);
                    } else {
                        CATEGORY_TREE.push(newCat);
                    }
                    showToast('"' + newCat.name + '" created.', "success");
                }

                closeModal(dom.categoryModal);
                renderTree();
                renderTable();
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
                showToast('"' + moveModalCat.name + '" moved successfully.', "success");
                moveModalCat.updated = "Just now";
                closeModal(dom.moveModal);
                if (state.activeCategoryId === moveModalCat.id) populateDrawer(moveModalCat);
                renderTree();
                renderTable();
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
        var q = (filterText || "").toLowerCase();

        PRODUCT_POOL.filter(function (p) {
            return !q || p.name.toLowerCase().indexOf(q) !== -1 || p.sku.toLowerCase().indexOf(q) !== -1;
        }).forEach(function (p, i) {
            var row = document.createElement("div");
            row.className = "cm-assign-row";
            row.innerHTML =
                '<label class="cm-checkbox"><input type="checkbox" data-cm-assign-check="' + p.sku + '" ' + (assignSelected.has(p.sku) ? "checked" : "") + ' /><span class="cm-checkbox-box"></span></label>' +
                '<span class="cm-assign-row-info"><strong>' + p.name + '</strong><span>' + p.sku + ' &middot; ' + p.seller + '</span></span>' +
                '<span class="cm-assign-row-price">Rs. ' + p.price.toLocaleString("en-US") + '</span>';
            list.appendChild(row);
        });

        list.querySelectorAll("[data-cm-assign-check]").forEach(function (cb) {
            cb.addEventListener("change", function () {
                var sku = cb.dataset.cmAssignCheck;
                if (cb.checked) assignSelected.add(sku); else assignSelected.delete(sku);
                updateAssignCount();
            });
        });
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
                PRODUCT_POOL.forEach(function (p) { assignSelected.add(p.sku); });
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
                if (assignTargetCat) {
                    assignTargetCat.products = (assignTargetCat.products || 0) + assignSelected.size;
                }
                showToast(assignSelected.size + " product(s) assigned to " + (assignTargetCat ? assignTargetCat.name : "category") + ".", "success");
                closeModal(dom.assignModal);
                if (assignTargetCat && state.activeCategoryId === assignTargetCat.id) populateDrawer(assignTargetCat);
                renderTree();
                renderTable();
            });
        }
    }

    /* ================= 18. DELETE CATEGORY WORKFLOW ================= */
    var deleteTargetCat = null;

    function openDeleteModal(cat) {
        if (!cat) return;
        deleteTargetCat = cat;
        document.getElementById("deleteTargetName").textContent = cat.name;
        document.getElementById("deleteProductCount").textContent = cat.products || 0;
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
                var name = deleteTargetCat.name;
                removeCategoryFromTree(deleteTargetCat);
                closeModal(dom.deleteModal);
                if (state.activeCategoryId === deleteTargetCat.id) closeDrawer();
                showToast('"' + name + '" deleted permanently.', "danger");
                deleteTargetCat = null;
                renderTree();
                renderTable();
            });
        }

        if (deactivateBtn) {
            deactivateBtn.addEventListener("click", function () {
                if (!deleteTargetCat) return;
                deleteTargetCat.status = "inactive";
                showToast('"' + deleteTargetCat.name + '" deactivated instead of deleted.', "success");
                closeModal(dom.deleteModal);
                if (state.activeCategoryId === deleteTargetCat.id) populateDrawer(deleteTargetCat);
                renderTree();
                renderTable();
            });
        }
    }

    /* ================= 19. IMPORT / EXPORT MODALS ================= */
    function initImportExport() {
        var exportBtn = document.getElementById("cmExportBtn");
        var exportConfirm = document.getElementById("cmExportConfirmBtn");
        if (exportBtn) exportBtn.addEventListener("click", function () { openModal(dom.exportModal); });
        if (exportConfirm) {
            exportConfirm.addEventListener("click", function () {
                var scope = document.getElementById("exportScope").value;
                var format = document.getElementById("exportFormat").value;
                closeModal(dom.exportModal);
                showToast(scope + " (" + format + ") export started.", "success");
            });
        }

        var importBtn = document.getElementById("cmImportBtn");
        var importConfirm = document.getElementById("cmImportConfirmBtn");
        var uploadZone = document.getElementById("cmUploadZone");
        var fileInput = document.getElementById("cmImportFile");
        var fileNameEl = document.getElementById("cmImportFileName");

        if (importBtn) importBtn.addEventListener("click", function () { openModal(dom.importModal); });

        if (uploadZone && fileInput) {
            uploadZone.addEventListener("click", function () { fileInput.click(); });
            uploadZone.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
            });
            fileInput.addEventListener("change", function () {
                if (fileInput.files && fileInput.files[0]) {
                    fileNameEl.textContent = "Selected: " + fileInput.files[0].name;
                    fileNameEl.classList.remove("cm-hidden");
                }
            });
            ["dragenter", "dragover"].forEach(function (evt) {
                uploadZone.addEventListener(evt, function (e) { e.preventDefault(); uploadZone.classList.add("is-dragover"); });
            });
            ["dragleave", "drop"].forEach(function (evt) {
                uploadZone.addEventListener(evt, function (e) { e.preventDefault(); uploadZone.classList.remove("is-dragover"); });
            });
            uploadZone.addEventListener("drop", function (e) {
                var files = e.dataTransfer.files;
                if (files && files[0]) {
                    fileNameEl.textContent = "Selected: " + files[0].name;
                    fileNameEl.classList.remove("cm-hidden");
                }
            });
        }

        if (importConfirm) {
            importConfirm.addEventListener("click", function () {
                closeModal(dom.importModal);
                showToast("Import preview isn\u2019t available yet \u2014 check back soon.", "info");
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
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();