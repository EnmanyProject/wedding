import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');

    let query = `
      SELECT id, category, title, description,
             option_a_title, option_a_description, option_a_image,
             option_b_title, option_b_description, option_b_image,
             created_at
      FROM ab_quizzes
      WHERE is_active = true
    `;

    const params: any[] = [];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const { rows } = await sql.query(query, params);

    return NextResponse.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      category,
      title,
      description,
      option_a_title,
      option_a_description,
      option_b_title,
      option_b_description,
      created_by
    } = body;

    if (!title || !option_a_title || !option_b_title) {
      return NextResponse.json(
        { success: false, error: 'Title and both options are required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO ab_quizzes (
        category, title, description,
        option_a_title, option_a_description,
        option_b_title, option_b_description,
        created_by
      )
      VALUES (
        ${category || null}, ${title}, ${description || null},
        ${option_a_title}, ${option_a_description || null},
        ${option_b_title}, ${option_b_description || null},
        ${created_by || null}
      )
      RETURNING id, title, option_a_title, option_b_title, created_at
    `;

    return NextResponse.json({
      success: true,
      data: rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create quiz' },
      { status: 500 }
    );
  }
}