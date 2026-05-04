import { supabase } from './supabase.js';
import { getCurrentFirma } from './auth.js';
import { shortId, formatMoney, setLoading, showToast } from './utils.js';

let _navigate; // Navigasyon fonksiyonunu saklamak için

/**
 * Dashboard sayfası
 */
export async function renderDashboard(navigate) {
  _navigate = navigate;
  const firma = getCurrentFirma();
  if (!firma) { navigate('login'); return ''; }

  // İstatistikleri çek
  const [talepRes, teklifRes, gelenTeklifRes] = await Promise.all([
    supabase.from('teklif_al').select('id', { count: 'exact' }).eq('firma_id', firma.id),
    supabase.from('teklif_ver').select('id', { count: 'exact' }).eq('veren_firma_id', firma.id),
    supabase.from('teklif_al')
      .select('id, teklif_ver(id)')
      .eq('firma_id', firma.id)
  ]);

  const talepSayisi = talepRes.count || 0;
  const teklifSayisi = teklifRes.count || 0;

  // Gelen teklifleri say
  let gelenTeklifSayisi = 0;
  if (gelenTeklifRes.data) {
    gelenTeklifRes.data.forEach(t => {
      if (t.teklif_ver) gelenTeklifSayisi += t.teklif_ver.length;
    });
  }

  const initials = firma.firma_ismi.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return `
    <div class="dashboard-container" id="dashboard-page">
      <div class="section-header">
        <h2><span class="emoji">📊</span> Anasayfa</h2>
      </div>

      <div class="stats-grid">
        <div class="stat-card" style="cursor: pointer;" id="stat-taleplerim">
          <div class="stat-icon">📋</div>
          <div class="stat-value">${talepSayisi}</div>
          <div class="stat-label">Taleplerim</div>
        </div>
        <div class="stat-card" style="cursor: pointer;" id="stat-gelen-teklifler">
          <div class="stat-icon">📬</div>
          <div class="stat-value">${gelenTeklifSayisi}</div>
          <div class="stat-label">Gelen Teklifler</div>
        </div>
        <div class="stat-card" style="cursor: pointer;" id="stat-tekliflerim">
          <div class="stat-icon">📤</div>
          <div class="stat-value">${teklifSayisi}</div>
          <div class="stat-label">Verdiğim Teklifler</div>
        </div>
      </div>

      <!-- Action Cards -->
      <div class="action-grid">
        <div class="action-card teklif-al" id="goto-teklif-al">
          <div class="action-icon">📥</div>
          <h3>Teklif Al</h3>
          <p>Yeni ürün talebi oluşturun ve firmalardan teklif toplayın</p>
        </div>
        <div class="action-card teklif-ver" id="goto-teklif-ver">
          <div class="action-icon">🔍</div>
          <h3>Teklif Ver</h3>
          <p>Diğer firmaların taleplerini görün ve hızlıca teklif gönderin</p>
        </div>
      </div>

      <!-- Son Talepler -->
      <div class="section-header">
        <h2><span class="emoji">📝</span> Son Taleplerim</h2>
      </div>
      <div id="son-talepler-list"></div>
    </div>
  `;
}

/**
 * Dashboard event listener'ları
 */
export function attachDashboardEvents(navigate) {
  document.getElementById('goto-teklif-al')?.addEventListener('click', () => navigate('teklif-al'));
  document.getElementById('goto-teklif-ver')?.addEventListener('click', () => navigate('teklif-ver'));
  
  document.getElementById('stat-taleplerim')?.addEventListener('click', () => navigate('teklif-al'));
  document.getElementById('stat-gelen-teklifler')?.addEventListener('click', () => navigate('teklif-al'));
  document.getElementById('stat-tekliflerim')?.addEventListener('click', () => navigate('teklif-ver'));

  // Son talepleri yükle
  loadSonTalepler();
}

/**
 * Gelen tekliflerin detaylarını gösteren modal
 */
async function showGelenTekliflerDetay() {
  const firma = getCurrentFirma();
  setLoading(true);

  try {
    // 1. Firmanın kendi taleplerinin ID listesini al
    const { data: talepler, error: tErr } = await supabase
      .from('teklif_al')
      .select('id')
      .eq('firma_id', firma.id);

    if (tErr) throw tErr;

    if (!talepler || talepler.length === 0) {
      showGelenTekliflerModal([]);
      return;
    }

    const talepIds = talepler.map(t => t.id);

    // 2. Bu taleplere gelen teklifleri çek
    const { data: teklifler, error: oErr } = await supabase
      .from('teklif_ver')
      .select('*, veren_firma:firma_bilgileri!teklif_ver_veren_firma_id_fkey(firma_ismi, mail, telefon, vergi_no)')
      .in('teklif_al_id', talepIds);

    if (oErr) throw oErr;

    // Ürün ismine göre grupla ve fiyata göre sırala
    if (teklifler) {
      teklifler.sort((a, b) => {
        const urunA = (a.urun_ismi || '').toLowerCase();
        const urunB = (b.urun_ismi || '').toLowerCase();
        if (urunA < urunB) return -1;
        if (urunA > urunB) return 1;
        return a.birim_fiyat - b.birim_fiyat;
      });
    }

    showGelenTekliflerModal(teklifler || []);
  } catch (err) {
    console.error('Detay yükleme hatası:', err);
    showToast('Teklifler yüklenirken bir hata oluştu', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Teklifleri gösteren modal UI
 */
function showGelenTekliflerModal(teklifler) {

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="flex-between mb-24">
        <h3 style="font-size: 1.25rem;">📬 Gelen Tüm Teklifler</h3>
        <button class="btn btn-secondary btn-sm" id="close-modal">Kapat</button>
      </div>
      
      <div class="table-wrapper" style="max-height: 400px; overflow-y: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Teklif Veren Firma</th>
              <th>Ürün</th>
              <th>Birim Fiyat</th>
              <th>İletişim</th>
              <th>Sil</th>
            </tr>
          </thead>
          <tbody>
            ${!teklifler || teklifler.length === 0 ? '<tr><td colspan="4" class="text-center">Henüz teklif yok</td></tr>' : 
              teklifler.map(t => `
                <tr>
                  <td style="font-weight: 600;">${t.veren_firma?.firma_ismi || '—'}</td>
                  <td>${t.urun_ismi || '—'}</td>
                  <td style="color: var(--accent-secondary); font-weight: 700;">${formatMoney(t.birim_fiyat, t.para_birimi)}</td>
                  <td style="font-size: 0.8rem;">${t.veren_firma?.mail || '—'}<br>${t.veren_firma?.telefon || ''}</td>
                  <td><button class="btn btn-secondary btn-sm del-gelen-teklif" data-id="${t.id}">🗑️</button></td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.getElementById('close-modal').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  modal.querySelectorAll('.del-gelen-teklif').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return;
      const id = btn.dataset.id;
      setLoading(true);
      try {
        const { error } = await supabase.from('teklif_ver').delete().eq('id', id);
        if (error) throw error;
        showToast('Teklif silindi', 'success');
        modal.remove(); // Mevcut modalı kapat
        renderDashboard(_navigate); // İstatistikleri güncelle
        showGelenTekliflerDetay(); // Modalı yeni veriyle aç
      } catch (err) {
        showToast('Silme hatası', 'error');
      } finally {
        setLoading(false);
      }
    };
  });
}

/**
 * Kullanıcının verdiği tekliflerin detaylarını gösteren modal
 */
async function showVerdigimTekliflerDetay() {
  const firma = getCurrentFirma();
  setLoading(true);

  try {
    const { data: teklifler, error } = await supabase
      .from('teklif_ver')
      .select('*, talep:teklif_al!teklif_ver_teklif_al_id_fkey(firma:firma_bilgileri!teklif_al_firma_id_fkey(firma_ismi))')
      .eq('veren_firma_id', firma.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 750px;">
        <div class="flex-between mb-24">
          <h3 style="font-size: 1.25rem;">📤 Verdiğim Tüm Teklifler</h3>
          <button class="btn btn-secondary btn-sm" id="close-modal">Kapat</button>
        </div>
        
        <div class="table-wrapper" style="max-height: 400px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Hedef Firma</th>
                <th>Ürün / Marka</th>
                <th>Adet</th>
                <th>Tutar</th>
                <th>Tarih</th>
                <th>Güncelle</th>
                <th>Sil</th>
              </tr>
            </thead>
            <tbody>
              ${!teklifler || teklifler.length === 0 ? '<tr><td colspan="5" class="text-center">Henüz teklif vermediniz</td></tr>' : 
                teklifler.map(t => `
                  <tr>
                    <td style="font-weight: 600;">${t.talep?.firma?.firma_ismi || '—'}</td>
                    <td>${t.urun_ismi || '—'}<br><small class="text-muted">${t.marka || ''}</small></td>
                    <td>${t.adet || '—'}</td>
                    <td style="color: var(--accent-secondary); font-weight: 700;">${formatMoney(t.birim_fiyat, t.para_birimi)}</td>
                    <td style="font-size: 0.8rem;">${new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
                    <td><button class="btn btn-secondary btn-sm edit-dash-offer" data-id="${t.id}" data-fiyat="${t.birim_fiyat}" data-birim="${t.para_birimi}" data-adet="${t.adet || 1}">📝</button></td>
                    <td><button class="btn btn-danger btn-sm delete-dash-offer" data-id="${t.id}">🗑️</button></td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('close-modal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.querySelectorAll('.edit-dash-offer').forEach(btn => {
      btn.onclick = () => {
        modal.remove(); // Önce ana modalı kapat
        showEditOfferModalDash(btn.dataset.id, btn.dataset.fiyat, btn.dataset.birim, btn.dataset.adet);
      };
    });

    modal.querySelectorAll('.delete-dash-offer').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return;
        setLoading(true);
        try {
          const { error } = await supabase.from('teklif_ver').delete().eq('id', btn.dataset.id);
          if (error) throw error;
          showToast('Teklif silindi', 'success');
          modal.remove();
          showVerdigimTekliflerDetay(); // Modalı tazele
          renderDashboard(_navigate); // Dashboard istatistiklerini tazele
        } catch (err) {
          showToast('Silme hatası', 'error');
        } finally {
          setLoading(false);
        }
      };
    });
  } catch (err) {
    console.error('Teklif yükleme hatası:', err);
    showToast('Teklifleriniz yüklenirken hata oluştu', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Dashboard için teklif düzenleme modalı
 */
function showEditOfferModalDash(id, currentFiyat, currentBirim, adet) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="flex-between mb-24">
        <h3 style="font-size: 1.25rem;">📝 Teklifi Güncelle</h3>
        <button class="btn btn-secondary btn-sm" id="cancel-edit-dash-x">✕</button>
      </div>
      <div class="form-group">
        <label>Birim Fiyat</label>
        <input type="number" id="edit-fiyat-dash" class="form-input" value="${currentFiyat}" step="0.01" min="0">
      </div>
      <div class="form-group">
        <label>Para Birimi</label>
        <select id="edit-birim-dash" class="form-input">
          <option value="TL" ${currentBirim === 'TL' ? 'selected' : ''}>₺ TL</option>
          <option value="USD" ${currentBirim === 'USD' ? 'selected' : ''}>$ USD</option>
          <option value="EUR" ${currentBirim === 'EUR' ? 'selected' : ''}>€ EUR</option>
        </select>
      </div>
      <div class="flex-end" style="gap: 8px; margin-top: 24px;">
        <button class="btn btn-secondary" id="cancel-edit-dash">İptal</button>
        <button class="btn btn-primary" id="save-edit-dash">💾 Güncelle</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => { modal.remove(); showVerdigimTekliflerDetay(); }; // Geri dön
  document.getElementById('cancel-edit-dash').onclick = close;
  document.getElementById('cancel-edit-dash-x').onclick = close;
  
  document.getElementById('save-edit-dash').onclick = async () => {
    const yeniFiyat = document.getElementById('edit-fiyat-dash').value;
    const yeniBirim = document.getElementById('edit-birim-dash').value;
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
      renderDashboard(_navigate); // İstatistikleri güncelle
      showVerdigimTekliflerDetay(); // Modalı tazele
    } catch (err) { 
      showToast('Güncelleme hatası', 'error'); 
    } finally { 
      setLoading(false); 
    }
  };
}

async function loadSonTalepler() {
  const firma = getCurrentFirma();
  if (!firma) return;

  const { data, error } = await supabase
    .from('teklif_al')
    .select('*')
    .eq('firma_id', firma.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const container = document.getElementById('son-talepler-list');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>Henüz talep oluşturmadınız</h3>
        <p>"Teklif Al" butonuna tıklayarak ilk taleplerinizi oluşturun</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Marka</th>
            <th>Adet</th>
            <th>Son Tarih</th>
            <th>Durum</th>
            <th>Güncelle</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(t => `
            <tr>
              <td>${t.urun_ismi || '—'}</td>
              <td>${t.marka || '—'}</td>
              <td>${t.adet || '—'}</td>
              <td>${t.son_teklif_tarihi || '—'}</td>
              <td><span class="badge badge-${t.durum === 'Açık' ? 'open' : t.durum === 'Kapalı' ? 'closed' : 'completed'}">${t.durum}</span></td>
              <td><button class="btn btn-secondary btn-sm edit-talep-btn" data-id="${t.id}">📝</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('.edit-talep-btn').forEach(btn => {
    btn.onclick = () => showEditTalepModal(btn.dataset.id);
  });
}

/**
 * Talebi güncellemek için modal
 */
async function showEditTalepModal(talepId) {
  setLoading(true);
  try {
    const { data: talep, error } = await supabase.from('teklif_al').select('*').eq('id', talepId).single();
    if (error) throw error;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="flex-between mb-24">
          <h3 style="font-size: 1.25rem;">📝 Talebi Güncelle</h3>
          <button class="btn btn-secondary btn-sm" id="close-edit-talep">✕</button>
        </div>
        <form id="edit-talep-form">
          <div class="form-group">
            <label>Ürün İsmi</label>
            <input type="text" id="edit-talep-urun" class="form-input" value="${talep.urun_ismi || ''}" required>
          </div>
          <div class="form-group">
            <label>Marka</label>
            <input type="text" id="edit-talep-marka" class="form-input" value="${talep.marka || ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Adet</label>
              <input type="number" id="edit-talep-adet" class="form-input" value="${talep.adet || ''}" min="1" required>
            </div>
            <div class="form-group">
              <label>Son Tarih</label>
              <input type="date" id="edit-talep-tarih" class="form-input" value="${talep.son_teklif_tarihi || ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Durum</label>
            <select id="edit-talep-durum" class="form-input">
              <option value="Açık" ${talep.durum === 'Açık' ? 'selected' : ''}>Açık</option>
              <option value="Kapalı" ${talep.durum === 'Kapalı' ? 'selected' : ''}>Kapalı</option>
              <option value="Tamamlandı" ${talep.durum === 'Tamamlandı' ? 'selected' : ''}>Tamamlandı</option>
            </select>
          </div>
          <div class="flex-end mt-24" style="gap: 12px;">
            <button type="button" class="btn btn-secondary" id="cancel-edit-talep">Vazgeç</button>
            <button type="submit" class="btn btn-primary">💾 Güncelle</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('close-edit-talep').onclick = close;
    document.getElementById('cancel-edit-talep').onclick = close;

    document.getElementById('edit-talep-form').onsubmit = async (e) => {
      e.preventDefault();
      const urun_ismi = document.getElementById('edit-talep-urun').value;
      const marka = document.getElementById('edit-talep-marka').value;
      const adet = parseInt(document.getElementById('edit-talep-adet').value);
      const son_teklif_tarihi = document.getElementById('edit-talep-tarih').value || null; // Boş string yerine null gönder
      const durum = document.getElementById('edit-talep-durum').value;

      const updates = { urun_ismi, marka, adet, son_teklif_tarihi, durum };

      setLoading(true);
      try {
        const { error: uErr } = await supabase.from('teklif_al').update(updates).eq('id', talepId);
        if (uErr) throw uErr;
        showToast('Talep güncellendi', 'success');
        modal.remove();
        loadSonTalepler();
      } catch (err) {
        showToast('Hata: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
  } catch (err) {
    showToast('Yükleme hatası', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Firma profil bilgilerini ve şifresini güncelleyen modal
 */
export async function showFirmaProfiliModal() {
  const firma = getCurrentFirma();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="flex-between mb-24">
        <h3 style="font-size: 1.25rem;">🏢 Firma Profili</h3>
        <button class="btn btn-secondary btn-sm" id="close-profile">✕</button>
      </div>
      
      <form id="profile-update-form">
        <div class="form-group">
          <label>Firma İsmi</label>
          <input type="text" class="form-input" value="${firma.firma_ismi}" disabled style="opacity: 0.7;">
          <small class="text-muted">Firma ismi değiştirilemez</small>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>E-posta</label>
            <input type="email" id="prof-mail" class="form-input" value="${firma.mail || ''}" required>
          </div>
          <div class="form-group">
            <label>Telefon</label>
            <input type="text" id="prof-tel" class="form-input" value="${firma.telefon || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Vergi Kimlik No (VKN)</label>
          <input type="text" id="prof-vkn" class="form-input" value="${firma.vergi_no || ''}">
        </div>
        <hr style="border: 0.5px solid var(--glass-border); margin: 20px 0;">
        <div class="form-group">
          <label>Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
          <input type="password" id="prof-pass" class="form-input" placeholder="••••••••">
        </div>
        <div class="form-group">
          <label>Yeni Şifre Tekrar</label>
          <input type="password" id="prof-pass-confirm" class="form-input" placeholder="••••••••">
        </div>
        
        <div class="flex-end mt-24" style="gap: 12px;">
          <button type="button" class="btn btn-secondary" id="cancel-profile">Vazgeç</button>
          <button type="submit" class="btn btn-primary">💾 Bilgileri Güncelle</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('close-profile').onclick = close;
  document.getElementById('cancel-profile').onclick = close;

  document.getElementById('profile-update-form').onsubmit = async (e) => {
    e.preventDefault();
    const mail = document.getElementById('prof-mail').value;
    const tel = document.getElementById('prof-tel').value;
    const vkn = document.getElementById('prof-vkn').value;
    const pass = document.getElementById('prof-pass').value;
    const passConfirm = document.getElementById('prof-pass-confirm').value;

    if (pass && pass !== passConfirm) {
      showToast('Şifreler eşleşmiyor!', 'error');
      return;
    }

    setLoading(true);
    try {
      const updates = { mail, telefon: tel, vergi_no: vkn };
      if (pass) updates.sifre = pass;

      const { error } = await supabase.from('firma_bilgileri')
        .update(updates).eq('id', firma.id);

      if (error) throw error;

      // Local storage/session güncelle
      const updatedFirma = { ...firma, ...updates };
      delete updatedFirma.sifre; 
      sessionStorage.setItem('firma', JSON.stringify(updatedFirma)); // sessionStorage anahtarı 'firma' olarak kullanılıyor auth.js'de

      showToast('Profil bilgileriniz güncellendi', 'success');
      modal.remove();
      renderDashboard(_navigate);
    } catch (err) {
      console.error(err);
      showToast('Güncelleme sırasında hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };
}
