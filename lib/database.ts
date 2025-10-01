import { sql } from '@vercel/postgres'

// Database connection utility for Vercel Postgres
export const db = {
  // Query wrapper with error handling
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    try {
      const result = await sql.query(text, params)
      return result.rows as T[]
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  },

  // Raw SQL execution for complex queries
  async execute(text: string, params?: any[]) {
    try {
      return await sql.query(text, params)
    } catch (error) {
      console.error('Database execution error:', error)
      throw error
    }
  }
}

// Database initialization for development
export async function initializeDatabase() {
  try {
    // Check if database is accessible
    await db.query('SELECT NOW()')
    console.log('✅ Database connection established')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Types for database models
export interface User {
  id: string
  name: string
  display_name?: string
  email?: string
  created_at: Date
  is_active: boolean
}

export interface QuizResponse {
  id: string
  quiz_id: string
  user_id: string
  selected_option: 'A' | 'B'
  created_at: Date
}

export interface AbQuiz {
  id: string
  category: string
  title: string
  description?: string
  option_a_title: string
  option_a_description?: string
  option_a_image?: string
  option_b_title: string
  option_b_description?: string
  option_b_image?: string
  is_active: boolean
  created_at: Date
  created_by?: string
}