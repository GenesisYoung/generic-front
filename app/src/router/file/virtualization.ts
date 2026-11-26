type Route = import('vue-router').RouteRecordRaw

const virtualization: Route[] = [
  {
    path: '/pmc/evidence',
    name: 'evidenceManagement',
    component: () => import('@/views/virtulization/pmc/EvidenceManagement.vue'),
    meta: {
      title: 'evidenceManagement',
      icon: 'mdi-file-document-outline',
      requireAuth: true,
      permission: ['menu.evidence.read'],
    },
  },
  {
    path: '/pmc/order-audit-task',
    name: 'orderAuditTaskList',
    component: () => import('@/views/virtulization/pmc/OrderAuditTask.vue'),
    meta: {
      title: 'orderAuditTaskList',
      icon: 'mdi-clipboard-check-outline',
      requireAuth: true,
      permission: ['menu.order-audit-task.read'],
    },
  },
  {
    path: '/pmc/dashboard',
    name: 'pmcDashboard',
    component: () => import('@/views/virtulization/pmc/PmcDashboard.vue'),
    meta: {
      title: 'pmcDashboard',
      icon: 'mdi-view-dashboard-outline',
      requireAuth: true,
      permission: ['menu.pmcDashboard'],
    },
  },
  {
    path: '/purchase/dashboard',
    name: 'purchaseDashboard',
    component: () => import('@/views/virtulization/purchase/PurchaseDashboard.vue'),
    meta: {
      title: 'purchaseDashboard',
      icon: 'mdi-view-dashboard-variant-outline',
      requireAuth: true,
      permission: ['menu.purchaseDashboard'],
    },
  },
  {
    path: '/pmc/customer-orders',
    name: 'customerOrderReview',
    component: () => import('@/views/virtulization/pmc/CustomerOrderReview.vue'),
    meta: {
      title: 'customerOrderReview',
      icon: 'mdi-cart-arrow-down',
      requireAuth: true,
      permission: ['menu.customerOrder.read'],
    },
  },
  {
    path: '/purchase/followups',
    name: 'followUpTodo',
    component: () => import('@/views/virtulization/purchase/FollowUpTodo.vue'),
    meta: {
      title: 'followUpTodo',
      icon: 'mdi-phone-check-outline',
      requireAuth: true,
      permission: ['menu.purchaseOrder.read'],
    },
  },
  {
    path: '/purchase/followup-templates',
    name: 'followUpTemplates',
    component: () => import('@/views/virtulization/purchase/FollowUpTemplates.vue'),
    meta: {
      title: 'followUpTemplates',
      icon: 'mdi-calendar-clock-outline',
      requireAuth: true,
      permission: ['menu.followupTemplate.read', 'menu.followupTemplate.update'],
    },
  },
  {
    path: '/purchase/followup-plan-groups',
    name: 'followUpPlanGroups',
    component: () => import('@/views/virtulization/purchase/FollowUpPlanGroups.vue'),
    meta: {
      title: 'followUpPlanGroups',
      icon: 'mdi-shape-outline',
      requireAuth: true,
      permission: ['menu.followupTemplate.read', 'menu.followupTemplate.update'],
    },
  },
  {
    path: '/purchase/quotations',
    name: 'quotations',
    component: () => import('@/views/virtulization/purchase/QuotationList.vue'),
    meta: {
      title: 'quotations',
      icon: 'mdi-calculator-variant-outline',
      requireAuth: true,
      permission: ['menu.quotation.read'],
    },
  },
  {
    path: '/purchase/quotations/plan',
    name: 'quotationPlan',
    component: () => import('@/views/virtulization/purchase/QuotationPlan.vue'),
    meta: {
      title: 'quotationPlan',
      icon: 'mdi-calculator-variant-outline',
      requireAuth: true,
      permission: ['menu.quotation.read'],
    },
  },
  {
    path: '/purchase/exceptions',
    name: 'purchaseExceptions',
    component: () => import('@/views/virtulization/purchase/PurchaseExceptions.vue'),
    meta: {
      title: 'purchaseExceptions',
      icon: 'mdi-alert-octagon-outline',
      requireAuth: true,
      permission: ['menu.purchaseException.read'],
    },
  },
  {
    path: '/purchase/placements',
    name: 'placementTasks',
    component: () => import('@/views/virtulization/purchase/PlacementTasks.vue'),
    meta: {
      title: 'placementTasks',
      icon: 'mdi-cart-clock',
      requireAuth: true,
      permission: ['menu.purchaseOrder.read'],
    },
  },
]

export default virtualization
