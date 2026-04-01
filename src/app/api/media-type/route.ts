import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const res = await fetch(url, { method: 'HEAD' });
    const contentType = res.headers.get('content-type') || '';
    const contentDisposition = res.headers.get('content-disposition') || '';

    return NextResponse.json({
      contentType,
      isVideo: contentType.startsWith('video/'),
      isImage: contentType.startsWith('image/'),
      isAttachment: contentDisposition.toLowerCase().includes('attachment'),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch headers' }, { status: 500 });
  }
}
