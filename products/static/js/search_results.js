document.addEventListener('DOMContentLoaded', function () {
    const ANIMATION_MS = {
    move: 700,
    enter: 650,
    leave: 600,
    grid: 400
};

    const EASING = 'cubic-bezier(0.2, 0.85, 0.2, 1)';

    function normalizeText(value) {
        return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function formatPrice(value) {
        return 'Rs. ' + Number(value || 0).toLocaleString('en-IN');
    }

    function parsePrice(value) {
        const cleaned = String(value || '').replace(/[^\d]/g, '');
        return cleaned ? parseInt(cleaned, 10) : 0;
    }

    function getLabelText(input) {
        const formCheck = input.closest('.form-check');
        const label = formCheck ? formCheck.querySelector('.form-check-label') : null;
        return normalizeText(label ? label.textContent : '');
    }

    function getSectionTitle(input) {
        const card = input.closest('.filter-card');
        const title = card ? card.querySelector('.card-header h6') : null;
        return normalizeText(title ? title.textContent : '');
    }

    function getRatingFromCard(card) {
        const ratingIcons = card.querySelectorAll('.product-rating i');
        let rating = 0;

        ratingIcons.forEach(function (icon) {
            if (icon.classList.contains('bi-star-fill')) {
                rating += 1;
            } else if (icon.classList.contains('bi-star-half')) {
                rating += 0.5;
            }
        });

        return rating;
    }

    function getPopularityFromCard(card) {
        const ratingMeta = card.querySelector('.product-rating span');
        if (!ratingMeta) return 0;

        const match = ratingMeta.textContent.replace(/,/g, '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }

    function getStockState(card) {
        const badge = card.querySelector('.stock-badge');
        if (!badge) return 'unknown';
        if (badge.classList.contains('out-of-stock')) return 'out-of-stock';
        if (badge.classList.contains('low-stock')) return 'low-stock';
        if (badge.classList.contains('in-stock')) return 'in-stock';
        return normalizeText(badge.textContent);
    }

    function buildSearchItem(column, index) {
        const card = column.querySelector('.product-card');
        if (!card) return null;

        column.classList.add('search-result-item');

        return {
            id: column.dataset.searchItemId || String(index),
            index: index,
            wrapper: column,
            card: card,
            category: normalizeText((card.querySelector('.product-category-badge') || {}).textContent),
            brand: normalizeText((card.querySelector('.product-brand') || {}).textContent),
            price: parsePrice((card.querySelector('.price-current') || {}).textContent),
            rating: getRatingFromCard(card),
            popularity: getPopularityFromCard(card),
            stock: getStockState(card)
        };
    }

    function clearInlineMotion(wrapper) {
        wrapper.style.position = '';
        wrapper.style.left = '';
        wrapper.style.top = '';
        wrapper.style.width = '';
        wrapper.style.height = '';
        wrapper.style.margin = '';
        wrapper.style.zIndex = '';
        wrapper.style.pointerEvents = '';
        wrapper.style.transition = '';
        wrapper.style.transform = '';
        wrapper.style.opacity = '';
    }

    function setAbsoluteLeavePosition(wrapper, rect, gridRect) {
        wrapper.style.position = 'absolute';
        wrapper.style.left = rect.left - gridRect.left + 'px';
        wrapper.style.top = rect.top - gridRect.top + 'px';
        wrapper.style.width = rect.width + 'px';
        wrapper.style.height = rect.height + 'px';
        wrapper.style.margin = '0';
        wrapper.style.zIndex = '2';
        wrapper.style.pointerEvents = 'none';
    }

    function getFirstRect(item) {
        if (item.wrapper.classList.contains('d-none')) {
            return null;
        }

        return item.wrapper.getBoundingClientRect();
    }

    function readFilterState(filterInputs) {
        const categories = [];
        const brands = [];
        const stockStates = [];
        const ratingThresholds = [];

        filterInputs.forEach(function (input) {
            if (!input.checked) return;

            const section = getSectionTitle(input);
            const label = getLabelText(input);

            if (section === 'categories') {
                categories.push(label);
            } else if (section === 'brand') {
                brands.push(label);
            } else if (section === 'availability') {
                if (label === 'in stock') {
                    stockStates.push('in-stock', 'low-stock');
                } else if (label === 'out of stock') {
                    stockStates.push('out-of-stock');
                }
            } else if (section === 'rating') {
                const rating = parseInt(input.id.split('-').pop(), 10);
                if (!Number.isNaN(rating)) {
                    ratingThresholds.push(rating);
                }
            }
        });

        return {
            categories: categories,
            brands: brands,
            stockStates: stockStates,
            ratingThresholds: ratingThresholds
        };
    }

    function matchesFilters(item, filters, maxPrice) {
        const categoryMatch = !filters.categories.length || filters.categories.includes(item.category);
        const brandMatch = !filters.brands.length || filters.brands.includes(item.brand);
        const stockMatch = !filters.stockStates.length || filters.stockStates.includes(item.stock);
        const ratingThreshold = filters.ratingThresholds.length ? Math.min.apply(null, filters.ratingThresholds) : 0;
        const ratingMatch = !ratingThreshold || item.rating >= ratingThreshold;
        const priceMatch = !maxPrice || item.price <= maxPrice;

        return categoryMatch && brandMatch && stockMatch && ratingMatch && priceMatch;
    }

    function sortItems(items, sortValue) {
        return items.slice().sort(function (a, b) {
            if (sortValue === 'price_low_high') {
                return a.price - b.price || a.index - b.index;
            }

            if (sortValue === 'price_high_low') {
                return b.price - a.price || a.index - b.index;
            }

            if (sortValue === 'popularity') {
                return b.popularity - a.popularity || a.index - b.index;
            }

            return a.index - b.index;
        });
    }

    const backToTopBtn = document.getElementById('backToTopBtn');
    function toggleBackToTop() {
        if (!backToTopBtn) return;
        backToTopBtn.classList.toggle('visible', window.scrollY > 400);
    }

    window.addEventListener('scroll', toggleBackToTop);
    toggleBackToTop();

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    document.querySelectorAll('.add-to-cart-btn:not([disabled])').forEach(function (btn) {
        const originalHTML = btn.innerHTML;

        btn.addEventListener('click', function () {
            btn.innerHTML = '<i class="bi bi-check2"></i> Added';
            btn.disabled = true;

            setTimeout(function () {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 1500);
        });
    });

    const grid = document.getElementById('searchResultsGrid');
    const noResultsSection = document.getElementById('noResultsSection');
    const resultsCountEl = document.querySelector('.results-count strong');
    const sortSelect = document.getElementById('sortBy');
    const filterInputs = Array.from(document.querySelectorAll('.filter-card .form-check-input[type="checkbox"]'));
    const priceSliderDesktop = document.getElementById('priceRange');
    const priceSliderMobile = document.getElementById('priceRangeMobile');
    const priceMaxLabel = document.getElementById('priceMaxLabel');
    const priceMaxLabelMobile = document.getElementById('priceMaxLabelMobile');
    const clearFiltersDesktop = document.getElementById('clearFiltersDesktop');
    const clearFiltersMobile = document.getElementById('clearFiltersMobile');

    let searchItems = grid
        ? Array.from(grid.children)
            .map(function (column, index) {
                return buildSearchItem(column, index);
            })
            .filter(Boolean)
        : [];

    let renderRaf = 0;
    let gridUpdateTimer = 0;
    let noResultsTimer = 0;
    let syncingPriceSlider = false;
    let hasRenderedOnce = false;

    const leaveTimers = new Map();
    const enterTimers = new Map();

    function bindPriceSlider(slider, label) {
        if (!slider || !label) return;

        const updateLabel = function () {
            label.textContent = formatPrice(slider.value);
        };

        slider.addEventListener('input', function () {
            updateLabel();

            if (syncingPriceSlider) return;
            syncingPriceSlider = true;

            if (slider === priceSliderDesktop && priceSliderMobile) {
                priceSliderMobile.value = slider.value;
                if (priceMaxLabelMobile) priceMaxLabelMobile.textContent = formatPrice(slider.value);
            } else if (slider === priceSliderMobile && priceSliderDesktop) {
                priceSliderDesktop.value = slider.value;
                if (priceMaxLabel) priceMaxLabel.textContent = formatPrice(slider.value);
            }

            syncingPriceSlider = false;
            scheduleRender();
        });

        updateLabel();
    }

    bindPriceSlider(priceSliderDesktop, priceMaxLabel);
    bindPriceSlider(priceSliderMobile, priceMaxLabelMobile);

    function getCurrentMaxPrice() {
        const slider = priceSliderDesktop || priceSliderMobile;
        return slider ? parsePrice(slider.value) : 0;
    }

    function syncFilterPair(source) {
        const section = getSectionTitle(source);
        const label = getLabelText(source);

        filterInputs.forEach(function (input) {
            if (input === source) return;
            if (getSectionTitle(input) !== section) return;
            if (getLabelText(input) !== label) return;
            input.checked = source.checked;
        });
    }

    function clearTimer(store, wrapper) {
        const timer = store.get(wrapper);
        if (timer) {
            window.clearTimeout(timer);
            store.delete(wrapper);
        }
    }

    function finishLeave(item) {
        clearTimer(leaveTimers, item.wrapper);
        item.wrapper.classList.remove('is-leaving');
        item.wrapper.dataset.searchVisible = '0';
        item.wrapper.classList.add('d-none');
        clearInlineMotion(item.wrapper);
    }

    function animateLeave(item, gridRect) {
        const wrapper = item.wrapper;
        const firstRect = wrapper.getBoundingClientRect();

        clearTimer(leaveTimers, wrapper);
        clearTimer(enterTimers, wrapper);

        setAbsoluteLeavePosition(wrapper, firstRect, gridRect);
        wrapper.classList.add('is-leaving');
        wrapper.classList.remove('is-entering');
        wrapper.dataset.searchVisible = '0';

        wrapper.style.transition = 'none';
        wrapper.style.transform = 'translate3d(0, 0, 0) scale(1)';
        wrapper.style.opacity = '1';
        wrapper.offsetHeight;

        requestAnimationFrame(function () {
            wrapper.style.transition = 'transform ' + ANIMATION_MS.leave + 'ms ease, opacity ' + ANIMATION_MS.leave + 'ms ease';
            wrapper.style.transform = 'translate3d(0, 0, 0) scale(0.965)';
            wrapper.style.opacity = '0';
        });

        const timer = window.setTimeout(function () {
            finishLeave(item);
        }, ANIMATION_MS.leave);

        leaveTimers.set(wrapper, timer);
    }

    function prepareEnter(wrapper) {
        clearTimer(leaveTimers, wrapper);
        clearTimer(enterTimers, wrapper);
        clearInlineMotion(wrapper);
        wrapper.classList.remove('is-leaving');
        wrapper.classList.add('is-entering');
        wrapper.dataset.searchVisible = '1';
    }

    function animateLayoutChange(visibleItems, firstRects, animate) {
        const gridRect = grid.getBoundingClientRect();
        const visibleWrappers = new Set(visibleItems.map(function (item) {
            return item.wrapper;
        }));

        if (!animate) {
            searchItems.forEach(function (item) {
                clearTimer(leaveTimers, item.wrapper);
                clearTimer(enterTimers, item.wrapper);
                item.wrapper.classList.remove('is-entering', 'is-leaving');
                item.wrapper.classList.remove('d-none');
                item.wrapper.dataset.searchVisible = '1';
                clearInlineMotion(item.wrapper);
            });

            visibleItems.forEach(function (item) {
                grid.appendChild(item.wrapper);
            });

            return;
        }

        searchItems.forEach(function (item) {
            const wrapper = item.wrapper;
            if (!visibleWrappers.has(wrapper) && wrapper.dataset.searchVisible !== '0') {
                animateLeave(item, gridRect);
            }
        });

        visibleItems.forEach(function (item) {
            const wrapper = item.wrapper;

            prepareEnter(wrapper);
            grid.appendChild(wrapper);

            if (wrapper.classList.contains('d-none')) {
                wrapper.classList.remove('d-none');
                wrapper.style.opacity = '0';
                wrapper.style.transform = 'translate3d(0, 12px, 0) scale(0.985)';
            }
        });

        grid.offsetHeight;

        const lastRects = new Map();
        visibleItems.forEach(function (item) {
            lastRects.set(item.wrapper, item.wrapper.getBoundingClientRect());
        });

        visibleItems.forEach(function (item) {
            const wrapper = item.wrapper;
            const firstRect = firstRects.get(wrapper);
            const lastRect = lastRects.get(wrapper);

            if (!lastRect) return;

            if (wrapper.dataset.searchVisible !== '1') {
                return;
            }

            wrapper.style.transition = 'none';

            if (!firstRect) {
                wrapper.style.transform = 'translate3d(0, 12px, 0) scale(0.985)';
                wrapper.style.opacity = '0';
            } else {
                const deltaX = firstRect.left - lastRect.left;
                const deltaY = firstRect.top - lastRect.top;

                if (deltaX || deltaY) {
                    wrapper.style.transform = 'translate3d(' + deltaX + 'px, ' + deltaY + 'px, 0)';
                    wrapper.style.opacity = '1';
                } else {
                    wrapper.style.transform = 'translate3d(0, 0, 0)';
                    wrapper.style.opacity = '1';
                }
            }

        });

        requestAnimationFrame(function () {
            visibleItems.forEach(function (item) {
                const wrapper = item.wrapper;

                wrapper.style.transition = 'transform ' + ANIMATION_MS.move + 'ms ' + EASING + ', opacity ' + ANIMATION_MS.enter + 'ms ease';
                wrapper.style.transform = 'translate3d(0, 0, 0)';
                wrapper.style.opacity = '1';

                const timer = enterTimers.get(wrapper);
                if (timer) {
                    window.clearTimeout(timer);
                }

                enterTimers.set(wrapper, window.setTimeout(function () {
                    wrapper.classList.remove('is-entering');
                    clearInlineMotion(wrapper);
                    enterTimers.delete(wrapper);
                }, ANIMATION_MS.move));
            });
        });
    }

    function updateEmptyState(visibleCount) {
        if (!noResultsSection) return;

        if (noResultsTimer) {
            window.clearTimeout(noResultsTimer);
            noResultsTimer = 0;
        }

        if (visibleCount === 0) {
            noResultsTimer = window.setTimeout(function () {
                noResultsSection.classList.remove('d-none');
            }, ANIMATION_MS.leave);
        } else {
            noResultsSection.classList.add('d-none');
        }
    }

    function renderResults() {
        if (!grid || !searchItems.length) return;

        const filters = readFilterState(filterInputs);
        const maxPrice = getCurrentMaxPrice();
        const sortValue = sortSelect ? sortSelect.value : 'newest';
        const animate = hasRenderedOnce;
        hasRenderedOnce = true;

        const currentVisibleItems = searchItems.filter(function (item) {
            return item.wrapper.dataset.searchVisible !== '0' && !item.wrapper.classList.contains('d-none');
        });
        const firstRects = new Map();
        currentVisibleItems.forEach(function (item) {
            firstRects.set(item.wrapper, getFirstRect(item));
        });

        const filteredItems = searchItems.filter(function (item) {
            return matchesFilters(item, filters, maxPrice);
        });
        const nextVisibleItems = sortItems(filteredItems, sortValue);

        if (gridUpdateTimer) {
            window.clearTimeout(gridUpdateTimer);
        }

        grid.classList.add('is-updating');
        gridUpdateTimer = window.setTimeout(function () {
            grid.classList.remove('is-updating');
        }, ANIMATION_MS.grid);

        if (resultsCountEl) {
            resultsCountEl.textContent = String(nextVisibleItems.length);
        }

        updateEmptyState(nextVisibleItems.length);

        animateLayoutChange(nextVisibleItems, firstRects, animate);
    }

    function scheduleRender() {
        if (renderRaf) {
            window.cancelAnimationFrame(renderRaf);
        }

        renderRaf = window.requestAnimationFrame(function () {
            renderRaf = 0;
            renderResults();
        });
    }

    function clearFilters() {
        filterInputs.forEach(function (input) {
            input.checked = false;
        });

        if (priceSliderDesktop) {
            priceSliderDesktop.value = priceSliderDesktop.getAttribute('value') || priceSliderDesktop.max;
            if (priceMaxLabel) priceMaxLabel.textContent = formatPrice(priceSliderDesktop.value);
        }

        if (priceSliderMobile) {
            priceSliderMobile.value = priceSliderMobile.getAttribute('value') || priceSliderMobile.max;
            if (priceMaxLabelMobile) priceMaxLabelMobile.textContent = formatPrice(priceSliderMobile.value);
        }

        if (sortSelect) {
            sortSelect.value = 'newest';
        }

        scheduleRender();
    }

    filterInputs.forEach(function (input) {
        input.addEventListener('change', function () {
            syncFilterPair(input);
            scheduleRender();
        });
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', scheduleRender);
    }

    if (clearFiltersDesktop) {
        clearFiltersDesktop.addEventListener('click', clearFilters);
    }

    if (clearFiltersMobile) {
        clearFiltersMobile.addEventListener('click', clearFilters);
    }

    window.MarketSphereSearchResults = {
        getItems: function () {
            return searchItems.slice();
        },
        setItems: function (items) {
            searchItems = Array.isArray(items) ? items : [];
            scheduleRender();
        },
        render: scheduleRender
    };

    renderResults();
});
