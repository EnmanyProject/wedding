import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const { rows } = await sql`SELECT NOW() as current_time, version() as postgres_version`;

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        current_time: rows[0].current_time,
        postgres_version: rows[0].postgres_version
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}