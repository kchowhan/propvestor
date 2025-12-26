type Pagination = {
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
};

type PaginationControlsProps = {
  pagination?: Pagination;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  label?: string;
};

export const PaginationControls = ({
  pagination,
  page,
  limit,
  onPageChange,
  label = 'items',
}: PaginationControlsProps) => {
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) {
    return null;
  }

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <div>
        Showing {start} to {end} of {total} {label}
      </div>
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <button
          className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};
