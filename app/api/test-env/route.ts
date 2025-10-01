import { NextRequest, NextResponse } from 'next/server';

// This route should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables without database connection
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const hasPrismaUrl = !!process.env.PRISMA_DATABASE_URL;

    return NextResponse.json({
      success: true,
      message: 'Environment variables check',
      environment: {
        has_postgres_url: hasPostgresUrl,
        has_database_url: hasDatabaseUrl,
        has_prisma_url: hasPrismaUrl,
        node_env: process.env.NODE_ENV,
        // Show first 20 chars of each URL for debugging (safely)
        postgres_url_preview: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.substring(0, 20) + '...' : 'missing',
        database_url_preview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'missing',
        prisma_url_preview: process.env.PRISMA_DATABASE_URL ? process.env.PRISMA_DATABASE_URL.substring(0, 20) + '...' : 'missing'
      }
    });
  } catch (error) {
    console.error('Environment check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Environment check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}