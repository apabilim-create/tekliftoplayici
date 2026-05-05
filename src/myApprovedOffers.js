// My Approved Offers Module
import { supabase } from './supabase.js';
import { getCurrentFirma } from './auth.js';
import { showToast, setLoading, formatDate, formatMoney } from './utils.js';

export function renderMyApprovedOffersPage() {
  return `
    <div class="dashboard-container">
      <button class="back-btn" id="back-to-home">
        <span class="arrow">←</span> Ana Sayfaya Dön
      </button>
      <div class="section-header">
        <h2><span class="emoji">📋</span> Onayladığım Teklifler</h2>
      </div>
      <div id="my-approved-offers-list">
        <div class="flex-center" style="padding:40px;"><div class="spinner"></div></div>
      </div>
    </div>`;
}

export function attachMyApprovedOffersEvents(navigate) {
  document.getElementById('back-to-home')?.addEventListener('click', () => navigate('dashboard'));
  loadMyApprovedOffers();
}

async function loadMyApprovedOffers() {
  const firma = getCurrentFirma();
  const container = document.getElementById('my-approved-offers-list');
  if (!container) return;

  try {
    const { data, error } = await supabase
      .from('onayladigim_teklifler')
      .select(`
        id,
        created_at,
        teklif_ver (
          id, urun_ismi, marka, adet, birim_fiyat, toplam_fiyat, para_birimi, notlar,
          veren_firma:firma_bilgileri!teklif_ver_veren_firma_id_fkey (firma_ismi, mail, telefon)
        ),
        teklif_al (
          id, urun_ismi, marka, adet
        )
      `)
      .eq('onaylayan_firma_id', firma.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>Henüz bir teklifi onaylamadınız</h3>
          <p>Gelen teklifleri kabul ettiğinizde burada görünecektir.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Teklif Veren Firma</th>
              <th>Ürün / Marka</th>
              <th>Miktar</th>
              <th>Teklif Tutarı</th>
              <th>Onay Tarihi</th>
              <th>Notlar</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => {
              const t = item.teklif_ver;
              const talep = item.teklif_al;
              return `
                <tr>
                  <td style="font-weight:600;">
                    ${t?.veren_firma?.firma_ismi || '—'}<br>
                    <small class="text-muted">📧 ${t?.veren_firma?.mail || '—'}</small>
                  </td>
                  <td>
                    ${t?.urun_ismi || talep?.urun_ismi || '—'}<br>
                    <small class="text-muted">${t?.marka || talep?.marka || ''}</small>
                  </td>
                  <td>${t?.adet || talep?.adet || '—'}</td>
                  <td style="color:var(--accent-secondary);font-weight:600;">${formatMoney(t?.birim_fiyat, t?.para_birimi)}</td>
                  <td>${formatDate(item.created_at)}</td>
                  <td><small>${t?.notlar || '—'}</small></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    console.error('Error loading my approved offers:', err);
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Hata Oluştu</h3><p>${err.message}</p></div>`;
  }
}
