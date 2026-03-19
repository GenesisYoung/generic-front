const mapping: Record<string, string> = {
  title: '通用企业资源系统',
  login: '登录',
  home: '主页',
  navigation: '导航',
  mainPage: '主页',
  userManagement: '用户管理',
  roleManagement: '角色管理',
  permissionManagement: '权限管理',
  productManagement: '产品管理',
  orderManagement: '订单管理',
  inventoryManagement: '库存管理',
  customerManagement: '客户管理',
  supplierManagement: '供应商管理',
  reportManagement: '报表管理',
  settings: '设置',
  pageNotFoundTitle: '抱歉，页面未找到',
  pageNotFoundMessage: '您访问的页面不存在或已被删除。',
  goBackHome: '返回主页',
  loginTitle: '欢迎登录通用企业资源系统',
  loginUsername: '用户名',
  loginPassword: '密码',
  loginButton: '登录',
}
type Lan = typeof mapping
export { mapping as lan }
import type { InjectionKey } from 'vue'
export const LanKey: InjectionKey<Lan> = Symbol('Lan')
