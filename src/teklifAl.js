// Teklif Al Module
import { supabase } from './supabase.js';
import { getCurrentFirma } from './auth.js';
import { showToast, setLoading, formatDate, formatMoney } from './utils.js';

export function renderTeklifAlPage() {
  return `
    <div class="dashboard-container">
      <button class="back-btn" id="back-to-home">
        <span class="arrow">←</span> Ana Sayfaya Dön
      </button>
      <div class="section-header">
        <h2><span class="emoji">📥</span> Teklif Al</h2>
        <button class="btn btn-primary btn-sm" id="yeni-talep-btn">✨ Yeni Talep</button>
      </div>
      <div id="talep-form-wrapper" style="display:none;">
        <div class="glass-card glass-card-wide" style="margin-bottom:24px;">
          <h3 style="margin-bottom:20px;">📝 Yeni Ürün Talebi</h3>
          <form id="talep-form">
            <div class="form-row">
              <div class="form-group">
                <label>Ürün İsmi</label>
                <input type="text" class="form-input" id="talep-urun" placeholder="Ürün adı">
              </div>
              <div class="form-group">
                <label>Marka</label>
                <input type="text" class="form-input" id="talep-marka" placeholder="Opsiyonel">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Adet</label>
                <input type="number" class="form-input" id="talep-adet" placeholder="Miktar" min="1">
              </div>
              <div class="form-group">
                <label>Son Teklif Tarihi</label>
                <input type="date" class="form-input" id="talep-tarih">
              </div>
            </div>
            <div style="display:flex;gap:12px;margin-top:8px;">
              <button type="submit" class="btn btn-primary" style="flex:1;">📤 Talebi Oluştur</button>
              <button type="button" class="btn btn-secondary" id="iptal-talep-btn">İptal</button>
            </div>
          </form>
        </div>
      </div>
      <div id="talepler-list"><div class="flex-center" style="padding:40px;"><div class="spinner"></div></div></div>
    </div>`;
}

export function attachTeklifAlEvents(navigate) {
  document.getElementById('back-to-home')?.addEventListener('click', () => navigate('dashboard'));
  const yeniBtn = document.getElementById('yeni-talep-btn');
  if (yeniBtn) {
    yeniBtn.onclick = () => {
      const w = document.getElementById('talep-form-wrapper');
      if (w) w.style.display = w.style.display === 'none' ? 'block' : 'none';
    };
  }
  document.getElementById('iptal-talep-btn')?.addEventListener('click', () => {
    document.getElementById('talep-form-wrapper').style.display = 'none';
  });
  document.getElementById('talep-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleCreateTalep(navigate);
  });
  loadTalepler(navigate);
}

async function handleCreateTalep(navigate) {
  const firma = getCurrentFirma();
  const urun = document.getElementById('talep-urun').value.trim();
  const marka = document.getElementById('talep-marka').value.trim();
  const adet = document.getElementById('talep-adet').value;
  const tarih = document.getElementById('talep-tarih').value;
  if (!urun && !marka && !adet) { showToast('En az bir alan doldurun', 'error'); return; }
  setLoading(true);
  try {
    const { error } = await supabase.from('teklif_al').insert([{
      firma_id: firma.id, urun_ismi: urun || null, marka: marka || null,
      adet: adet ? parseInt(adet) : null, son_teklif_tarihi: tarih || null, durum: 'Açık'
    }]);
    if (error) throw error;
    showToast('Talep oluşturuldu!', 'success');
    document.getElementById('talep-form').reset();
    document.getElementById('talep-form-wrapper').style.display = 'none';
    await loadTalepler(navigate);
  } catch (err) { showToast('Hata: ' + err.message, 'error'); }
  finally { setLoading(false); }
}

async function loadTalepler(navigate) {
  const firma = getCurrentFirma();
  const container = document.getElementById('talepler-list');
  if (!container) return;
  try {
    const { data, error } = await supabase.from('teklif_al')
      .select('*, teklif_ver(id, birim_fiyat, toplam_fiyat, para_birimi, notlar, urun_ismi, marka, adet, created_at, veren_firma:firma_bilgileri!teklif_ver_veren_firma_id_fkey(firma_ismi, id, mail, telefon, vergi_no), kabul_edilenler(id))')
      .eq('firma_id', firma.id).order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><h3>Henüz talep yok</h3><p>"Yeni Talep" ile başlayın</p></div>';
      return;
    }
    container.innerHTML = data.map(t => renderTalepCard(t)).join('');
    container.querySelectorAll('.delete-talep-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Talebi silmek istediğinize emin misiniz?')) return;
        setLoading(true);
        try {
          await supabase.from('teklif_al').delete().eq('id', btn.dataset.id);
          showToast('Talep silindi', 'success');
          await loadTalepler(navigate);
        } catch (err) { showToast('Hata: ' + err.message, 'error'); }
        finally { setLoading(false); }
      });
    });

    container.querySelectorAll('.accept-teklif-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const teklifId = btn.dataset.teklifId;
        const talepId = btn.dataset.talepId;
        await handleAcceptOffer(teklifId, talepId, navigate);
      });
    });

    container.querySelectorAll('.undo-accept-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const teklifId = btn.dataset.teklifId;
        await handleUndoAcceptOffer(teklifId, navigate);
      });
    });
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Yüklenemedi</h3><p>' + err.message + '</p></div>';
  }
}

function renderTalepCard(talep) {
  const teklifler = talep.teklif_ver || [];
  let teklifHtml = '<p style="font-size:0.85rem;color:var(--text-muted);padding:12px 0;">Henüz teklif gelmedi</p>';
  if (teklifler.length > 0) {
    // Fiyata göre sırala (Ucuzdan pahalıya)
    teklifler.sort((a, b) => a.birim_fiyat - b.birim_fiyat);

    const rows = teklifler.map(t => {
      const isAccepted = t.kabul_edilenler && t.kabul_edilenler.length > 0;
      return `<tr>
      <td style="font-weight:600;">
        ${t.veren_firma?.firma_ismi || '—'}<br>
        <small class="text-muted">VKN: ${t.veren_firma?.vergi_no || '—'}</small>
      </td>
      <td>
        <span style="font-size:0.8rem;">📧 ${t.veren_firma?.mail || '—'}</span><br>
        <span style="font-size:0.8rem;">📞 ${t.veren_firma?.telefon || '—'}</span>
      </td>
      <td>${t.urun_ismi || '—'}</td><td>${t.marka || '—'}</td><td>${t.adet || '—'}</td>
      <td style="color:var(--accent-secondary);font-weight:600;">${formatMoney(t.birim_fiyat, t.para_birimi)}</td>
      <td style="color:var(--accent-primary);font-weight:600;">${formatMoney(t.toplam_fiyat, t.para_birimi)}</td>
      <td>${t.notlar || '—'}</td>
      <td>
        ${isAccepted 
          ? `
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span class="badge badge-completed">✅ Kabul Edildi</span>
              <button class="btn btn-secondary btn-sm undo-accept-btn" data-teklif-id="${t.id}" style="font-size:0.7rem; padding:4px 8px;">↩️ Vazgeç</button>
            </div>` 
          : `<button class="btn btn-primary btn-sm accept-teklif-btn" data-teklif-id="${t.id}" data-talep-id="${talep.id}">✔️ Kabul Et</button>`}
      </td>
      </tr>`;
    }).join('');
    teklifHtml = `<div style="margin-top:12px;"><p style="font-size:0.85rem;color:var(--accent-secondary);font-weight:600;margin-bottom:8px;">📬 ${teklifler.length} teklif geldi</p>
      <div class="table-wrapper"><table class="data-table"><thead><tr><th>Firma</th><th>İletişim</th><th>Ürün</th><th>Marka</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th><th>Not</th><th>İşlem</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  return `<div class="glass-card glass-card-wide" style="margin-bottom:16px;">
    <div class="flex-between" style="margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <div><h3 style="font-size:1.1rem;display:flex;align-items:center;gap:8px;">${talep.urun_ismi || 'Belirtilmemiş'}
        <span class="badge badge-${talep.durum === 'Açık' ? 'open' : 'closed'}">${talep.durum}</span></h3>
        <p class="text-muted" style="font-size:0.85rem;margin-top:4px;">Marka: ${talep.marka || '—'} · Adet: ${talep.adet || '—'} · Son Tarih: ${formatDate(talep.son_teklif_tarihi)}</p></div>
      <button class="btn btn-secondary btn-sm delete-talep-btn" data-id="${talep.id}">🗑️ Sil</button>
    </div>${teklifHtml}</div>`;
}

async function handleAcceptOffer(teklifId, talepId, navigate) {
  if (!confirm('Bu teklifi kabul etmek istediğinize emin misiniz?')) return;
  
  const firma = getCurrentFirma();
  setLoading(true);
  
  try {
    // 1. Karşı tarafın görmesi için kabul_edilenler tablosuna kaydet
    const { error: error1 } = await supabase.from('kabul_edilenler').insert([{
      teklif_ver_id: teklifId,
      kabul_eden_firma_id: firma.id,
      teklif_al_id: talepId
    }]);

    if (error1) throw error1;

    // 2. Kendi menümüzde görmemiz için onayladigim_teklifler tablosuna kaydet
    const { error: error2 } = await supabase.from('onayladigim_teklifler').insert([{
      teklif_ver_id: teklifId,
      onaylayan_firma_id: firma.id,
      teklif_al_id: talepId
    }]);

    if (error2) throw error2;

    showToast('Teklif kabul edildi ve onaylandı!', 'success');
    await loadTalepler(navigate);
  } catch (err) {
    console.error('Accept offer error:', err);
    showToast('Hata: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}

async function handleUndoAcceptOffer(teklifId, navigate) {
  if (!confirm('Onayı geri almak istediğinize emin misiniz?')) return;
  
  setLoading(true);
  try {
    // Her iki tablodan da kaydı sil
    const [res1, res2] = await Promise.all([
      supabase.from('kabul_edilenler').delete().eq('teklif_ver_id', teklifId),
      supabase.from('onayladigim_teklifler').delete().eq('teklif_ver_id', teklifId)
    ]);

    if (res1.error) throw res1.error;
    if (res2.error) throw res2.error;

    showToast('İşlem geri alındı', 'info');
    await loadTalepler(navigate);
  } catch (err) {
    console.error('Undo accept error:', err);
    showToast('Hata: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}
