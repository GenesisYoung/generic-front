import { fmt, lan } from '@/lang'

/** Mirrors the backend's PmcDashboard and PurchasingDashboard. */
export interface PlacementRow {
  id: number
  orderNo: string
  deadlineAt: string
  assigneeName: string | null
}

export interface ExceptionRow {
  id: number
  exceptionNo: string
  poNo: string
  supplierName: string | null
  category: string
  severity: string
  status: string
  reportedAt: string
}

export interface PmcDashboard {
  generatedAt: string
  customerOrders: {
    pendingAudit: number
    newToday: number
    lastSyncAt: string | null
    lastSyncStatus: string | null
  }
  audits: { byStatus: Record<string, number>; overdue: number; passedLast7Days: number }
  placement: {
    open: number
    overdue: number
    dueSoon: number
    unassigned: number
    doneLast30Days: number
    onTimeRate: number | null
  }
  exceptions: {
    open: number
    openBySeverity: Record<string, number>
    openByStatus: Record<string, number>
    reportedLast7Days: number
  }
  overduePlacements: PlacementRow[]
  urgentExceptions: ExceptionRow[]
}

export interface PurchaserRow {
  purchaserId: number
  name: string | null
  activeOrders: number
  followUpsDueToday: number
  missedLast7Days: number
  openPlacements: number
  overduePlacements: number
  openExceptions: number
}

export interface FollowUpRow {
  purchaseOrderId: number
  poNo: string
  supplierName: string | null
  stage: string
  seq: number
  windowEnd: string
  daysLeft: number
}

export interface PurchasingDashboard {
  generatedAt: string
  allPurchasers: boolean
  placement: { open: number; overdue: number; dueSoon: number; unassigned: number }
  followUps: { activeOrders: number; dueToday: number; missedLast7Days: number }
  exceptions: { open: number; urgentOpen: number }
  byPurchaser: PurchaserRow[]
  dueFollowUps: FollowUpRow[]
  openPlacements: PlacementRow[]
}

/** One number tile: a label, the value, a colour when it needs attention, and the page it opens. */
export interface Tile {
  key: string
  label: string
  value: string
  color: string
  to: string
}

function tile(
  key: string,
  value: number | string,
  alert: boolean,
  to: string,
  alertColor = 'error',
): Tile {
  return {
    key,
    label: lan[`dash_${key}`] ?? key,
    value: String(value),
    color: alert ? alertColor : 'default',
    to,
  }
}

/** "83%" or "—". */
export function percent(rate: number | null): string {
  return rate == null ? '—' : `${Math.round(rate * 100)}%`
}

export function pmcTiles(d: PmcDashboard): Tile[] {
  const auditsOpen = Object.values(d.audits.byStatus).reduce((a, b) => a + b, 0)
  return [
    tile(
      'pendingAudit',
      d.customerOrders.pendingAudit,
      d.customerOrders.pendingAudit > 0,
      '/pmc/customer-orders',
      'warning',
    ),
    tile('auditsOpen', auditsOpen, false, '/pmc/order-audit-task'),
    tile('auditsOverdue', d.audits.overdue, d.audits.overdue > 0, '/pmc/order-audit-task'),
    tile('placementOpen', d.placement.open, false, '/purchase/placements'),
    tile('placementOverdue', d.placement.overdue, d.placement.overdue > 0, '/purchase/placements'),
    tile('placementOnTime', percent(d.placement.onTimeRate), false, '/purchase/placements'),
    tile(
      'exceptionsOpen',
      d.exceptions.open,
      d.exceptions.open > 0,
      '/purchase/exceptions',
      'warning',
    ),
    tile(
      'exceptionsUrgent',
      d.exceptions.openBySeverity.URGENT ?? 0,
      (d.exceptions.openBySeverity.URGENT ?? 0) > 0,
      '/purchase/exceptions',
    ),
  ]
}

export function purchasingTiles(d: PurchasingDashboard): Tile[] {
  const tiles = [
    tile('placementOpen', d.placement.open, false, '/purchase/placements'),
    tile('placementOverdue', d.placement.overdue, d.placement.overdue > 0, '/purchase/placements'),
    tile(
      'placementDueSoon',
      d.placement.dueSoon,
      d.placement.dueSoon > 0,
      '/purchase/placements',
      'warning',
    ),
    tile(
      'followUpsDueToday',
      d.followUps.dueToday,
      d.followUps.dueToday > 0,
      '/purchase/followups',
      'warning',
    ),
    tile(
      'followUpsMissed',
      d.followUps.missedLast7Days,
      d.followUps.missedLast7Days > 0,
      '/purchase/followups',
    ),
    tile('activeOrders', d.followUps.activeOrders, false, '/purchase/followups'),
    tile(
      'exceptionsOpen',
      d.exceptions.open,
      d.exceptions.open > 0,
      '/purchase/exceptions',
      'warning',
    ),
  ]
  if (d.allPurchasers) {
    tiles.splice(
      3,
      0,
      tile(
        'placementUnassigned',
        d.placement.unassigned,
        d.placement.unassigned > 0,
        '/purchase/placements',
        'warning',
      ),
    )
  }
  return tiles
}

/** "今天截止", "还剩 2 天", "已过 1 天". */
export function daysLeftLabel(days: number): string {
  if (days === 0) return lan.dash_dueToday ?? ''
  return days > 0 ? fmt(lan.dash_daysLeft, days) : fmt(lan.dash_daysAgo, -days)
}

/** "2026-11-20 09:15" from an ISO local date-time; '' for null. */
export function shortDateTime(value: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 16) : ''
}
