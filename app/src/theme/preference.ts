export type AppTheme = 'light' | 'dark'
const STORAGE_KEY = 'erp.theme'

/** Keep the existing dark default until the user chooses a theme. */
export function readTheme(): AppTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function saveTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // The current session can still switch when browser storage is blocked.
  }
}
