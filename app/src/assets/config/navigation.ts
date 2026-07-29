export interface NavItem {
  id: number
  titleKey: string // key to look up in your lang object
  parentId: number
  icon: string
  route: string
  color: string
}
