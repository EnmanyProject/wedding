import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

// This route should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting simple database test...');

    // Use direct sql template instead of createClient
    console.log('Executing SQL query...');
    const result = await sql`SELECT 1 as test_value, NOW() as current_time`;
    console.log('Query successful:', result);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful (direct sql)',
      data: {
        test_value: result.rows[0].test_value,
        current_time: result.rows[0].current_time
      }
    });
  } catch (error) {
    console.error('Simple database test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}