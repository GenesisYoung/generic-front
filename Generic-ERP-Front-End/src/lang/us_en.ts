const mapping: Record<string, string> = {
  currency: '$',
  title: 'Generic ERP System',
  login: 'Login',
  home: 'Home',
  navigation: 'Navigation',
  mainPage: 'Main Page',
  userManagement: 'User Management',
  roleManagement: 'Role Management',
  permissionManagement: 'Permission Management',
  productManagement: 'Product Management',
  orderManagement: 'Order Management',
  inventoryManagement: 'Inventory Management',
  customerManagement: 'Customer Management',
  supplierManagement: 'Supplier Management',
  reportManagement: 'Report Management',
  settings: 'Settings',
  pageNotFoundTitle: 'Page Not Found',
  pageNotFoundMessage: 'The page you are looking for does not exist or has been moved.',
  goBackHome: 'Go Back Home',
}
type Lan = typeof mapping
export { mapping as lan }
import type { InjectionKey } from 'vue'
export const LanKey: InjectionKey<Lan> = Symbol('Lan')
