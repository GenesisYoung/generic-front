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
]

export default virtualization
