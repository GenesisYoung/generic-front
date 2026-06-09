type color = string
type opacity = number
export default interface Theme {
  dark: boolean
  colors: {
    background: color
    surface: color
    'surface-bright': color
    'surface-light': color
    'surface-variant': color
    'on-surface-variant': color
    primary: color
    'primary-darken-1': color
    secondary: color
    'secondary-darken-1': color
    error: color
    info: color
    success: color
    warning: color
  }
  variables: {
    'border-color': color
    'border-opacity': opacity
    'high-emphasis-opacity': opacity
    'medium-emphasis-opacity': opacity
    'disabled-opacity': opacity
    'idle-opacity': opacity
    'hover-opacity': opacity
    'focus-opacity': opacity
    'selected-opacity': opacity
    'activated-opacity': opacity
    'pressed-opacity': opacity
    'dragged-opacity': opacity
    'theme-kbd': color
    'theme-on-kbd': color
    'theme-code': color
    'theme-on-code': color
  }
}
