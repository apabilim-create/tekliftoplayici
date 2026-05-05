// Accepted Offers Module
import { supabase } from './supabase.js';
import { getCurrentFirma } from './auth.js';
import { showToast, setLoading, formatDate, formatMoney } from './utils.js';

export function renderAcceptedOffersPage() {
  return `
    <div class="dashboard-container">
      <button class="back-btn" id="back-to-home">
        <span class="arrow">←</span> Ana Sayfaya Dön
      </button>
      <div class="section-header">
        <h2><span class="emoji">✅</span> Kabul Edilen Teklifler</h2>
      </div>
      <div id="accepted-offers-list">
        <div class="flex-center" style="padding:40px;"><div class="spinner"></div></div>
      </div>
    </div>`;
}

export function attachAcceptedOffersEvents(navigate) {
  document.getElementById('back-to-home')?.addEventListener('click', () => navigate('dashboard'));
  loadAcceptedOffers();
}

async function loadAcceptedOffers() {
  const firma = getCurrentFirma();
  const container = document.getElementById('accepted-offers-list');
  if (!container) return;

  try {
    // Kabul edilenler tablosundan, teklifi veren firma (biz) olan kayıtları çekiyoruz
    const { data, error } = await supabase
      .from('kabul_edilenler')
      .select(`
        id,
        created_at,
        teklif_ver (
          id, urun_ismi, marka, adet, birim_fiyat, toplam_fiyat, para_birimi, notlar, veren_firma_id
        ),
        teklif_al (
          id, urun_ismi, marka, adet, firma_id, 
          firma:firma_bilgileri!teklif_al_firma_id_fkey (firma_ismi, mail, telefon)
        )
      `)
      .eq('teklif_ver.veren_firma_id', firma.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Supabase .eq() filtresi join içindeki field için bazen boş dönebilir (PostgREST davranışı)
    // Bu yüzden istemci tarafında da filtreleme yapıyoruz
    const filteredData = data.filter(item => item.teklif_ver && item.teklif_ver.veren_firma_id === firma.id);

    if (!filteredData || filteredData.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <h3>Henüz kabul edilen teklifiniz yok</h3>
          <p>Teklifleriniz kabul edildiğinde burada listelenecektir.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kabul Eden Firma</th>
              <th>Ürün / Marka</th>
              <th>Miktar</th>
              <th>Teklif Tutarı</th>
              <th>Kabul Tarihi</th>
              <th>Notlar</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => {
              const t = item.teklif_ver;
              const talep = item.teklif_al;
              return `
                <tr>
                  <td style="font-weight:600;">
                    ${talep?.firma?.firma_ismi || '—'}<br>
                    <small class="text-muted">📧 ${talep?.firma?.mail || '—'}</small>
                  </td>
                  <td>
                    ${t.urun_ismi || '—'}<br>
                    <small class="text-muted">${t.marka || ''}</small>
                  </td>
                  <td>${t.adet || '—'}</td>
                  <td style="color:var(--accent-secondary);font-weight:600;">${formatMoney(t.birim_fiyat, t.para_birimi)}</td>
                  <td>${formatDate(item.created_at)}</td>
                  <td><small>${t.notlar || '—'}</small></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    console.error('Error loading accepted offers:', err);
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Hata Oluştu</h3><p>${err.message}</p></div>`;
  }
}
