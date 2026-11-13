import { useEffect, useState } from 'react';
import { HowToPlay } from './components/HowToPlay';
import { load, save } from './lib/storage';
import { puzzleNumber } from './lib/daily';
import { StatsScreen } from './screens/Stats';
import { Today } from './screens/Today';
import { Admin } from './screens/Admin';

const IS_ADMIN = typeof location !== 'undefined' && location.pathname.replace(/\/+$/, '') === '/admin';

type Theme = 'system' | 'light' | 'dark';
function ThemeIcon({ theme }: { theme: Theme }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, 'aria-hidden': true };
  if (theme === 'light')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
    );
  if (theme === 'dark')
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" />
    </svg>
  );
}
const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };

export function App() {
  const [stats, setStats] = useState(false);
  const [help, setHelp] = useState(() => !IS_ADMIN && !load<boolean>('clew:seenHelp', false));
  const [theme, setTheme] = useState<Theme>(() => load<Theme>('clew:theme', 'system'));
  const [today, setToday] = useState(() => puzzleNumber());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    save('clew:theme', theme);
  }, [theme]);

  // roll over to the new puzzle at 00:00 UTC if the tab stays open
  useEffect(() => {
    const id = setInterval(() => setToday(puzzleNumber()), 30_000);
    return () => clearInterval(id);
  }, []);

  const closeHelp = () => {
    setHelp(false);
    save('clew:seenHelp', true);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">
          the clew<span className="logo-dot" aria-hidden="true" />
        </h1>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => setStats(true)} aria-label="Your stats">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M5 20V12M12 20V5M19 20v-9" />
            </svg>
          </button>
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="How to play">
            ?
          </button>
          <button
            className="icon-btn"
            onClick={() => setTheme(NEXT_THEME[theme])}
            aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}`}
            title={`Theme: ${theme}`}
          >
            <ThemeIcon theme={theme} />
          </button>
        </div>
      </header>

      <main className="screen">{IS_ADMIN ? <Admin /> : <Today key={today} puzzleNo={today} />}</main>

      {stats && <StatsScreen today={today} onClose={() => setStats(false)} />}
      {help && <HowToPlay onClose={closeHelp} />}
    </div>
  );
}
