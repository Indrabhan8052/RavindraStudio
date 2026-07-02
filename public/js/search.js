// public/js/search.js
// Live autocomplete for the header search bar.
// - Debounces keystrokes (300ms) before fetching
// - Keyboard navigation: Arrow Up/Down, Enter to select, Escape to close
// - Highlights the matching portion of the product name
// - Works gracefully if the /api/search/autocomplete endpoint is unavailable

(function () {
    const input = document.getElementById('searchInput');
    const dropdown = document.getElementById('autocompleteDropdown');
    const form = document.getElementById('searchForm');

    if (!input || !dropdown) return; // not on a page with the search bar

    let debounceTimer = null;
    let currentQuery = '';
    let highlightedIndex = -1;
    let items = [];

    // ── Helpers ──────────────────────────────────────────────────────────────

    function highlightText(text, query) {
        if (!query) return escapeHtml(text);
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatPrice(price) {
        return '₹' + Number(price).toLocaleString('en-IN');
    }

    function shapeClipPath(shape) {
        // Inline SVG shape applied as a simple visual cue on thumb
        const shapes = {
            circle: 'border-radius:50%',
            heart: 'clip-path:path("M22 22C7 14 0 10 0 5.5 0 2.5 2.5 0 5.5 0 8 0 11 2 12 4 13 2 16 0 18.5 0 21.5 0 24 2.5 24 5.5c0 4.5-7 8.5-22 16.5Z"); transform:scale(0.9);',
            oval: 'border-radius:50%; transform:scaleX(0.75)',
            hexagon: 'clip-path:polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)',
            polaroid: 'border-radius:2px',
            collage: 'border-radius:3px',
            rectangle: 'border-radius:3px',
            square: 'border-radius:4px'
        };
        return shapes[shape] || 'border-radius:4px';
    }

    // ── Render Dropdown ───────────────────────────────────────────────────────

    function renderDropdown(data, query) {
        items = [];
        highlightedIndex = -1;
        const { products = [], categories = [] } = data;

        if (products.length === 0 && categories.length === 0) {
            dropdown.innerHTML = `<div class="ac-empty">No frames found for "<strong>${escapeHtml(query)}</strong>". Press Enter to search all.</div>`;
            openDropdown();
            return;
        }

        let html = '';

        if (categories.length > 0) {
            html += `<div class="ac-section-label">Shape Categories</div>`;
            categories.forEach(cat => {
                const idx = items.length;
                items.push({ type: 'category', url: `/products?category=${cat.slug}` });
                html += `
                    <a href="/products?category=${escapeHtml(cat.slug)}" class="ac-category-item" data-idx="${idx}" role="option">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/></svg>
                        ${highlightText(cat.name, query)}
                        <span style="margin-left:auto; font-family:var(--font-mono); font-size:0.72rem; color:var(--color-sage);">${cat.icon_shape}</span>
                    </a>`;
            });
        }

        if (products.length > 0) {
            html += `<div class="ac-section-label">Products</div>`;
            products.forEach(p => {
                const idx = items.length;
                items.push({ type: 'product', url: `/products/${p.slug}` });
                const outOfStock = p.stock_quantity === 0;
                html += `
                    <a href="/products/${escapeHtml(p.slug)}" class="ac-product-item" data-idx="${idx}" role="option">
                        <div class="ac-product-item__thumb">
                            <img src="${escapeHtml(p.primary_image || '/images/placeholder-frame.svg')}"
                                 alt="${escapeHtml(p.name)}"
                                 style="${shapeClipPath(p.icon_shape)}"
                                 loading="lazy">
                        </div>
                        <div class="ac-product-item__info">
                            <div class="ac-product-item__name">${highlightText(p.name, query)}</div>
                            <div class="ac-product-item__meta">${escapeHtml(p.category_name)}${outOfStock ? ' · <span style="color:var(--color-error)">Out of stock</span>' : ''}</div>
                        </div>
                        <div class="ac-product-item__price">${formatPrice(p.effective_price)}</div>
                    </a>`;
            });
        }

        // Footer: view all results
        const totalHint = products.length >= 8 ? `${products.length}+` : products.length;
        html += `<a href="/search?q=${encodeURIComponent(query)}" class="ac-footer">View all results for "${escapeHtml(query)}" →</a>`;

        dropdown.innerHTML = html;
        openDropdown();

        // Attach click tracking (already navigates via <a href> naturally)
        dropdown.querySelectorAll('[data-idx]').forEach(el => {
            el.addEventListener('mouseenter', () => {
                setHighlight(parseInt(el.dataset.idx));
            });
        });
    }

    function renderLoading() {
        dropdown.innerHTML = `<div class="ac-loading"><div class="ac-spinner"></div> Searching…</div>`;
        openDropdown();
    }

    function openDropdown() {
        dropdown.classList.add('is-open');
        input.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
        dropdown.classList.remove('is-open');
        input.setAttribute('aria-expanded', 'false');
        highlightedIndex = -1;
        items = [];
    }

    function setHighlight(idx) {
        const allItems = dropdown.querySelectorAll('[data-idx]');
        allItems.forEach(el => el.classList.remove('is-highlighted'));
        if (idx >= 0 && idx < items.length) {
            highlightedIndex = idx;
            const target = dropdown.querySelector(`[data-idx="${idx}"]`);
            if (target) {
                target.classList.add('is-highlighted');
                target.scrollIntoView({ block: 'nearest' });
            }
        } else {
            highlightedIndex = -1;
        }
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────

    async function fetchSuggestions(query) {
        try {
            const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(query)}`, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(3000)
            });
            if (!res.ok) throw new Error('Search API error');
            return await res.json();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn('Autocomplete fetch failed:', err.message);
            }
            return { products: [], categories: [] };
        }
    }

    // ── Event Listeners ───────────────────────────────────────────────────────

    input.addEventListener('input', () => {
        const query = input.value.trim();
        clearTimeout(debounceTimer);

        if (query.length < 2) {
            closeDropdown();
            return;
        }

        if (query === currentQuery) return; // no change, skip re-fetch
        currentQuery = query;

        renderLoading();

        debounceTimer = setTimeout(async () => {
            const data = await fetchSuggestions(query);
            // Only render if the query hasn't changed while we were waiting
            if (query === input.value.trim()) {
                renderDropdown(data, query);
            }
        }, 300);
    });

    input.addEventListener('keydown', (e) => {
        if (!dropdown.classList.contains('is-open')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = highlightedIndex + 1 < items.length ? highlightedIndex + 1 : 0;
            setHighlight(next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = highlightedIndex > 0 ? highlightedIndex - 1 : items.length - 1;
            setHighlight(prev);
        } else if (e.key === 'Enter') {
            if (highlightedIndex >= 0 && items[highlightedIndex]) {
                e.preventDefault();
                window.location.href = items[highlightedIndex].url;
            }
            // else: let the form submit normally
        } else if (e.key === 'Escape') {
            closeDropdown();
            input.blur();
        }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchWrapper')) {
            closeDropdown();
        }
    });

    // Re-open if user re-focuses and there's already a query
    input.addEventListener('focus', () => {
        const query = input.value.trim();
        if (query.length >= 2 && dropdown.innerHTML && !dropdown.classList.contains('is-open')) {
            openDropdown();
        }
    });

})();
