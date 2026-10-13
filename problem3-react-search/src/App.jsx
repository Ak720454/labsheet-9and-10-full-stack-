import { useEffect, useState } from "react";
import { fetchProducts } from "./api/fetchProducts";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import ProductList from "./components/ProductList";
import Cart from "./components/Cart";

export default function App() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // debounced query that actually drives fetching
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  // When the (debounced) query changes, apply it AND reset to page 1 together.
  // Both updates are batched, so only ONE fetch happens.
  useEffect(() => {
    setSearchTerm(debouncedQuery);
    setPage(1);
  }, [debouncedQuery]);

  // Fetch whenever the applied term or page changes.
  // The cleanup aborts the previous request, so a slow response for "ab" can never
  // overwrite the results for "abc". The `aborted` check is a second safety net.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchProducts(searchTerm, page, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // superseded by a newer request
        setError("Something went wrong. Please try again.");
        setLoading(false);
      });

    return () => controller.abort();
  }, [searchTerm, page]);

  return (
    <div className="layout">
      <main>
        <h1>Product Search</h1>
        <input
          data-testid="search-input"
          type="search"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {loading && <p data-testid="loading" className="muted">Loading...</p>}
        {error && !loading && <p className="error">{error}</p>}
        {!loading && !error && result.items.length === 0 && <p data-testid="no-results">No results</p>}
        {!loading && !error && result.items.length > 0 && <ProductList items={result.items} />}

        <div className="pager">
          <button data-testid="prev-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>Page {page} of {result.totalPages}</span>
          <button data-testid="next-btn" disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </main>
      <Cart />
    </div>
  );
}
