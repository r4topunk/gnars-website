import Image from "next/image";
import { notFound } from "next/navigation";
import { isAddress } from "viem";

interface TestOGPageProps {
  params: Promise<{ address: string }>;
}

export default async function TestOGPage({ params }: TestOGPageProps) {
  const { address } = await params;

  if (!isAddress(address)) {
    notFound();
  }

  const ogImageUrl = `/members/${address}/opengraph-image`;

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-2xl font-bold text-white">
          OG Image Test: {address.slice(0, 8)}...{address.slice(-6)}
        </h1>

        <div className="mb-8 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="mb-2 text-sm text-gray-400">Image URL:</p>
          <code className="text-xs text-gray-300">{ogImageUrl}</code>
        </div>

        <div className="mb-4 text-sm text-gray-400">Generated Image (1200x630):</div>

        <div className="overflow-hidden rounded-lg border-2 border-gray-700">
          <Image
            src={ogImageUrl}
            alt="Member OG Image"
            width={1200}
            height={630}
            className="w-full h-auto"
            priority
          />
        </div>

        <div className="mt-8 space-y-2">
          <a
            href={ogImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
          >
            Open Image in New Tab
          </a>
          <a
            href={`/members/${address}`}
            className="block rounded bg-gray-700 px-4 py-2 text-center text-white hover:bg-gray-600"
          >
            Back to Member Page
          </a>
        </div>
      </div>
    </div>
  );
}
