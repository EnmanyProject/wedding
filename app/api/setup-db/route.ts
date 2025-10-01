import { createClient } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting database setup...');

    // Check environment variables first
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const hasPrismaUrl = !!process.env.PRISMA_DATABASE_URL;

    console.log('Environment check for setup:', {
      POSTGRES_URL: hasPostgresUrl,
      DATABASE_URL: hasDatabaseUrl,
      PRISMA_DATABASE_URL: hasPrismaUrl
    });

    if (!hasPostgresUrl && !hasDatabaseUrl && !hasPrismaUrl) {
      return NextResponse.json({
        success: false,
        error: 'No database environment variables found for setup',
        environment: {
          has_postgres_url: hasPostgresUrl,
          has_database_url: hasDatabaseUrl,
          has_prisma_url: hasPrismaUrl
        }
      }, { status: 500 });
    }

    console.log('Creating UUID extension...');
    // Create database client
    const client = createClient();

    // Enable UUID extension
    await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    console.log('Creating users table...');
    // Create users table
    await client.sql`
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

    console.log('Creating ab_quizzes table...');
    // Create ab_quizzes table
    await client.sql`
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

    console.log('Creating quiz_responses table...');
    // Create quiz_responses table
    await client.sql`
      CREATE TABLE IF NOT EXISTS quiz_responses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        quiz_id UUID NOT NULL REFERENCES ab_quizzes(id),
        user_id UUID NOT NULL REFERENCES users(id),
        selected_option VARCHAR(10) NOT NULL CHECK (selected_option IN ('A', 'B')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(quiz_id, user_id)
      )
    `;

    console.log('Creating indexes...');
    // Create indexes
    await client.sql`CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id ON quiz_responses(user_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_id ON quiz_responses(quiz_id)`;

    console.log('Inserting admin user...');
    // Insert admin user with default password (should be changed in production)
    await client.sql`
      INSERT INTO users (name, email, display_name)
      VALUES ('Admin', 'admin@wedding.com', 'Admin')
      ON CONFLICT (email) DO NOTHING
    `;

    console.log('Database setup completed successfully');

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
    console.error('Setup error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json(
      {
        success: false,
        error: 'Database setup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}