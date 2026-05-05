// Teklif Yönetim Sistemi - Main Router
import './style.css';
import { renderLoginPage, renderRegisterPage, handleLogin, handleRegister, getCurrentFirma } from './auth.js';
import { renderDashboard, attachDashboardEvents, showFirmaProfiliModal } from './dashboard.js';
import { renderTeklifAlPage, attachTeklifAlEvents } from './teklifAl.js';
import { renderTeklifVerPage, attachTeklifVerEvents } from './teklifVer.js';
import { renderAcceptedOffersPage, attachAcceptedOffersEvents } from './acceptedOffers.js';
import { renderMyApprovedOffersPage, attachMyApprovedOffersEvents } from './myApprovedOffers.js';
import { shortId } from './utils.js';

const content = document.getElementById('main-content');
const sidebarContainer = document.getElementById('sidebar-container');
const app = document.getElementById('app');

function renderSidebar(activePage) {
  const firma = getCurrentFirma();
  if (!firma) return '';

  const initials = firma.firma_ismi.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  // Kategori Başlık Stilleri (Inline)
  const baseTitleStyle = "font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; padding: 6px 12px; margin-bottom: 12px; border-radius: 4px; display: inline-flex; align-items: center; border-left: 3px solid;";
  const accountTitleStyle = baseTitleStyle + " color: #475569; background: rgba(71, 85, 105, 0.1); border-color: #475569;";
  const operationsTitleStyle = baseTitleStyle + " color: #2563eb; background: rgba(37, 99, 235, 0.1); border-color: #2563eb;";
  const archiveTitleStyle = baseTitleStyle + " color: #059669; background: rgba(5, 150, 105, 0.1); border-color: #059669;";
  const sectionDivider = "margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.08);";

  return `
    <div class="sidebar">
      <div class="sidebar-logo">
        <span>🏢</span> TeklifSistemi
      </div>

      <nav class="sidebar-nav" style="margin-bottom: 10px;">
        <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" id="nav-dashboard">
          <span class="icon">📊</span> Anasayfa
        </div>
      </nav>
      
      <div class="sidebar-section" style="margin-top: 10px;">
        <div style="${accountTitleStyle}">HESABINIZ</div>
        <div class="sidebar-profile" id="sidebar-open-profile" style="cursor: pointer; padding: 12px; background: rgba(0,0,0,0.03); border-radius: var(--radius-md); margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="user-avatar" style="width: 36px; height: 36px; font-size: 0.9rem; flex-shrink: 0;">${initials}</div>
            <div style="overflow: hidden;">
              <div class="user-name" style="font-size: 0.85rem; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${firma.firma_ismi}</div>
              <div class="user-id" style="font-size: 0.7rem; color: var(--text-muted);">ID: ${shortId(firma.id)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="sidebar-section" style="${sectionDivider}">
        <div style="${operationsTitleStyle}">TEKLİF İŞLEMLERİ</div>
        <nav class="sidebar-nav">
          <div class="nav-item ${activePage === 'teklif-al' ? 'active' : ''}" id="nav-teklif-al">
            <span class="icon">📥</span> Teklif Al
          </div>
          <div class="nav-item ${activePage === 'teklif-ver' ? 'active' : ''}" id="nav-teklif-ver">
            <span class="icon">📤</span> Teklif Ver
          </div>
        </nav>
      </div>

      <div class="sidebar-section" style="${sectionDivider}">
        <div style="${archiveTitleStyle}">TAKİP & ARŞİV</div>
        <nav class="sidebar-nav">
          <div class="nav-item ${activePage === 'accepted-offers' ? 'active' : ''}" id="nav-accepted-offers">
            <span class="icon">✅</span> Kabul Edilen Tekliflerim
          </div>
          <div class="nav-item ${activePage === 'my-approved-offers' ? 'active' : ''}" id="nav-my-approved-offers">
            <span class="icon">📋</span> Onayladığım Teklifler
          </div>
        </nav>
      </div>

      <div class="sidebar-footer">
        <div class="nav-item" id="nav-logout">
          <span class="icon">🚪</span> Çıkış Yap
        </div>
      </div>
    </div>
  `;
}

function attachSidebarEvents(navigate) {
  document.getElementById('nav-dashboard')?.addEventListener('click', () => { navigate('dashboard'); toggleSidebar(true); });
  document.getElementById('nav-teklif-al')?.addEventListener('click', () => { navigate('teklif-al'); toggleSidebar(true); });
  document.getElementById('nav-teklif-ver')?.addEventListener('click', () => { navigate('teklif-ver'); toggleSidebar(true); });
  document.getElementById('nav-accepted-offers')?.addEventListener('click', () => { navigate('accepted-offers'); toggleSidebar(true); });
  document.getElementById('nav-my-approved-offers')?.addEventListener('click', () => { navigate('my-approved-offers'); toggleSidebar(true); });
  document.getElementById('sidebar-open-profile')?.addEventListener('click', () => { showFirmaProfiliModal(); toggleSidebar(true); });
  document.getElementById('nav-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('firma');
    navigate('login');
    toggleSidebar(true);
  });
}

function toggleSidebar(forceClose = false) {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;

  if (forceClose) {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  } else {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
  }
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
    case 'accepted-offers':
      mainContent.innerHTML = renderAcceptedOffersPage();
      attachAcceptedOffersEvents(navigate);
      break;
    case 'my-approved-offers':
      mainContent.innerHTML = renderMyApprovedOffersPage();
      attachMyApprovedOffersEvents(navigate);
      break;
    default:
      navigate('login');
  }

  // Global event listener for any 'back-to-home' button added to the page
  document.getElementById('back-to-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('dashboard');
  });

  // Mobile menu toggle
  document.getElementById('menu-toggle')?.addEventListener('click', () => toggleSidebar());
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => toggleSidebar(true));
}

// Uygulama başlat
const firma = getCurrentFirma();
navigate(firma ? 'dashboard' : 'login');
