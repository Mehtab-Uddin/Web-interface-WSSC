import { Pagination } from 'react-bootstrap';

export default function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 10,
  totalItems,
  onItemsPerPageChange,
  itemName = 'entries' // Optional: allows customization of item name (e.g., 'users', 'entries', 'items')
}) {
  // Handle page change
  const handlePageChange = (pageNumber) => {
    onPageChange(pageNumber);
  };

  if (totalPages <= 1 && !onItemsPerPageChange) return null;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const startItem = indexOfFirstItem + 1;
  const endItem = Math.min(indexOfLastItem, totalItems);

  return (
    <div className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <div className="text-muted">
          Showing {startItem} to {endItem} of {totalItems} {itemName}
        </div>
        {onItemsPerPageChange && (
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        )}
      </div>
      
      {totalPages > 1 && (
        <Pagination className="mb-0">
          <Pagination.First 
            onClick={() => handlePageChange(1)} 
            disabled={currentPage === 1}
          />
          <Pagination.Prev 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1}
          />
          {[...Array(totalPages)].map((_, index) => {
            const pageNumber = index + 1;
            // Show first page, last page, current page, and pages around current
            if (
              pageNumber === 1 ||
              pageNumber === totalPages ||
              (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
            ) {
              return (
                <Pagination.Item
                  key={pageNumber}
                  active={pageNumber === currentPage}
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </Pagination.Item>
              );
            } else if (
              pageNumber === currentPage - 2 ||
              pageNumber === currentPage + 2
            ) {
              return <Pagination.Ellipsis key={pageNumber} />;
            }
            return null;
          })}
          <Pagination.Next 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
          />
          <Pagination.Last 
            onClick={() => handlePageChange(totalPages)} 
            disabled={currentPage === totalPages}
          />
        </Pagination>
      )}
    </div>
  );
}

