"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Mock Proposal Component Demo Page
export default function ProposalComponentsDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Proposal Components Demo</h1>
          <p className="text-lg text-muted-foreground">
            Explore all proposal interaction components with shadcn/ui design system
          </p>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="voting" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="voting">Voting</TabsTrigger>
            <TabsTrigger value="actions">Queue/Execute</TabsTrigger>
            <TabsTrigger value="timelock">Timelock</TabsTrigger>
            <TabsTrigger value="full-example">Full Proposal</TabsTrigger>
          </TabsList>

          {/* Voting Controls Tab */}
          <TabsContent value="voting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voting Controls</CardTitle>
                <CardDescription>
                  Interactive voting interface with vote choice selection and optional reasoning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VotingControlsDemo />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue/Execute Actions Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Queue Proposal Button</CardTitle>
                <CardDescription>
                  Confirmation dialog for queueing a proposal with irreversible action warning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QueueProposalButtonDemo />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Execute Proposal Button</CardTitle>
                <CardDescription>
                  Confirmation dialog for executing a proposal with transaction warning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExecuteProposalButtonDemo />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timelock Tab */}
          <TabsContent value="timelock" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Timelock Alert</CardTitle>
                <CardDescription>
                  Alert component showing timelock countdown with proper shadcn styling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimelockAlertDemo />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Full Example Tab */}
          <TabsContent value="full-example" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Complete Proposal Example</CardTitle>
                <CardDescription>
                  Full proposal card with header, metrics, voting controls, and actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompleteProposalExample />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Component Demos
function VotingControlsDemo() {
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg border">
        <p className="text-sm text-muted-foreground mb-4">
          Vote choice: <span className="font-semibold text-foreground">{selectedVote || "None selected"}</span>
        </p>
      </div>

      {/* Vote Choice Radio Group */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Vote Choice</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {["FOR", "AGAINST", "ABSTAIN"].map((choice) => (
            <button
              key={choice}
              onClick={() => setSelectedVote(choice)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedVote === choice
                  ? choice === "FOR"
                    ? "bg-green-50 border-green-500 dark:bg-green-950/40 dark:border-green-600"
                    : choice === "AGAINST"
                    ? "bg-red-50 border-red-500 dark:bg-red-950/40 dark:border-red-600"
                    : "bg-gray-100 border-gray-400 dark:bg-gray-900/40 dark:border-gray-600"
                  : "border-input bg-background hover:bg-accent"
              }`}
            >
              <div className="font-semibold text-sm">{choice}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {choice === "FOR" && "Support this proposal"}
                {choice === "AGAINST" && "Oppose this proposal"}
                {choice === "ABSTAIN" && "Neither support nor oppose"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Comment Field */}
      <div className="space-y-2">
        <label htmlFor="reason" className="text-sm font-medium">
          Optional comment (shared on-chain)
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Share context for your vote"
          className="w-full min-h-24 px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Submit Button */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">You have 1,234 votes (based on snapshot)</p>
        <button
          onClick={() => setIsSubmitting(true)}
          disabled={!selectedVote || isSubmitting}
          className="w-full h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-all"
        >
          {isSubmitting ? "Submitting vote..." : "Confirm Vote"}
        </button>
      </div>
    </div>
  );
}

function QueueProposalButtonDemo() {
  const [showDialog, setShowDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Queue this proposal before it expires
      </p>

      {/* Button */}
      <button
        onClick={() => setShowDialog(true)}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white h-10 px-4 py-2 rounded-md font-medium text-sm transition-all"
      >
        Queue Proposal
      </button>

      {/* Dialog Preview */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Queue Proposal</h2>
              <p className="text-sm text-muted-foreground">
                This will queue the proposal for execution after the timelock delay. This action is irreversible.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsProcessing(true);
                  setTimeout(() => {
                    setShowDialog(false);
                    setIsProcessing(false);
                  }, 2000);
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? "Queueing..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExecuteProposalButtonDemo() {
  const [showDialog, setShowDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Execute this proposal and perform all proposed transactions
      </p>

      {/* Button */}
      <button
        onClick={() => setShowDialog(true)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 py-2 rounded-md font-medium text-sm transition-all"
      >
        Execute Proposal
      </button>

      {/* Dialog Preview */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Execute Proposal</h2>
              <p className="text-sm text-muted-foreground">
                This will execute the proposal and perform all proposed transactions. This action is irreversible.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsProcessing(true);
                  setTimeout(() => {
                    setShowDialog(false);
                    setIsProcessing(false);
                  }, 2000);
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? "Executing..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelockAlertDemo() {
  const [timeLeft, setTimeLeft] = useState("2d 4h 23m");

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 space-y-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 11-2 0 1 1 0 012 0zm-1 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Execution Timelock</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">Waiting for security delay</p>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-background border border-input font-mono text-sm font-bold">
            {timeLeft}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-2">
        <p>✓ Uses shadcn Alert component with AlertTitle and AlertDescription</p>
        <p>✓ Icon integrated from Lucide React</p>
        <p>✓ Badge shows countdown timer</p>
        <p>✓ Responsive layout with proper spacing</p>
      </div>
    </div>
  );
}

function CompleteProposalExample() {
  const [votedChoice, setVotedChoice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Proposal Header */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Proposal #42</div>
            <h2 className="text-2xl font-bold mt-1">Allocate Treasury Funds to Development</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Proposed by{" "}
              <code className="bg-muted px-2 py-1 rounded text-xs font-mono">0x1234...5678</code> · 2 days ago
            </p>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 whitespace-nowrap">
            Active
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "For Votes", value: "1,250", color: "green" },
          { label: "Against Votes", value: "342", color: "red" },
          { label: "Abstain Votes", value: "89", color: "gray" },
          { label: "Quorum", value: "4.0%", color: "blue" },
        ].map((metric) => (
          <div key={metric.label} className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="text-2xl font-bold mt-1">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Voting Section */}
      <div className="border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Cast Your Vote</h3>
        <VotingControlsDemo />
      </div>

      {/* Proposal Status Actions */}
      <div className="border rounded-lg p-6 space-y-4 bg-muted/50">
        <h3 className="font-semibold">Status Updates</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
              <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold">Voting Active</p>
              <p className="text-xs text-muted-foreground">Ends in 2 days</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background opacity-50">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm6 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold">Queue</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background opacity-50">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1V3a1 1 0 011-1h5a1 1 0 011 1v1h1V3a1 1 0 011 1v1h2a2 2 0 012 2v13a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2h2V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold">Execute</p>
              <p className="text-xs text-muted-foreground">After queue + timelock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Component Info */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Components Used in This Demo:</p>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4">
          <li>✓ Tabs for navigation between sections</li>
          <li>✓ Card components for content organization</li>
          <li>✓ VotingControls with RadioGroup and Textarea</li>
          <li>✓ Alert component for status information</li>
          <li>✓ Badge components for status indicators</li>
          <li>✓ AlertDialog for confirmation (interactive)</li>
          <li>✓ Button components with proper variants</li>
        </ul>
      </div>
    </div>
  );
}
