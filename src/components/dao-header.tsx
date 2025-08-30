import { Badge } from "@/components/ui/badge";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { DAO_DESCRIPTION } from "@/lib/config";

export function DaoHeader() {
  return (
    <header className="flex flex-col gap-6 p-6 border-b">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">Gnars DAO</h1>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            on Base
          </Badge>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          {DAO_DESCRIPTION}
        </p>
      </div>
      
      <NavigationMenu>
        <NavigationMenuList className="flex gap-2">
          <NavigationMenuItem>
            <NavigationMenuLink 
              href="/auctions" 
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
            >
              Auctions
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink 
              href="/proposals" 
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
            >
              Proposals
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink 
              href="/propose" 
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
            >
              Create Proposal
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink 
              href="/treasury" 
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
            >
              Treasury
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink 
              href="/members" 
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
            >
              Members
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink 
              href="/propdates" 
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
            >
              Propdates
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
}