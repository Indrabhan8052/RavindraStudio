// public/js/admin.js

// ── CSRF auto-injection ──────────────────────────────────────────────────────
// window.CSRF_TOKEN is set by every admin page (see views/admin/layout.ejs),
// but nothing was ever reading it — so almost every POST form in the admin
// panel (verify payment, reject payment, delete product, toggle active,
// delete category, etc.) was missing the hidden _csrf field the server
// requires, and failing with "session has expired" or silently doing
// nothing. This runs on every page load and adds the field to any POST
// form that doesn't already have one, so it's fixed everywhere at once —
// including any new admin forms added later.
function injectCsrfTokenIntoForms(root = document) {
    if (!window.CSRF_TOKEN) return;
    root.querySelectorAll('form').forEach(form => {
        const method = (form.getAttribute('method') || 'GET').toUpperCase();
        if (method !== 'POST') return;
        if (form.querySelector('input[name="_csrf"]')) return; // already has one
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_csrf';
        input.value = window.CSRF_TOKEN;
        form.prepend(input);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    injectCsrfTokenIntoForms();

    // Auto-dismiss flash messages after 5s
    document.querySelectorAll('.admin-flash').forEach((el, i) => {
        setTimeout(() => {
            el.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 5000 + i * 300);
    });

    // Confirm before destructive form submissions
    document.addEventListener('submit', (e) => {
        const form = e.target;
        injectCsrfTokenIntoForms(form.parentNode || document); // safety net for dynamic forms
        if (form.matches('[data-confirm]')) {
            const message = form.getAttribute('data-confirm') || 'Are you sure?';
            if (!confirm(message)) e.preventDefault();
        }
    });

    // Image preview on product/category upload
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', () => {
            const area = input.closest('.image-upload-area');
            if (!area) return;
            const files = Array.from(input.files);
            const existing = area.querySelector('.preview-bar');
            if (existing) existing.remove();
            if (files.length > 0) {
                const bar = document.createElement('div');
                bar.className = 'preview-bar';
                bar.style.cssText = 'display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; justify-content:center;';
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const img = document.createElement('img');
                        img.src = ev.target.result;
                        img.style.cssText = 'width:64px; height:64px; object-fit:cover; border-radius:6px; border:2px solid var(--admin-border);';
                        bar.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                });
                area.appendChild(bar);
            }
        });
    });
});