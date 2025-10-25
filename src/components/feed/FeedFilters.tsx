/**
 * FeedFilters - Event filtering controls
 * 
 * Provides UI for filtering feed events by category, priority, and time range.
 * Max 7 props per component rule.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, X } from "lucide-react";
import { EventCategory, EventPriority, FeedFilters as FeedFiltersType } from "@/lib/types/feed-events";
import { DEFAULT_FILTERS } from "./LiveFeedView";

export interface FeedFiltersProps {
  filters: FeedFiltersType;
  onFiltersChange: (filters: FeedFiltersType) => void;
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  governance: "Governance",
  auction: "Auctions",
  token: "Tokens",
  delegation: "Delegation",
  treasury: "Treasury",
  admin: "Admin",
  settings: "Settings",
};

const PRIORITY_LABELS: Record<EventPriority, string> = {
  HIGH: "High Priority",
  MEDIUM: "Medium Priority",
  LOW: "Low Priority",
};

const TIME_RANGE_LABELS = {
  "1h": "Last Hour",
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "all": "All Time",
} as const;

export function FeedFilters({ filters, onFiltersChange }: FeedFiltersProps) {
  // Check if current filters match defaults
  const isDefaultFilters = 
    filters.priorities.length === DEFAULT_FILTERS.priorities.length &&
    filters.priorities.every(p => DEFAULT_FILTERS.priorities.includes(p)) &&
    filters.categories.length === DEFAULT_FILTERS.categories.length &&
    filters.categories.every(c => DEFAULT_FILTERS.categories.includes(c)) &&
    filters.timeRange === DEFAULT_FILTERS.timeRange &&
    filters.showOnlyWithComments === DEFAULT_FILTERS.showOnlyWithComments;

  const handleCategoryToggle = (category: EventCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handlePriorityToggle = (priority: EventPriority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    
    onFiltersChange({ ...filters, priorities: newPriorities });
  };

  const handleTimeRangeChange = (timeRange: FeedFiltersType["timeRange"]) => {
    onFiltersChange({ ...filters, timeRange });
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Category Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>Category</span>
            {filters.categories.length < 7 && (
              <Badge variant="secondary" className="h-5 px-1 text-xs">
                {filters.categories.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Event Category</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.entries(CATEGORY_LABELS) as [EventCategory, string][]).map(([value, label]) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={filters.categories.includes(value)}
              onCheckedChange={() => handleCategoryToggle(value)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <span>Priority</span>
            {filters.priorities.length < 3 && (
              <Badge variant="secondary" className="h-5 px-1 text-xs">
                {filters.priorities.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Event Priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.entries(PRIORITY_LABELS) as [EventPriority, string][]).map(([value, label]) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={filters.priorities.includes(value)}
              onCheckedChange={() => handlePriorityToggle(value)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Time Range Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            {TIME_RANGE_LABELS[filters.timeRange]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel>Time Range</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.entries(TIME_RANGE_LABELS) as [FeedFiltersType["timeRange"], string][]).map(([value, label]) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={filters.timeRange === value}
              onCheckedChange={() => handleTimeRangeChange(value)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Comments Only Toggle */}
      <Button
        variant={filters.showOnlyWithComments ? "default" : "outline"}
        size="sm"
        className="h-8"
        onClick={() => onFiltersChange({ 
          ...filters, 
          showOnlyWithComments: !filters.showOnlyWithComments 
        })}
      >
        With Comments
      </Button>

      {/* Reset button - only show if filters differ from defaults */}
      {!isDefaultFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          onClick={handleReset}
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}

