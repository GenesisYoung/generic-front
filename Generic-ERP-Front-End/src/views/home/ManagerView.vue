<template>
  <v-responsive class="border rounded">
    <v-container class="container">
      <v-card class="card-inline auto-grow">
        <v-card-title>{{ lang.totalRevenueDaily }}</v-card-title>
        <v-card-text>{{ lang.currency }}{{ totalRevenue.toFixed(2) }}</v-card-text>
        <v-card-subtitle>{{ total_revenue_desc }}</v-card-subtitle>
      </v-card>
      <v-card class="card-inline auto-grow">
        <v-card-title>{{ lang.orderNumberToday }}</v-card-title>
        <v-card-text>{{ orderNumberToday }}</v-card-text>
        <v-card-subtitle>{{ comparison_desc }}</v-card-subtitle>
      </v-card>
      <v-card class="card-inline auto-grow">
        <v-card-title>{{ lang.activeUsersToday }}</v-card-title>
        <v-card-text>{{ activeUsersToday }}</v-card-text>
        <v-card-subtitle>{{ active_users_desc }}</v-card-subtitle>
      </v-card>
    </v-container>
    <v-container class="container card back-light">
      <v-row class="center">
        <v-col lg="8" md="12" sm="12">
          <div id="revenue-chart" class="chart"></div>
        </v-col>
        <v-col lg="4" md="12" sm="12">
          <div id="order-status-chart" class="chart"></div>
        </v-col>
      </v-row>
    </v-container>
    <v-container class="container">
      <v-row>
        <v-col lg="8" md="6" sm="12">
          <v-table id="order-list" class="fatted back-dark border-rounded">
            <thead>
              <tr>
                <th>{{ lang.orderId }}</th>
                <th>{{ lang.customerName }}</th>
                <th>{{ lang.salesChannel }}</th>
                <th>{{ lang.orderStatus }}</th>
                <th>{{ lang.totalAmount }}</th>
                <th>{{ lang.orderDate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orderList" :key="order.orderId">
                <td>{{ order.orderId }}</td>
                <td>{{ order.customerName }}</td>
                <td>{{ order.salesChannel }}</td>
                <td>{{ order.orderStatus }}</td>
                <td>{{ lang.currency }}{{ order.totalAmount.toFixed(2) }}</td>
                <td>{{ order.orderDate }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-col>
        <v-col lg="4" md="6" sm="12">
          <div id="order-distribution-chart" class="chart"></div>
        </v-col>
      </v-row>
    </v-container>
  </v-responsive>
</template>

<script setup lang="ts">
import { inject, onMounted } from 'vue'
import * as echarts from 'echarts'
type Lan = Record<string, string>
const lang: Lan = inject('lan') as Lan
const totalRevenue = 12345.67
const total_revenue_desc = '▲ 12% vs last month'
const orderNumberToday = 95
const comparison_desc = '---与昨日相比持平'
const activeUsersToday = 123
const active_users_desc = '▲ 5% vs yesterday'
const orderList = [
  {
    orderId: 'ORD001',
    customerName: 'Alice',
    salesChannel: 'Online',
    orderStatus: 'Shipped',
    totalAmount: 250.0,
    orderDate: '2024-06-01',
  },
  {
    orderId: 'ORD002',
    customerName: 'Bob',
    salesChannel: 'In-Store',
    orderStatus: 'Processing',
    totalAmount: 150.0,
    orderDate: '2024-06-01',
  },
  {
    orderId: 'ORD003',
    customerName: 'Charlie',
    salesChannel: 'Online',
    orderStatus: 'Delivered',
    totalAmount: 300.0,
    orderDate: '2024-06-01',
  },
]
function initRevenueChart() {
  const revenueChart = echarts.init(document.getElementById('revenue-chart') as HTMLElement)
  revenueChart.setOption({
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: [120, 200, 150, 80, 70, 110, 130],
        type: 'bar',
      },
    ],
  })
  const orderStatusChart = echarts.init(
    document.getElementById('order-status-chart') as HTMLElement,
  )
  orderStatusChart.setOption({
    tooltip: {
      trigger: 'item',
    },
    legend: {
      top: '5%',
      left: 'center',
    },
    series: [
      {
        name: 'Access From',
        type: 'pie',
        radius: ['20%', '60%'],
        avoidLabelOverlap: false,
        padAngle: 5,
        itemStyle: {
          borderRadius: 5,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 10,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: 1048, name: '2L小绿锅' },
          { value: 735, name: '2L兔子锅' },
          { value: 580, name: '1L小绿锅' },
          { value: 484, name: '钛杯' },
          { value: 300, name: '1L兔子锅' },
        ],
      },
    ],
  })
  const orderDistributionChart = echarts.init(
    document.getElementById('order-distribution-chart') as HTMLElement,
  )
  orderDistributionChart.setOption({
    title: {
      text: '平台分布',
      subtext: '模拟数据',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      fontSize: 5,
    },
    series: [
      {
        name: '平台分布',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 1048, name: '天猫' },
          { value: 735, name: '京东' },
          { value: 580, name: '拼多多' },
          { value: 484, name: '合作商' },
          { value: 300, name: '门店' },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  })
}
onMounted(() => {
  initRevenueChart()
})
</script>

<style scoped>
@import '@/assets/styles/main.css';
.chart {
  width: 100%;
  height: 300px;
}
</style>
