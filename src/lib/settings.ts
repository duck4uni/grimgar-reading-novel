// User settings stored in localStorage

const SETTINGS_KEY = 'grimgar_settings';

export interface ReaderSettings {
  tapDirection: 'normal' | 'reversed'; // normal: left=prev, right=next; reversed: left=next, right=prev
}

const defaultSettings: ReaderSettings = {
  tapDirection: 'normal',
};

export function getSettings(): ReaderSettings {
  if (typeof window === 'undefined') return defaultSettings;
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
}

export function setSettings(settings: Partial<ReaderSettings>): void {
  if (typeof window === 'undefined') return;
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
}

export function getTapDirection(): 'normal' | 'reversed' {
  return getSettings().tapDirection;
}

export function toggleTapDirection(): 'normal' | 'reversed' {
  const current = getTapDirection();
  const next = current === 'normal' ? 'reversed' : 'normal';
  setSettings({ tapDirection: next });
  return next;
}
