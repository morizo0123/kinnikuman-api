import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function cycleTheme() {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      title={`Current: ${theme}. Click to cycle.`}
      className="text-sm"
    >
      {theme === 'light' && '☀️'}
      {theme === 'dark' && '🌙'}
      {theme === 'system' && '💻'}
    </Button>
  );
}
