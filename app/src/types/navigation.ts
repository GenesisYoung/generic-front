/** Minimal sidebar navigation item (flat variant without id/parentId). */
export interface NavItem {
  titleKey: string // i18n key looked up in the active lang map (src/lang/)
  icon: string // MDI icon name, e.g. 'mdi-account'
  route: string // router path to navigate to when clicked
  color: string // icon/label accent color
}
