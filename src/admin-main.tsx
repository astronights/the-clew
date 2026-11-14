import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Admin } from './screens/Admin';
import './styles.css';

/** The puzzle desk: a separate, installable app at /admin. */
function AdminApp() {
  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">
          the clew<span className="logo-dot" aria-hidden="true" />
          <span className="logo-desk">desk</span>
        </h1>
      </header>
      <main className="screen">
        <Admin />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);

// the service worker shows reminder notifications; only registered for the desk
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => {
      /* push reminders unavailable; the desk still works */
    });
  });
}
