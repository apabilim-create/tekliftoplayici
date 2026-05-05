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

  return `
    <div class="sidebar premium-sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon-wrapper">🏢</div>
        <div class="logo-text">Teklif<span>Sistemi</span></div>
      </div>

      <div class="sidebar-main-nav">
        <nav class="sidebar-nav">
          <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" id="nav-dashboard">
            <span class="icon">📊</span> <span class="nav-text">Anasayfa</span>
          </div>
        </nav>
      </div>
      
      <div class="sidebar-section section-account">
        <div class="sidebar-category-label">HESABINIZ</div>
        <div class="sidebar-profile-card" id="sidebar-open-profile">
          <div class="profile-avatar">${initials}</div>
          <div class="profile-info">
            <div class="profile-name">${firma.firma_ismi}</div>
            <div class="profile-id">ID: ${shortId(firma.id)}</div>
          </div>
          <div class="profile-chevron">›</div>
        </div>
      </div>

      <div class="sidebar-section section-operations">
        <div class="sidebar-category-label">İŞLEMLER</div>
        <nav class="sidebar-nav">
          <div class="nav-item ${activePage === 'teklif-al' ? 'active' : ''}" id="nav-teklif-al">
            <span class="icon">📥</span> <span class="nav-text">Teklif Al</span>
          </div>
          <div class="nav-item ${activePage === 'teklif-ver' ? 'active' : ''}" id="nav-teklif-ver">
            <span class="icon">📤</span> <span class="nav-text">Teklif Ver</span>
          </div>
        </nav>
      </div>

      <div class="sidebar-section section-archive">
        <div class="sidebar-category-label">TAKİP & ARŞİV</div>
        <nav class="sidebar-nav">
          <div class="nav-item ${activePage === 'accepted-offers' ? 'active' : ''}" id="nav-accepted-offers">
            <span class="icon">✅</span> <span class="nav-text">Kabul Edilenler</span>
          </div>
          <div class="nav-item ${activePage === 'my-approved-offers' ? 'active' : ''}" id="nav-my-approved-offers">
            <span class="icon">📋</span> <span class="nav-text">Onayladıklarım</span>
          </div>
        </nav>
      </div>

      <div class="sidebar-footer">
        <div class="nav-item logout-item" id="nav-logout">
          <span class="icon">🚪</span> <span class="nav-text">Çıkış Yap</span>
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
  const sidebar = document.querySelector('.premium-sidebar');
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
  window.scrollTo(0, 0); 

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

  document.getElementById('back-to-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('dashboard');
  });

  document.getElementById('menu-toggle')?.addEventListener('click', () => toggleSidebar());
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => toggleSidebar(true));
}

const firma = getCurrentFirma();
navigate(firma ? 'dashboard' : 'login');
