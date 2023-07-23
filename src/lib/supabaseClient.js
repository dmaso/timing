import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://icactomcetnfujpraanv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljYWN0b21jZXRuZnVqcHJhYW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAxMzUxNzUsImV4cCI6MjAwNTcxMTE3NX0.5KK9UKYon_3vVX4kwavuYTvc4pVYhbUYKXUpUc4s_A4'
)
