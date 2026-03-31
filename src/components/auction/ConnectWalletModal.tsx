"use client";

import { useMemo } from "react";
import { useConnect } from "wagmi";
import { Badge } from "@/components/ui/badge";
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

const LAST_CONNECTOR_KEY = "gnars-last-connector";

function getLastConnectorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_CONNECTOR_KEY);
  } catch {
    return null;
  }
}

function setLastConnectorId(id: string) {
  try {
    localStorage.setItem(LAST_CONNECTOR_KEY, id);
  } catch {
    // localStorage unavailable
  }
}

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectWalletModal({ open, onOpenChange }: ConnectWalletModalProps) {
  const { connectors, connectAsync } = useConnect();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const lastConnectorId = useMemo(() => getLastConnectorId(), []);

  // Sort: last used first, then original order
  const sortedConnectors = useMemo(() => {
    if (!lastConnectorId) return connectors;
    return [...connectors].sort((a, b) => {
      if (a.id === lastConnectorId) return -1;
      if (b.id === lastConnectorId) return 1;
      return 0;
    });
  }, [connectors, lastConnectorId]);

  const handleConnect = async (connector: (typeof connectors)[number]) => {
    setConnectingId(connector.uid);
    try {
      await connectAsync({ connector });
      setLastConnectorId(connector.id);
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
          {sortedConnectors.map((connector) => {
            const isLastUsed = connector.id === lastConnectorId;
            return (
              <Button
                key={connector.uid}
                variant="outline"
                className={`w-full justify-start gap-3 h-12 cursor-pointer ${
                  isLastUsed ? "border-primary/50 bg-primary/5" : ""
                }`}
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
                <span className="font-medium flex-1 text-left">{connector.name}</span>
                {isLastUsed && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Last used
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
