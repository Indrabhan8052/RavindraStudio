// public/js/main.js
// Lightweight vanilla JS for storefront interactivity — no framework needed.

// ── CSRF auto-injection ──────────────────────────────────────────────────────
// window.CSRF_TOKEN is set on every page (see views/partials/csrf-meta.ejs),
// but nothing was reading it — so most storefront POST forms (cart update/
// remove, wishlist remove, cancel order, payment-proof upload, profile
// update, etc.) were missing the hidden _csrf field the server requires.
// This adds it to any POST form that doesn't already have one.
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
    autoDismissFlashMessages();
    initQuantitySteppers();
    initPasswordStrength();
    initProductGallery();
    initStarRatingInput();
});

// ---------- Auto-dismiss flash messages after a few seconds ----------
function autoDismissFlashMessages() {
    const flashes = document.querySelectorAll('.flash');
    flashes.forEach((el, i) => {
        setTimeout(() => {
            el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            setTimeout(() => el.remove(), 300);
        }, 4500 + i * 300);
    });
}

// ---------- Quantity stepper (+/- buttons next to a number input) ----------
function initQuantitySteppers() {
    document.querySelectorAll('.qty-stepper').forEach(stepper => {
        const input = stepper.querySelector('input');
        const minusBtn = stepper.querySelector('[data-action="decrease"]');
        const plusBtn = stepper.querySelector('[data-action="increase"]');
        const max = parseInt(input?.getAttribute('max')) || 99;
        const min = parseInt(input?.getAttribute('min')) || 1;

        minusBtn?.addEventListener('click', () => {
            const val = Math.max(min, (parseInt(input.value) || min) - 1);
            input.value = val;
            input.dispatchEvent(new Event('change'));
        });
        plusBtn?.addEventListener('click', () => {
            const val = Math.min(max, (parseInt(input.value) || min) + 1);
            input.value = val;
            input.dispatchEvent(new Event('change'));
        });
    });
}

// ---------- Password strength meter on registration form ----------
function initPasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthBars = document.querySelectorAll('.password-strength span');
    if (!passwordInput || strengthBars.length === 0) return;

    passwordInput.addEventListener('input', () => {
        const value = passwordInput.value;
        let score = 0;
        if (value.length >= 8) score++;
        if (/[A-Z]/.test(value)) score++;
        if (/[0-9]/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;

        const colors = ['#E4DACB', '#B3402F', '#D4A24C', '#7C9070', '#4F7355'];
        strengthBars.forEach((bar, i) => {
            bar.style.background = i < score ? colors[score] : '#E4DACB';
        });
    });
}

// ---------- Product detail page: thumbnail click swaps main image ----------
function initProductGallery() {
    const mainImg = document.querySelector('[data-gallery-main]');
    const thumbs = document.querySelectorAll('[data-gallery-thumb]');
    if (!mainImg || thumbs.length === 0) return;

    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            const newSrc = thumb.getAttribute('data-image');
            mainImg.setAttribute('src', newSrc);
            thumbs.forEach(t => t.classList.remove('is-active'));
            thumb.classList.add('is-active');
        });
    });
}

// ---------- Star rating input for reviews ----------
function initStarRatingInput() {
    const starInputs = document.querySelectorAll('.star-input input[type="radio"]');
    starInputs.forEach(input => {
        input.addEventListener('change', () => {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) label.textContent = '★';
        });
    });
}

// ---------- Confirm before destructive actions (delete product, cancel order, etc.) ----------
document.addEventListener('submit', (e) => {
    const form = e.target;
    injectCsrfTokenIntoForms(form.parentNode || document); // safety net for dynamic forms
    if (form.matches('[data-confirm]')) {
        const message = form.getAttribute('data-confirm') || 'Are you sure?';
        if (!confirm(message)) {
            e.preventDefault();
        }
    }
});