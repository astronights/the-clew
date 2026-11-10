import { useEffect, useState } from 'react';
import { HowToPlay } from './components/HowToPlay';
import { load, save } from './lib/storage';
import { puzzleNumber } from './lib/daily';
import { Practice } from './screens/Practice';
import { StatsScreen } from './screens/Stats';
import { Today } from './screens/Today';

type Tab = 'today' | 'practice' | 'stats';
type Theme = 'system' | 'light' | 'dark';
const THEME_ICON: Record<Theme, string> = { system: '🌗', light: '☀️', dark: '🌙' };
const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };

export function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [help, setHelp] = useState(() => !load<boolean>('clew:seenHelp', false));
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
          <span aria-hidden="true" className="logo-ball">🧶</span> The Clew
        </h1>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="How to play">
            ?
          </button>
          <button
            className="icon-btn"
            onClick={() => setTheme(NEXT_THEME[theme])}
            aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}`}
            title={`Theme: ${theme}`}
          >
            <span aria-hidden="true">{THEME_ICON[theme]}</span>
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Screens">
        {(['today', 'practice', 'stats'] as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'is-active' : ''}`} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
            {t === 'today' ? `Today #${today}` : t === 'practice' ? 'Practice' : 'Stats'}
          </button>
        ))}
      </nav>

      <main className="screen">
        {tab === 'today' && <Today key={today} puzzleNo={today} />}
        {tab === 'practice' && <Practice today={today} />}
        {tab === 'stats' && <StatsScreen today={today} />}
      </main>

      {help && <HowToPlay onClose={closeHelp} />}
    </div>
  );
}
