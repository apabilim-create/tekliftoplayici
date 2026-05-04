// ============================================
// Teklif Yönetim Sistemi - Utility Functions
// ============================================

/**
 * Toast bildirimi göster
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.getElementById('app')?.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.4s ease-out forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

/**
 * Loading overlay göster/gizle
 */
export function setLoading(show) {
  const existing = document.querySelector('.loading-overlay');
  if (existing) existing.remove();

  if (show) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <p style="color: var(--text-secondary);">Yükleniyor...</p>
      </div>
    `;
    document.getElementById('app').appendChild(overlay);
  }
}

/**
 * Tarih formatla
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Kısa ID
 */
export function shortId(id) {
  if (!id) return '—';
  return id.substring(0, 8).toUpperCase();
}

/**
 * Para formatı
 */
export function formatMoney(amount, currencyCode = 'TL') {
  if (!amount && amount !== 0) return '—';
  const symbols = { 'TL': '₺', 'USD': '$', 'EUR': '€' };
  const symbol = symbols[currencyCode] || '₺';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(amount) + ' ' + symbol;
}
