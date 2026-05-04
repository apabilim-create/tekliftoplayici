// Teklif Ver Module
import { supabase } from './supabase.js';
import { getCurrentFirma } from './auth.js';
import { showToast, setLoading, formatDate, formatMoney, shortId } from './utils.js';

export function renderTeklifVerPage() {
  return `
    <div class="dashboard-container">
      <button class="back-btn" id="back-to-home">
        <span class="arrow">←</span> Ana Sayfaya Dön
      </button>
      <div class="section-header">
        <h2><span class="emoji">📤</span> Teklif Ver</h2>
      </div>
      <div class="tabs">
        <button class="tab-btn active" data-tab="search">🔍 Firma Ara</button>
        <button class="tab-btn" data-tab="my-offers">📋 Tekliflerim</button>
      </div>
      <div id="tab-search" class="tab-content">
        <div class="glass-card glass-card-wide">
          <h3 style="margin-bottom:20px;">Teklif vereceğiniz firmayı arayın</h3>
          <form id="firma-search-form">
            <div class="form-row">
              <div class="form-group">
                <label>Firma Adı</label>
                <input type="text" class="form-input" id="search-firma-name" placeholder="Firma adı girin">
              </div>
              <div class="form-group">
                <label>Vergi Kimlik No (VKN)</label>
                <input type="text" class="form-input" id="search-firma-vkn" placeholder="Vergi no girin">
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:8px;">🔍 Firma Ara</button>
          </form>
        </div>
        <div id="search-results" style="margin-top:24px;"></div>
      </div>
      <div id="tab-my-offers" class="tab-content" style="display:none;">
        <div id="my-offers-list"><div class="flex-center" style="padding:40px;"><div class="spinner"></div></div></div>
      </div>
    </div>`;
}

export function attachTeklifVerEvents(navigate) {
  document.getElementById('back-to-home')?.addEventListener('click', () => navigate('dashboard'));

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
      if (btn.dataset.tab === 'my-offers') loadMyOffers();
    });
  });

  document.getElementById('firma-search-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await searchFirma();
  });
}

async function searchFirma() {
  const name = document.getElementById('search-firma-name').value.trim();
  const vknInput = document.getElementById('search-firma-vkn').value.trim();
  const results = document.getElementById('search-results');
  const firma = getCurrentFirma();
  if (!name && !vknInput) { showToast('Ad veya VKN girin', 'error'); return; }
  setLoading(true);
  try {
    let query = supabase.from('firma_bilgileri').select('id, firma_ismi, mail, vergi_no').neq('id', firma.id);
    if (name) query = query.ilike('firma_ismi', '%' + name + '%');
    if (vknInput) query = query.eq('vergi_no', vknInput);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
      results.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>Firma bulunamadı</h3></div>';
      return;
    }
    results.innerHTML = data.map(f => `
      <div class="glass-card glass-card-wide" style="margin-bottom:12px;cursor:pointer;" data-firma-id="${f.id}" class="firma-result-card">
        <div class="flex-between">
          <div><h3 style="font-size:1.05rem;">${f.firma_ismi}</h3>
          <p class="text-muted" style="font-size:0.85rem;">VKN: ${f.vergi_no || '—'} · ${f.mail}</p></div>
          <button class="btn btn-primary btn-sm view-talep-btn" data-fid="${f.id}" data-fname="${f.firma_ismi}">📋 Taleplerini Gör</button>
        </div>
      </div>`).join('');
    results.querySelectorAll('.view-talep-btn').forEach(btn => {
      btn.addEventListener('click', () => loadFirmaTalepleri(btn.dataset.fid, btn.dataset.fname));
    });
  } catch (err) { showToast('Arama hatası: ' + err.message, 'error'); }
  finally { setLoading(false); }
}

async function loadFirmaTalepleri(firmaId, firmaName) {
  const results = document.getElementById('search-results');
  setLoading(true);
  try {
    const { data, error } = await supabase.from('teklif_al').select('*')
      .eq('firma_id', firmaId).eq('durum', 'Açık').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) {
      results.innerHTML = `<div class="glass-card glass-card-wide"><button class="back-btn" id="back-search">← Aramaya Dön</button>
        <div class="empty-state"><div class="empty-icon">📭</div><h3>${firmaName} - Açık talep yok</h3></div></div>`;
      document.getElementById('back-search')?.addEventListener('click', () => { results.innerHTML = ''; });
      return;
    }
    results.innerHTML = `
      <div class="glass-card glass-card-wide">
        <button class="back-btn" id="back-search">← Aramaya Dön</button>
        <h3 style="margin-bottom:16px;">📋 ${firmaName} - Açık Talepler</h3>
        <div id="talep-list-container">
          ${data.map(t => renderTalepWithForm(t)).join('')}
        </div>
      </div>`;
    document.getElementById('back-search')?.addEventListener('click', () => { results.innerHTML = ''; });
    // Teklif gönder formları
    results.querySelectorAll('.send-teklif-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const success = await sendTeklif(form, firmaId, firmaName);
        if (success) form.closest('.talep-card')?.remove();
      });
    });
    // Vazgeç butonu
    results.querySelectorAll('.vazgec-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.talep-card')?.remove();
      });
    });
  } catch (err) { showToast('Hata: ' + err.message, 'error'); }
  finally { setLoading(false); }
}

function renderTalepWithForm(talep) {
  return `
    <div class="talep-card" style="border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:16px;margin-bottom:12px;">
      <div style="margin-bottom:12px;">
        <p><strong>Ürün:</strong> ${talep.urun_ismi || '—'} · <strong>Marka:</strong> ${talep.marka || '—'} · <strong>Adet:</strong> ${talep.adet || '—'} · <strong>Son Tarih:</strong> ${formatDate(talep.son_teklif_tarihi)}</p>
      </div>
      <form class="send-teklif-form" data-talep-id="${talep.id}">
        <div class="teklif-inline-form" style="grid-template-columns: 1fr 1fr 70px 100px 90px;">
          <div class="form-group"><label>Ürün</label><input type="text" class="form-input tf-urun" value="${talep.urun_ismi || ''}" placeholder="Ürün"></div>
          <div class="form-group"><label>Marka</label><input type="text" class="form-input tf-marka" value="${talep.marka || ''}" placeholder="Marka"></div>
          <div class="form-group"><label>Adet</label><input type="number" class="form-input tf-adet" value="${talep.adet || ''}" min="1"></div>
          <div class="form-group"><label>Birim Fiyat</label><input type="number" class="form-input tf-fiyat" placeholder="0.00" step="0.01" min="0" required></div>
          <div class="form-group">
            <label>Birim</label>
            <select class="form-input tf-birim" style="padding: 10px 8px;">
              <option value="TL">₺ TL</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <div class="form-group" style="flex:1;margin-bottom:0;"><input type="text" class="form-input tf-not" placeholder="Not ekleyin (opsiyonel)"></div>
          <button type="submit" class="btn btn-primary btn-sm">✅ Onayla</button>
          <button type="button" class="btn btn-secondary btn-sm vazgec-btn">✖ Vazgeç</button>
        </div>
      </form>
    </div>`;
}

async function sendTeklif(form, firmaId, firmaName) {
  const firma = getCurrentFirma();
  const talepId = form.dataset.talepId;
  const urun = form.querySelector('.tf-urun').value.trim();
  const marka = form.querySelector('.tf-marka').value.trim();
  const adet = form.querySelector('.tf-adet').value;
  const fiyat = form.querySelector('.tf-fiyat').value;
  const birim = form.querySelector('.tf-birim').value;
  const not = form.querySelector('.tf-not').value.trim();
  if (!fiyat) { showToast('Birim fiyat giriniz', 'error'); return; }
  const toplam = adet ? parseFloat(fiyat) * parseInt(adet) : parseFloat(fiyat);
  setLoading(true);
  try {
    const { error } = await supabase.from('teklif_ver').insert([{
      teklif_al_id: talepId, veren_firma_id: firma.id,
      urun_ismi: urun || null, marka: marka || null,
      adet: adet ? parseInt(adet) : null,
      birim_fiyat: parseFloat(fiyat), toplam_fiyat: toplam,
      para_birimi: birim,
      notlar: not || null
    }]);
    if (error) throw error;
    showToast('Teklif gönderildi!', 'success');
    return true; // Başarılı
  } catch (err) { 
    showToast('Hata: ' + err.message, 'error'); 
    return false; // Hata
  }
  finally { setLoading(false); }
}

async function loadMyOffers() {
  const firma = getCurrentFirma();
  const container = document.getElementById('my-offers-list');
  if (!container) return;
  try {
    const { data, error } = await supabase.from('teklif_ver')
      .select('*, talep:teklif_al!teklif_ver_teklif_al_id_fkey(urun_ismi, marka, adet, firma:firma_bilgileri!teklif_al_firma_id_fkey(firma_ismi))')
      .eq('veren_firma_id', firma.id).order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><h3>Henüz teklif vermediniz</h3></div>';
      return;
    }
    container.innerHTML = `<div class="table-wrapper"><table class="data-table"><thead><tr>
      <th>Firma</th><th>Ürün</th><th>Marka</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th><th>Tarih</th><th>Güncelle</th></tr></thead><tbody>
      ${data.map(t => `<tr>
        <td style="font-weight:600;">${t.talep?.firma?.firma_ismi || '—'}</td>
        <td>${t.urun_ismi || '—'}</td><td>${t.marka || '—'}</td><td>${t.adet || '—'}</td>
        <td style="color:var(--accent-secondary);font-weight:600;">${formatMoney(t.birim_fiyat, t.para_birimi)}</td>
        <td style="color:var(--accent-primary);font-weight:600;">${formatMoney(t.toplam_fiyat, t.para_birimi)}</td>
        <td>${formatDate(t.created_at)}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-sm edit-offer" data-id="${t.id}" data-fiyat="${t.birim_fiyat}" data-birim="${t.para_birimi}" data-adet="${t.adet || 1}">📝</button>
            <button class="btn btn-secondary btn-sm del-offer" data-id="${t.id}">🗑️</button>
          </div>
        </td></tr>`).join('')}
      </tbody></table></div>`;
    container.querySelectorAll('.edit-offer').forEach(btn => {
      btn.addEventListener('click', () => showEditOfferModal(btn.dataset.id, btn.dataset.fiyat, btn.dataset.birim, btn.dataset.adet));
    });
    container.querySelectorAll('.del-offer').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Teklifi silmek istediğinize emin misiniz?')) return;
        setLoading(true);
        try {
          await supabase.from('teklif_ver').delete().eq('id', btn.dataset.id);
          showToast('Teklif silindi', 'success');
          await loadMyOffers();
        } catch (err) { showToast('Hata', 'error'); }
        finally { setLoading(false); }
      });
    });
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Yüklenemedi</h3></div>';
  }
}

/**
 * Teklif düzenleme modalı
 */
function showEditOfferModal(id, currentFiyat, currentBirim, adet) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="flex-between mb-24">
        <h3 style="font-size: 1.25rem;">📝 Teklifi Güncelle</h3>
        <button class="btn btn-secondary btn-sm" id="cancel-edit-x">✕</button>
      </div>
      <div class="form-group">
        <label>Birim Fiyat</label>
        <input type="number" id="edit-fiyat" class="form-input" value="${currentFiyat}" step="0.01" min="0">
      </div>
      <div class="form-group">
        <label>Para Birimi</label>
        <select id="edit-birim" class="form-input">
          <option value="TL" ${currentBirim === 'TL' ? 'selected' : ''}>₺ TL</option>
          <option value="USD" ${currentBirim === 'USD' ? 'selected' : ''}>$ USD</option>
          <option value="EUR" ${currentBirim === 'EUR' ? 'selected' : ''}>€ EUR</option>
        </select>
      </div>
      <div class="flex-end" style="gap: 8px; margin-top: 24px;">
        <button class="btn btn-secondary" id="cancel-edit">İptal</button>
        <button class="btn btn-primary" id="save-edit">💾 Güncelle</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  document.getElementById('cancel-edit').onclick = closeModal;
  document.getElementById('cancel-edit-x').onclick = closeModal;
  
  document.getElementById('save-edit').onclick = async () => {
    const yeniFiyat = document.getElementById('edit-fiyat').value;
    const yeniBirim = document.getElementById('edit-birim').value;
    if (!yeniFiyat) return showToast('Fiyat giriniz', 'error');

    const toplam = parseFloat(yeniFiyat) * (parseInt(adet) || 1);
    setLoading(true);
    try {
      const { error } = await supabase.from('teklif_ver')
        .update({ birim_fiyat: parseFloat(yeniFiyat), para_birimi: yeniBirim, toplam_fiyat: toplam })
        .eq('id', id);
      if (error) throw error;
      showToast('Teklif güncellendi', 'success');
      modal.remove();
      loadMyOffers();
    } catch (err) { 
      console.error(err);
      showToast('Güncelleme hatası', 'error'); 
    } finally { 
      setLoading(false); 
    }
  };
}
