// Reusable pagination + sorting controls, driven by a Spring Page payload.
export default function Pagination({ pageData, setPage, sort, changeSort, sortOptions }) {
  const { number = 0, totalPages = 0, totalElements = 0 } = pageData

  return (
    <div className="pagination">
      <div className="field">
        <label>Sort by</label>
        <select value={sort} onChange={(e) => changeSort(e.target.value)}>
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="pager">
        <button className="btn small secondary" disabled={number <= 0} onClick={() => setPage(number - 1)}>
          ‹ Prev
        </button>
        <span className="muted">
          Page {totalPages === 0 ? 0 : number + 1} of {totalPages} · {totalElements} total
        </span>
        <button className="btn small secondary" disabled={number >= totalPages - 1} onClick={() => setPage(number + 1)}>
          Next ›
        </button>
      </div>
    </div>
  )
}
