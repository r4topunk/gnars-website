import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTNAMES = new Set([
  'ipfs.skatehive.app',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'gateway.pinata.cloud',
  'dweb.link',
  'nftstorage.link',
]);

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!ALLOWED_HOSTNAMES.has(hostname)) {
    return NextResponse.json({ error: 'URL hostname not allowed' }, { status: 400 });
  }

  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch headers' }, { status: 502 });
    }
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
