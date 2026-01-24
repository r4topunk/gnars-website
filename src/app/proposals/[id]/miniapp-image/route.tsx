export const runtime = "edge";
export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;

  try {
    const url = new URL(`/api/og/proposals/${id}/miniapp-image`, request.url);
    return fetch(url, { cache: "no-store" });
  } catch (error) {
    console.error("[proposals miniapp-image] proxy error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
