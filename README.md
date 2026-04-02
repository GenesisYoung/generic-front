# Generic ERP System

## Description

This is a Generic ERP System designed and developed by Genesis Young. This repository is the Front-End part, it is written with
Vue.js(Base Framework)+Vuetify(UI Framework)+TypeScript+Pinia(State Management)

## Front-End Authentication Architecture

![Front-End Auth Structure](ERP_Auth_Architecture.png)

### Related Files

'/src/config/auth.ts' - **Define enums, types, functions for authentication**
'/src/stores/authStore.ts' - **Pinia store for authentication**
'/src/router/index.ts' - **Router configuration for authentication**
'/src/api/auth.ts' - **API configuration for authentication**

### Permissions

```ts
enum Permission {
  ROOT = 1001,
  ACCOUNTANT = 1002,
  HR = 1003,
  MARKETING = 1004,
  PURCHASER = 1005,
  SALESMAN = 1006,
  BRAND_MANAGER = 1007,
  DESIGNER = 1008,
  CUSTOMER_RELATION = 1009,
}
```
