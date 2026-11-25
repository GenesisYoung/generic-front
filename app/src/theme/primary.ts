/**
 * The app's primary color themes (violet palette). Registered in main.ts;
 * dark is the default. Muted plum surfaces and a brighter violet accent
 * keep dense workspaces readable (primary: #A78BFA dark / #6D28D9 light).
 */
import type Theme from './theme'

const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#F7F8FC',
    surface: '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-light': '#FAFAFD',
    'surface-variant': '#EDEAF5',
    'on-surface-variant': '#625B71',
    primary: '#6D28D9',
    'on-primary': '#FFFFFF',
    'primary-darken-1': '#4C1D95',
    secondary: '#A855F7',
    'secondary-darken-1': '#7E22CE',
    error: '#DC2626',
    info: '#2563EB',
    success: '#16A34A',
    warning: '#D97706',
  },
  variables: {
    'border-color': '#625B71',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.08,
    'focus-opacity': 0.12,
    'selected-opacity': 0.12,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.16,
    'dragged-opacity': 0.08,
    'theme-kbd': '#1A1033',
    'theme-on-kbd': '#EDE9FE',
    'theme-code': '#EDE9FE',
    'theme-on-code': '#4C1D95',
  },
}

const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#11101B',
    surface: '#1C192B',
    'surface-bright': '#302941',
    'surface-light': '#252035',
    'surface-variant': '#302941',
    'on-surface-variant': '#C2BBD5',
    primary: '#A78BFA',
    'on-primary': '#21133F',
    'primary-darken-1': '#5B21B6',
    secondary: '#C084FC',
    'secondary-darken-1': '#A855F7',
    error: '#EF4444',
    info: '#3B82F6',
    success: '#22C55E',
    warning: '#F59E0B',
  },
  variables: {
    'border-color': '#C4B5FD',
    'border-opacity': 0.13,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.06,
    'hover-opacity': 0.1,
    'focus-opacity': 0.14,
    'selected-opacity': 0.14,
    'activated-opacity': 0.14,
    'pressed-opacity': 0.18,
    'dragged-opacity': 0.1,
    'theme-kbd': '#EDE9FE',
    'theme-on-kbd': '#1A1033',
    'theme-code': '#2D1B69',
    'theme-on-code': '#DDD6FE',
  },
}

export { lightTheme, darkTheme }
