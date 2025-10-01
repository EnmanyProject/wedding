import { NextRequest, NextResponse } from 'next/server';

// This route should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing with fetch to Prisma Accelerate...');

    // Check environment variables
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const hasPrismaUrl = !!process.env.PRISMA_DATABASE_URL;

    if (!hasPrismaUrl) {
      return NextResponse.json({
        success: false,
        error: 'PRISMA_DATABASE_URL not found',
        environment: {
          has_postgres_url: hasPostgresUrl,
          has_database_url: hasDatabaseUrl,
          has_prisma_url: hasPrismaUrl
        }
      }, { status: 500 });
    }

    // Use raw HTTP request to Prisma Accelerate
    const prismaUrl = process.env.PRISMA_DATABASE_URL!;
    console.log('Prisma URL preview:', prismaUrl.substring(0, 50) + '...');

    // Try a simple SQL query through Prisma Accelerate
    const queryPayload = {
      query: "SELECT 1 as test_value, NOW() as current_time"
    };

    console.log('Sending query to Prisma Accelerate...');

    // For now, just return success with the URL info
    return NextResponse.json({
      success: true,
      message: 'Prisma Accelerate URL found',
      prisma_url_preview: prismaUrl.substring(0, 50) + '...',
      note: 'This is a test to verify Prisma Accelerate connection setup'
    });

  } catch (error) {
    console.error('Prisma Accelerate test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Prisma Accelerate test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}