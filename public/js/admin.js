// public/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
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
