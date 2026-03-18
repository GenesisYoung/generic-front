export interface NavItem {
  titleKey: string // key to look up in your lang object
  icon: string
  route: string
  color: string
}

export const navigationItems: NavItem[] = [
  {
    titleKey: 'mainPage',
    icon: 'mdi-home-circle',
    route: '/dashboard',
    color: 'indigo',
  },
  {
    titleKey: 'userManagement',
    icon: 'mdi-account-cog',
    route: '/user-management',
    color: 'indigo',
  },
  {
    titleKey: 'roleManagement',
    icon: 'mdi-account-key',
    route: '/role-management',
    color: 'indigo',
  },
  {
    titleKey: 'permissionManagement',
    icon: 'mdi-account-lock',
    route: '/role-management',
    color: 'indigo',
  },
  {
    titleKey: 'productManagement',
    icon: 'mdi-package-variant-closed',
    route: '/product-management',
    color: 'indigo',
  },
  {
    titleKey: 'inventoryManagement',
    icon: 'mdi-warehouse',
    route: '/inventory-management',
    color: 'indigo',
  },
  {
    titleKey: 'customerManagement',
    icon: 'mdi-account-group-outline',
    route: '/customer-management',
    color: 'indigo',
  },
  {
    titleKey: 'supplierManagement',
    icon: 'mdi-factory',
    route: '/supplier-management',
    color: 'indigo',
  },
  {
    titleKey: 'reportManagement',
    icon: 'mdi-chart-box',
    route: '/report-management',
    color: 'indigo',
  },
  {
    titleKey: 'settings',
    icon: 'mdi-cog',
    route: '/settings',
    color: 'indigo',
  },
]
