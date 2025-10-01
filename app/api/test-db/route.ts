import { createClient } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

// This route should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables first
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const hasPrismaUrl = !!process.env.PRISMA_DATABASE_URL;

    console.log('Environment check:', {
      POSTGRES_URL: hasPostgresUrl,
      DATABASE_URL: hasDatabaseUrl,
      PRISMA_DATABASE_URL: hasPrismaUrl,
      NODE_ENV: process.env.NODE_ENV
    });

    // If no database URL is available, return early with diagnostic info
    if (!hasPostgresUrl && !hasDatabaseUrl && !hasPrismaUrl) {
      return NextResponse.json({
        success: false,
        error: 'No database environment variables found',
        environment: {
          has_postgres_url: hasPostgresUrl,
          has_database_url: hasDatabaseUrl,
          has_prisma_url: hasPrismaUrl,
          node_env: process.env.NODE_ENV
        }
      }, { status: 500 });
    }

    // Test simple database connection
    console.log('Attempting database connection...');

    // Create client with explicit configuration
    const client = createClient({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
    });

    const result = await client.sql`SELECT 1 as test_value, NOW() as current_time`;
    console.log('Database connection successful');

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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        environment: {
          has_postgres_url: !!process.env.POSTGRES_URL,
          has_database_url: !!process.env.DATABASE_URL,
          has_prisma_url: !!process.env.PRISMA_DATABASE_URL,
          node_env: process.env.NODE_ENV
        }
      },
      { status: 500 }
    );
  }
}