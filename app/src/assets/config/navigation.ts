/**
 * Shape of a sidebar navigation item. Items are fetched from the backend
 * (GET /api/users/fetch/sidebar/menu) and rendered by AppNavigation.vue;
 * `parentId` builds the parent/child menu tree (0 = top level).
 */
export interface NavItem {
  id: number
  titleKey: string // i18n key looked up in the active lang map (src/lang/)
  parentId: number // id of the parent item; 0 for top-level entries
  icon: string // MDI icon name, e.g. 'mdi-account'
  route: string // router path to navigate to when clicked
  color: string // icon/label accent color
}
