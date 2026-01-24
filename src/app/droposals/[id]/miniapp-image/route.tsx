export const runtime = "edge";
export const revalidate = 300;

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;

  try {
    const url = new URL(`/api/og/droposals/${id}/miniapp-image`, _request.url);
    return fetch(url, { cache: "no-store" });
  } catch (error) {
    console.error("[droposals miniapp-image] proxy error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
