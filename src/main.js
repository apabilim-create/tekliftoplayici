// Teklif Yönetim Sistemi - Main Router
import './style.css';
import { renderLoginPage, renderRegisterPage, handleLogin, handleRegister, getCurrentFirma } from './auth.js';
import { renderDashboard, attachDashboardEvents, showFirmaProfiliModal } from './dashboard.js';
import { renderTeklifAlPage, attachTeklifAlEvents } from './teklifAl.js';
import { renderTeklifVerPage, attachTeklifVerEvents } from './teklifVer.js';
import { shortId } from './utils.js';

const content = document.getElementById('main-content');
const sidebarContainer = document.getElementById('sidebar-container');
const app = document.getElementById('app');

function renderSidebar(activePage) {
  const firma = getCurrentFirma();
  if (!firma) return '';

  const initials = firma.firma_ismi.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return `
    <div class="sidebar">
      <div class="sidebar-logo">
        <span>🏢</span> TeklifSistemi
      </div>
      
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Hesabınız</div>
      <div class="sidebar-profile" id="sidebar-open-profile" style="cursor: pointer; margin-bottom: 30px; padding: 12px; background: rgba(0,0,0,0.03); border-radius: var(--radius-md);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="user-avatar" style="width: 36px; height: 36px; font-size: 0.9rem;">${initials}</div>
          <div style="overflow: hidden;">
            <div class="user-name" style="font-size: 0.9rem; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${firma.firma_ismi}</div>
            <div class="user-id" style="font-size: 0.7rem;">ID: ${shortId(firma.id)}</div>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" id="nav-dashboard">
          <span>📊</span> Anasayfa
        </div>
        <div class="nav-item ${activePage === 'teklif-al' ? 'active' : ''}" id="nav-teklif-al">
          <span>📥</span> Teklif Al
        </div>
        <div class="nav-item ${activePage === 'teklif-ver' ? 'active' : ''}" id="nav-teklif-ver">
          <span>📤</span> Teklif Ver
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="nav-item" id="nav-logout">
          <span>🚪</span> Çıkış Yap
        </div>
      </div>
    </div>
  `;
}

function attachSidebarEvents(navigate) {
  document.getElementById('nav-dashboard')?.addEventListener('click', () => navigate('dashboard'));
  document.getElementById('nav-teklif-al')?.addEventListener('click', () => navigate('teklif-al'));
  document.getElementById('nav-teklif-ver')?.addEventListener('click', () => navigate('teklif-ver'));
  document.getElementById('sidebar-open-profile')?.addEventListener('click', showFirmaProfiliModal);
  document.getElementById('nav-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('firma');
    navigate('login');
  });
}

async function navigate(page) {
  const firma = getCurrentFirma();
  
  if (page === 'login' || page === 'register') {
    app.className = 'auth-page';
    sidebarContainer.innerHTML = '';
  } else {
    if (!firma) { navigate('login'); return; }
    app.className = 'with-sidebar';
    sidebarContainer.innerHTML = renderSidebar(page);
    attachSidebarEvents(navigate);
  }

  const mainContent = document.getElementById('main-content');
  window.scrollTo(0, 0); // Sayfa değişince en üste kaydır

  switch (page) {
    case 'register':
      mainContent.innerHTML = renderRegisterPage();
      document.getElementById('register-form')?.addEventListener('submit', (e) => handleRegister(e, navigate));
      document.getElementById('go-login')?.addEventListener('click', () => navigate('login'));
      break;
    case 'login':
      mainContent.innerHTML = renderLoginPage();
      document.getElementById('login-form')?.addEventListener('submit', (e) => handleLogin(e, navigate));
      document.getElementById('go-register')?.addEventListener('click', () => navigate('register'));
      break;
    case 'dashboard':
      mainContent.innerHTML = await renderDashboard(navigate);
      attachDashboardEvents(navigate);
      break;
    case 'teklif-al':
      mainContent.innerHTML = renderTeklifAlPage();
      attachTeklifAlEvents(navigate);
      break;
    case 'teklif-ver':
      mainContent.innerHTML = renderTeklifVerPage();
      attachTeklifVerEvents(navigate);
      break;
    default:
      navigate('login');
  }

  // Global event listener for any 'back-to-home' button added to the page
  document.getElementById('back-to-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('dashboard');
  });
}

// Uygulama başlat
const firma = getCurrentFirma();
navigate(firma ? 'dashboard' : 'login');
