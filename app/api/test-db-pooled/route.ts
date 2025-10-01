import { createClient } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

// This route should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing with pooled connection...');

    // Get the original DATABASE_URL and modify it for pooling
    const originalUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!originalUrl) {
      return NextResponse.json({
        success: false,
        error: 'No database URL found'
      }, { status: 500 });
    }

    // Convert to pooled connection by changing port 5432 to 6543
    const pooledUrl = originalUrl.replace(':5432/', ':6543/');

    console.log('Original URL preview:', originalUrl.substring(0, 50) + '...');
    console.log('Pooled URL preview:', pooledUrl.substring(0, 50) + '...');

    // Create client with pooled URL
    const client = createClient({
      connectionString: pooledUrl
    });

    console.log('Executing query with pooled connection...');
    const result = await client.sql`SELECT 1 as test_value, NOW() as current_time`;
    console.log('Query successful!');

    return NextResponse.json({
      success: true,
      message: 'Database connection successful (pooled)',
      data: {
        test_value: result.rows[0].test_value,
        current_time: result.rows[0].current_time
      },
      connection_info: {
        original_port: '5432',
        pooled_port: '6543',
        url_modified: true
      }
    });

  } catch (error) {
    console.error('Pooled connection test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Pooled connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}