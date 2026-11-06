export const THEME_STORAGE_KEY = "societyhub-theme";
export const THEME_BOOT_SCRIPT = `
function initializeSocietyHubTheme() {
  function readPreference() {
    try { return localStorage.getItem('${THEME_STORAGE_KEY}'); }
    catch (error) { console.warn('SocietyHub appearance storage is unavailable; using the default theme.'); return null; }
  }
  function applyPreference(value) {
    document.documentElement.dataset.theme = value === 'dark' || value === 'light' ? value : 'dark';
  }
  applyPreference(readPreference());
  window.addEventListener('storage', function (event) {
    if (event.key === '${THEME_STORAGE_KEY}') applyPreference(event.newValue);
  });
}
initializeSocietyHubTheme();
`;
