
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pagination">
      <span className="pagination-info">
        Showing {start}–{end} of {totalItems}
      </span>

      <div className="pagination-controls">
        <button
          type="button"
          className="button secondary"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <span className="pagination-page">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          className="button secondary"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
