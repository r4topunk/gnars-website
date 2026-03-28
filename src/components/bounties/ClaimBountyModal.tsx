"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { usePoidhCreateClaim } from "@/hooks/usePoidhContract";
import { getTxUrl, CHAIN_NAMES } from "@/lib/poidh/config";
import type { PoidhBounty } from "@/types/poidh";

interface ClaimBountyModalProps {
  bounty: PoidhBounty;
  children: React.ReactNode;
}

export function ClaimBountyModal({ bounty, children }: ClaimBountyModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { isConnected } = useAccount();
  const { submit, hash, isPending, isSuccess, error, reset } = usePoidhCreateClaim(bounty.chainId);
  const chainName = CHAIN_NAMES[bounty.chainId as keyof typeof CHAIN_NAMES] ?? "Unknown";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    try {
      await submit(bounty.onChainId, name.trim(), description.trim());
    } catch {
      // error captured in hook
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setName("");
      setDescription("");
      reset();
    }
    setOpen(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Your Proof</DialogTitle>
          <DialogDescription>
            Claim this bounty on {chainName} by submitting your proof of completion.
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Connect your wallet to submit a claim.</p>
            <ConnectButton />
          </div>
        ) : isSuccess ? (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div>
              <p className="font-semibold">Claim submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your proof is on-chain. The bounty issuer will review it.
              </p>
            </div>
            {hash && (
              <a
                href={getTxUrl(bounty.chainId, hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View transaction <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button variant="outline" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Claim title</label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="e.g. Kickflip down the 5-stair"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Proof / description</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 min-h-[100px] resize-y"
                placeholder="Describe your proof and include links to photos/videos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                disabled={isPending}
                required
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error.message.split('\n')[0]}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPending || !name.trim() || !description.trim()}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {hash ? "Confirming…" : "Confirm in wallet…"}
                  </>
                ) : (
                  "Submit Claim"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
