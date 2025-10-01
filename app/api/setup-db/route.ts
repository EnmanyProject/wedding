import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Enable UUID extension
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        display_name VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create ab_quizzes table
    await sql`
      CREATE TABLE IF NOT EXISTS ab_quizzes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        category VARCHAR(50),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        option_a_title VARCHAR(100) NOT NULL,
        option_a_description TEXT,
        option_a_image TEXT,
        option_b_title VARCHAR(100) NOT NULL,
        option_b_description TEXT,
        option_b_image TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create quiz_responses table
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_responses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        quiz_id UUID NOT NULL REFERENCES ab_quizzes(id),
        user_id UUID NOT NULL REFERENCES users(id),
        selected_option VARCHAR(10) NOT NULL CHECK (selected_option IN ('A', 'B')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(quiz_id, user_id)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id ON quiz_responses(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_id ON quiz_responses(quiz_id)`;

    // Insert admin user with default password (should be changed in production)
    await sql`
      INSERT INTO users (name, email, display_name)
      VALUES ('Admin', 'admin@wedding.com', 'Admin')
      ON CONFLICT (email) DO NOTHING
    `;

    return NextResponse.json({
      success: true,
      message: 'Database schema created successfully',
      tables_created: [
        'users',
        'ab_quizzes',
        'quiz_responses'
      ]
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}