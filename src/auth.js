// ============================================
// Teklif Yönetim Sistemi - Auth Module
// ============================================
import { supabase } from './supabase.js';
import { showToast, setLoading } from './utils.js';

/**
 * Kayıt formu HTML'i
 */
export function renderRegisterPage() {
  return `
    <div class="glass-card" id="auth-card">
      <div class="app-logo">
        <div class="logo-icon">📋</div>
        <h1>Teklif Yönetim</h1>
        <p>Firmalar arası teklif platformu</p>
      </div>

      <form id="register-form">
        <div class="form-group">
          <label>Firma İsmi <span class="required">*</span></label>
          <input type="text" class="form-input" id="reg-firma" placeholder="Firma adını girin" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>E-posta <span class="required">*</span></label>
            <input type="email" class="form-input" id="reg-mail" placeholder="ornek@firma.com" required>
          </div>
          <div class="form-group">
            <label>Telefon</label>
            <input type="tel" class="form-input" id="reg-telefon" placeholder="05XX XXX XXXX">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Vergi Kimlik No</label>
            <input type="text" class="form-input" id="reg-vergi" placeholder="Vergi kimlik no">
          </div>
          <div class="form-group">
            <label>Şifre <span class="required">*</span></label>
            <input type="password" class="form-input" id="reg-sifre" placeholder="En az 6 karakter" required minlength="6">
          </div>
        </div>

        <button type="submit" class="btn btn-primary" id="register-btn">
          🚀 Hesap Oluştur
        </button>
      </form>

      <div class="auth-toggle">
        Zaten hesabınız var mı? <a id="go-login">Giriş Yap</a>
      </div>
    </div>
  `;
}

/**
 * Giriş formu HTML'i
 */
export function renderLoginPage() {
  return `
    <div class="glass-card" id="auth-card">
      <div class="app-logo">
        <div class="logo-icon">🔐</div>
        <h1>Giriş Yap</h1>
        <p>Hesabınıza erişin</p>
      </div>

      <form id="login-form">
        <div class="form-group">
          <label>Firma İsmi <span class="required">*</span></label>
          <input type="text" class="form-input" id="login-firma" placeholder="Kayıtlı firma adınızı girin" required>
        </div>

        <div class="form-group">
          <label>Şifre <span class="required">*</span></label>
          <input type="password" class="form-input" id="login-sifre" placeholder="Şifrenizi girin" required>
        </div>

        <button type="submit" class="btn btn-primary" id="login-btn">
          🔓 Giriş Yap
        </button>
      </form>

      <div class="auth-toggle">
        Hesabınız yok mu? <a id="go-register">Hesap Oluştur</a>
      </div>
    </div>
  `;
}

/**
 * Kayıt işlemi
 */
export async function handleRegister(e, navigate) {
  e.preventDefault();

  const firma = document.getElementById('reg-firma').value.trim();
  const mail = document.getElementById('reg-mail').value.trim();
  const telefon = document.getElementById('reg-telefon').value.trim();
  const vergi = document.getElementById('reg-vergi').value.trim();
  const sifre = document.getElementById('reg-sifre').value;

  if (!firma || !mail || !sifre) {
    showToast('Lütfen zorunlu alanları doldurun', 'error');
    return;
  }

  if (sifre.length < 6) {
    showToast('Şifre en az 6 karakter olmalı', 'error');
    return;
  }

  setLoading(true);

  try {
    // Firma ismi ve E-posta kontrolü
    const { data: existing } = await supabase
      .from('firma_bilgileri')
      .select('firma_ismi, mail')
      .or(`mail.eq.${mail},firma_ismi.eq.${firma}`)
      .limit(1);

    if (existing && existing.length > 0) {
      if (existing[0].mail === mail) showToast('Bu e-posta adresi zaten kayıtlı', 'error');
      else showToast('Bu firma ismi zaten alınmış', 'error');
      setLoading(false);
      return;
    }

    // Firma kaydı
    const { data, error } = await supabase
      .from('firma_bilgileri')
      .insert([{
        firma_ismi: firma,
        mail: mail,
        telefon: telefon || null,
        vergi_no: vergi || null,
        sifre: sifre
      }])
      .select()
      .single();

    if (error) throw error;

    // Oturumu kaydet
    sessionStorage.setItem('firma', JSON.stringify(data));

    showToast(`Hoş geldiniz, ${firma}! ID: ${data.id.substring(0, 8)}...`, 'success');

    setTimeout(() => navigate('dashboard'), 500);
  } catch (err) {
    console.error('Kayıt hatası:', err);
    showToast('Kayıt sırasında hata oluştu: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Giriş işlemi
 */
export async function handleLogin(e, navigate) {
  e.preventDefault();

  const firmaName = document.getElementById('login-firma').value.trim();
  const sifre = document.getElementById('login-sifre').value;

  if (!firmaName || !sifre) {
    showToast('Lütfen tüm alanları doldurun', 'error');
    return;
  }

  setLoading(true);

  try {
    const { data, error } = await supabase
      .from('firma_bilgileri')
      .select('*')
      .eq('firma_ismi', firmaName)
      .eq('sifre', sifre)
      .single();

    if (error || !data) {
      console.warn('Login failure:', error);
      showToast('Firma ismi veya şifre hatalı', 'error');
      setLoading(false);
      return;
    }

    sessionStorage.setItem('firma', JSON.stringify(data));

    showToast(`Hoş geldiniz, ${data.firma_ismi}!`, 'success');

    setTimeout(() => navigate('dashboard'), 500);
  } catch (err) {
    console.error('Giriş hatası detayı:', err);
    showToast('Giriş sırasında hata oluştu. Lütfen bağlantınızı kontrol edin.', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Oturum kontrolü
 */
export function getCurrentFirma() {
  const data = sessionStorage.getItem('firma');
  return data ? JSON.parse(data) : null;
}

/**
 * Çıkış
 */
export function logout() {
  sessionStorage.removeItem('firma');
}
