import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { motion } from "motion/react";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  onItemsPerPageChange?: (items: number) => void;
}

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 10,
  totalItems = 0,
  onItemsPerPageChange,
}: PaginationBarProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(
    currentPage * itemsPerPage,
    totalItems,
  );

  // Don't show pagination if there are no items
  if (totalItems === 0) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++)
          pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++)
          pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="mb-6 flex items-center justify-between px-6 py-4 bg-white rounded-xl border border-gray-200 shadow-sm"
    >
      <div className="text-sm text-gray-600">
        Showing{" "}
        <span className="font-medium text-[#333333]">
          {startItem}
        </span>{" "}
        to{" "}
        <span className="font-medium text-[#333333]">
          {endItem}
        </span>{" "}
        of{" "}
        <span className="font-medium text-[#333333]">
          {totalItems}
        </span>{" "}
        results
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            typeof page === "number" ? (
              <motion.div
                key={index}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={
                    page === currentPage ? "default" : "outline"
                  }
                  size="icon"
                  className={`w-8 h-8 ${
                    page === currentPage
                      ? "bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white"
                      : ""
                  }`}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              </motion.div>
            ) : (
              <span key={index} className="px-2 text-gray-400">
                {page}
              </span>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>

      {onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Per page:
          </span>
          <Select
            value={String(itemsPerPage)}
            onValueChange={(value) =>
              onItemsPerPageChange(Number(value))
            }
          >
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </motion.div>
  );
}