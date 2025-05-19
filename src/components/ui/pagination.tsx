import { Button } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showIcons?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showIcons = true,
}: PaginationProps) {
  // Handle prev/next/first/last page navigation
  const goToFirstPage = () => onPageChange(1);
  const goToPreviousPage = () => onPageChange(Math.max(1, currentPage - 1));
  const goToNextPage = () =>
    onPageChange(Math.min(totalPages, currentPage + 1));
  const goToLastPage = () => onPageChange(totalPages);

  // Calculate page numbers to display
  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];

    // If we have 7 or fewer pages, show all of them
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first and last page
      pages.push(1);

      // Calculate middle pages
      const leftBound = Math.max(
        2,
        currentPage - Math.floor(maxPagesToShow / 2)
      );
      const rightBound = Math.min(
        totalPages - 1,
        leftBound + maxPagesToShow - 1
      );

      // Add ellipsis if needed
      if (leftBound > 2) {
        pages.push(-1); // -1 represents an ellipsis
      }

      // Add middle pages
      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (rightBound < totalPages - 1) {
        pages.push(-2); // -2 represents an ellipsis
      }

      // Add last page if not already included
      if (rightBound < totalPages) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Don't render pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center space-x-2">
      {showIcons && (
        <Button
          variant="outline"
          size="icon"
          onClick={goToFirstPage}
          disabled={currentPage === 1}
          className="h-8 w-8"
          aria-label="Go to first page"
        >
          <ChevronsLeftIcon className="h-4 w-4" />
        </Button>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={goToPreviousPage}
        disabled={currentPage === 1}
        className="h-8 w-8"
        aria-label="Go to previous page"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>

      <div className="flex items-center">
        {getPageNumbers().map((pageNumber, index) => {
          // Handle ellipsis
          if (pageNumber < 0) {
            return (
              <span
                key={`ellipsis-${pageNumber}-${index}`}
                className="mx-1 flex h-8 w-8 items-center justify-center text-sm"
              >
                ...
              </span>
            );
          }

          // Handle page numbers
          return (
            <Button
              key={`page-${pageNumber}`}
              variant={currentPage === pageNumber ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(pageNumber)}
              className="h-8 w-8"
              aria-label={`Page ${pageNumber}`}
              aria-current={currentPage === pageNumber ? "page" : undefined}
            >
              {pageNumber}
            </Button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={goToNextPage}
        disabled={currentPage === totalPages}
        className="h-8 w-8"
        aria-label="Go to next page"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>

      {showIcons && (
        <Button
          variant="outline"
          size="icon"
          onClick={goToLastPage}
          disabled={currentPage === totalPages}
          className="h-8 w-8"
          aria-label="Go to last page"
        >
          <ChevronsRightIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
