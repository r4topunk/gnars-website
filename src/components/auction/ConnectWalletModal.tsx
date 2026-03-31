"use client";

import { useConnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useState } from "react";

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectWalletModal({ open, onOpenChange }: ConnectWalletModalProps) {
  const { connectors, connectAsync } = useConnect();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnect = async (connector: (typeof connectors)[number]) => {
    setConnectingId(connector.uid);
    try {
      await connectAsync({ connector });
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message ?? "Failed to connect")
          : "Failed to connect";
      if (/rejected|user|cancel/i.test(message)) {
        toast("Connection cancelled");
      } else {
        toast.error("Connection failed", { description: message });
      }
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet to place bids and interact with Gnars DAO.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              className="w-full justify-start gap-3 h-12 cursor-pointer"
              disabled={connectingId !== null}
              onClick={() => handleConnect(connector)}
            >
              {connectingId === connector.uid ? (
                <Spinner />
              ) : (
                connector.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={connector.icon}
                    alt=""
                    className="h-6 w-6 rounded"
                  />
                )
              )}
              <span className="font-medium">{connector.name}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
