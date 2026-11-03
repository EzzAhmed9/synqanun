import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return new NextResponse('Document ID is required', { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/documents/${id}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text().catch(() => '');
      return new NextResponse(errText || 'Document not found', { status: backendRes.status });
    }

    const headers = new Headers();
    const contentType = backendRes.headers.get('content-type');
    const contentDisposition = backendRes.headers.get('content-disposition');
    const contentLength = backendRes.headers.get('content-length');

    if (contentType) headers.set('Content-Type', contentType);
    if (contentDisposition) headers.set('Content-Disposition', contentDisposition);
    if (contentLength) headers.set('Content-Length', contentLength);

    return new NextResponse(backendRes.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return new NextResponse(err?.message || 'Download failed', { status: 500 });
  }
}
