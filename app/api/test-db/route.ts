import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables first
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const hasPrismaUrl = !!process.env.PRISMA_DATABASE_URL;

    // Test simple database connection
    const result = await sql`SELECT 1 as test_value, NOW() as current_time`;

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      environment: {
        has_postgres_url: hasPostgresUrl,
        has_database_url: hasDatabaseUrl,
        has_prisma_url: hasPrismaUrl
      },
      data: {
        test_value: result.rows[0].test_value,
        current_time: result.rows[0].current_time
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          has_postgres_url: !!process.env.POSTGRES_URL,
          has_database_url: !!process.env.DATABASE_URL,
          has_prisma_url: !!process.env.PRISMA_DATABASE_URL
        }
      },
      { status: 500 }
    );
  }
}