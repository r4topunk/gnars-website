"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ExternalLink, Loader2, CheckCircle2, AlertCircle, PlusCircle } from "lucide-react";
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
import { usePoidhCreateOpenBounty, usePoidhCreateSoloBounty } from "@/hooks/usePoidhContract";
import { getTxUrl, CHAIN_NAMES, SUPPORTED_CHAINS } from "@/lib/poidh/config";

const CHAIN_OPTIONS = [
  { label: "Base", chainId: SUPPORTED_CHAINS.BASE },
  { label: "Arbitrum", chainId: SUPPORTED_CHAINS.ARBITRUM },
];

interface CreateBountyModalProps {
  children?: React.ReactNode;
}

export function CreateBountyModal({ children }: CreateBountyModalProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"open" | "solo">("open");
  const [chainId, setChainId] = useState<number>(SUPPORTED_CHAINS.BASE);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [claimer, setClaimer] = useState("");
  const { isConnected } = useAccount();

  const openBounty = usePoidhCreateOpenBounty(chainId);
  const soloBounty = usePoidhCreateSoloBounty(chainId);
  const active = type === "open" ? openBounty : soloBounty;
  const chainName = CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES] ?? "Unknown";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !reward) return;
    try {
      if (type === "open") {
        await openBounty.create(name.trim(), description.trim(), reward);
      } else {
        await soloBounty.create(name.trim(), description.trim(), reward);
      }
    } catch {
      // error captured in hook
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setName("");
      setDescription("");
      setReward("");
      setClaimer("");
      openBounty.reset();
      soloBounty.reset();
    }
    setOpen(val);
  };

  const hash = active.hash;
  const isPending = active.isPending;
  const isSuccess = active.isSuccess;
  const error = active.error;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Bounty
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a Bounty</DialogTitle>
          <DialogDescription>
            Post a challenge and reward proof of completion with ETH.
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Connect your wallet to create a bounty.</p>
            <ConnectButton />
          </div>
        ) : isSuccess ? (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div>
              <p className="font-semibold">Bounty created on {chainName}!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your bounty is live. Share it with the community to get submissions.
              </p>
            </div>
            {hash && (
              <a
                href={getTxUrl(chainId, hash)}
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
            {/* Chain + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Chain</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                  disabled={isPending}
                >
                  {CHAIN_OPTIONS.map((c) => (
                    <option key={c.chainId} value={c.chainId}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  value={type}
                  onChange={(e) => setType(e.target.value as "open" | "solo")}
                  disabled={isPending}
                >
                  <option value="open">Open (anyone)</option>
                  <option value="solo">Solo (only you can claim)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="e.g. Land a kickflip down the 5-stair"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 min-h-[80px] resize-y"
                placeholder="Describe the challenge and what counts as valid proof..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reward (ETH)</label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="0.01"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            {type === "solo" && (
              <p className="text-xs text-muted-foreground">
                Solo bounties can only be claimed by you (the creator).
              </p>
            )}

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
                disabled={
                  isPending ||
                  !name.trim() ||
                  !description.trim() ||
                  !reward ||
                  (type === "solo" && (!claimer.startsWith("0x") || claimer.length !== 42))
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {hash ? "Confirming…" : "Confirm in wallet…"}
                  </>
                ) : (
                  `Create & fund with ${parseFloat(reward || "0").toFixed(4)} ETH`
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
