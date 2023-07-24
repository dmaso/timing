import { createRouter, createWebHistory } from 'vue-router'
import Analyzer from '@/views/Analyzer.vue'
import Preflop from '@/views/Preflop.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/analyzer',
      name: 'analyzer',
      component: Analyzer
    },
    {
      path: '/preflop',
      name: 'preflop',
      component: Preflop
    }
  ]
})

export default router
