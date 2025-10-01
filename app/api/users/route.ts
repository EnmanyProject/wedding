import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get all active users
    const { rows } = await sql`
      SELECT id, name, display_name, created_at
      FROM users
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, display_name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create new user
    const { rows } = await sql`
      INSERT INTO users (name, email, display_name)
      VALUES (${name}, ${email || null}, ${display_name || null})
      RETURNING id, name, display_name, created_at
    `;

    return NextResponse.json({
      success: true,
      data: rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}