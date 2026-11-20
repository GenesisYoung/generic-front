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
