const root = document.documentElement;
const toggle = document.getElementById('languageToggle');
const copyButton = document.getElementById('copyHash');
const hash = document.getElementById('apkHash');

function applyLanguage(lang) {
  const isArabic = lang === 'ar';
  root.lang = lang;
  root.dir = isArabic ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-fr][data-ar]').forEach((el) => {
    el.textContent = isArabic ? el.dataset.ar : el.dataset.fr;
  });
  toggle.textContent = isArabic ? 'Français' : 'العربية';
  toggle.setAttribute('aria-label', isArabic ? 'Passer au français' : 'التبديل إلى العربية');
  localStorage.setItem('epsiq-site-language', lang);
}

const savedLanguage = localStorage.getItem('epsiq-site-language');
applyLanguage(savedLanguage === 'ar' ? 'ar' : 'fr');

toggle?.addEventListener('click', () => {
  applyLanguage(root.lang === 'ar' ? 'fr' : 'ar');
});

copyButton?.addEventListener('click', async () => {
  if (!hash) return;
  try {
    await navigator.clipboard.writeText(hash.textContent.trim());
    const active = root.lang === 'ar' ? 'تم النسخ' : 'SHA-256 copié';
    const original = root.lang === 'ar' ? copyButton.dataset.ar : copyButton.dataset.fr;
    copyButton.textContent = active;
    window.setTimeout(() => { copyButton.textContent = original; }, 1600);
  } catch {
    hash.focus?.();
  }
});

// Preserve campaign attribution in the browser without collecting personal data.
const params = new URLSearchParams(window.location.search);
const source = params.get('source') || params.get('utm_source');
if (source) {
  sessionStorage.setItem('epsiq-download-source', source.slice(0, 80));
}

// Cloudflare Web Analytics (privacy-first aggregate analytics).
const analyticsBeacon = document.createElement('script');
analyticsBeacon.type = 'module';
analyticsBeacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
analyticsBeacon.dataset.cfBeacon = '{"token":"16625f5d018844f89cc67030988c2cba"}';
document.head.appendChild(analyticsBeacon);
