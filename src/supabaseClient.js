// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oslvdjataqdnencvgecs.supabase.co/' // URL de tu proyecto Supabase
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zbHZkamF0YXFkbmVuY3ZnZWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYwOTQzMzAsImV4cCI6MjA0MTY3MDMzMH0.XOzumV25Fszs7RGuyNu9HDYba7IZKpr8l5tPIQhlDxk' // Clave anónima de tu proyecto Supabase

export const supabase = createClient(supabaseUrl, supabaseAnonKey)