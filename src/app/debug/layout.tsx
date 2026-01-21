import { IS_DEV } from "@/lib/config";
import { ReactNode } from "react";

export default function DebugLayout({ children }: { children: ReactNode }) {
  if (!IS_DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">Debug routes are only available in development mode.</p>
        </div>
      </div>
    );
  }

  return children;
}
