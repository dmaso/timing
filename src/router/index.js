import { createRouter, createWebHistory } from 'vue-router'
import Analyzer from '@/views/Analyzer.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/analyzer',
      name: 'analyzer',
      component: Analyzer
    }
  ]
})

export default router
