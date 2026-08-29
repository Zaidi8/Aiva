'use client';

import { useState } from 'react';
import {
  Settings2,
  Database,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { Button } from './button';

interface DevControlsProps {
  onEmptyStateToggle?: () => void;
  onTestNotification?: () => void;
  onLargeDataToggle?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
}

// Developer-only affordance for toggling demo states (empty list, large
// dataset, test notifications). Gated to non-production builds so the panel
// never ships in the enterprise UI — mirrors the isDev gate on the UI-Kit nav.
const isDev = process.env.NODE_ENV !== 'production';

export function DevControls({
  onEmptyStateToggle,
  onTestNotification,
  onLargeDataToggle,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  itemsPerPage = 10,
  onItemsPerPageChange,
}: DevControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isDev) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isExpanded && (
        <div className="mb-4 w-80 rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Settings2 className="size-5 text-primary" />
            Dev controls
          </h3>

          <div className="space-y-3">
            {onEmptyStateToggle && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onEmptyStateToggle}
              >
                <Database className="size-4" />
                Toggle empty state
              </Button>
            )}

            {onLargeDataToggle && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onLargeDataToggle}
              >
                <Database className="size-4" />
                Toggle large dataset
              </Button>
            )}

            {onTestNotification && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onTestNotification}
              >
                <Bell className="size-4" />
                Test notification
              </Button>
            )}

            {onItemsPerPageChange && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Items per page
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}

            {onPageChange && totalPages > 1 && (
              <div className="space-y-2 border-t border-border pt-3">
                <label className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Toggle developer controls"
        className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary-hover hover:shadow-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        {isExpanded ? (
          <ChevronDown className="size-6" />
        ) : (
          <Settings2 className="size-6" />
        )}
      </button>
    </div>
  );
}
