/**
 * The one place that decides the UI language. Every module imports `lan`
 * from here (never from china_zh / us_en directly), and every request sends
 * `currentLocale` to the backend in Accept-Language, so backend messages come
 * back in the same language as the page.
 *
 * The choice is stored in localStorage; changing it reloads the page so every
 * label, cached store and the WebSocket connection pick up the new language.
 */
import { lan as zh } from './china_zh'
import { lan as en } from './us_en'

export type AppLocale = 'zh-CN' | 'en-US'
export const SUPPORTED_LOCALES: readonly AppLocale[] = ['zh-CN', 'en-US']
export const DEFAULT_LOCALE: AppLocale = 'zh-CN'
const STORAGE_KEY = 'erp.locale'

function readLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) return saved as AppLocale
  } catch {
    // Storage blocked (private mode): fall back to the default.
  }
  return DEFAULT_LOCALE
}

export const currentLocale: AppLocale = readLocale()

/** Labels of the current language. Keys missing in English fall back to Chinese. */
export const lan: Record<string, string> = currentLocale === 'en-US' ? { ...zh, ...en } : zh

/** Switches the UI language and reloads so everything uses it. */
export function setLocale(locale: AppLocale): void {
  if (locale === currentLocale) return
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    return
  }
  window.location.reload()
}

/** Fills {0}, {1}, … in a label: fmt(lan.followUpSaved, 'PO-1'). */
export function fmt(template: string | undefined, ...args: Array<string | number>): string {
  return (template ?? '').replace(/\{(\d+)\}/g, (m, i: string) => {
    const v = args[Number(i)]
    return v === undefined ? m : String(v)
  })
}

if (typeof document !== 'undefined') document.documentElement.lang = currentLocale
