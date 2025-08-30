import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KeyStatsProps {
  currentAuction?: {
    id: string;
    highestBid?: string;
    endTime?: string;
  };
  totalSupply?: number;
  members?: number;
  loading?: boolean;
}

export function KeyStats({ currentAuction, totalSupply, members, loading }: KeyStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Auction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            #{currentAuction?.id || '...'}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentAuction?.highestBid ? `${currentAuction.highestBid} ETH` : 'Loading...'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Supply
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalSupply || '...'}
          </div>
          <p className="text-xs text-muted-foreground">
            Gnars minted
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            DAO Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {members || '...'}
          </div>
          <p className="text-xs text-muted-foreground">
            Active holders
          </p>
        </CardContent>
      </Card>
    </div>
  );
}