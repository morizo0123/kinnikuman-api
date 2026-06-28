import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // 初期値: localStorage から読み込み、なければ system
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
  });

  useEffect(() => {
    const root = document.documentElement; // <html>

    function applyTheme() {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      root.classList.toggle('dark', isDark);
    }

    applyTheme();
    localStorage.setItem(STORAGE_KEY, theme);

    // theme が 'system' の場合は OS の設定変更を監視
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  return {
    theme,
    setTheme
  };
}
