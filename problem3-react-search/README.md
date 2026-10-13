# Problem 3: React Product Search with Cart

```bash
npm install
npm run dev        # http://localhost:5173
```

| Requirement | How |
|---|---|
| Debounced search (300 ms) | `useDebouncedValue` hook: `setTimeout` + cleanup in `useEffect` |
| No stale responses | `AbortController` per request, aborted in the effect cleanup, plus an `aborted` check |
| Pagination | Next / Previous; page resets to 1 when the applied query changes; Previous disabled on page 1 |
| Cart | Add, `+`, `-` (qty 0 removes), remove, total |
| State management | `useReducer` (actions `ADD`, `INC`, `DEC`, `REMOVE`) + Context, no prop drilling |
| Persistence | Lazy initial state from `localStorage`; saved in an effect on every change |
| States | "Loading..." while fetching, "No results" for empty results |

Test hooks: `search-input`, `product-item`, `add-btn`, `next-btn`, `cart-total` (also `prev-btn`, `inc-btn`, `dec-btn`, `loading`, `no-results`).
`cart-total` holds only the number (for example `59.97`); the `$` sign is outside the element.

The mock `fetchProducts(query, page)` is in `src/api/fetchProducts.js` (random 100-800 ms delay, 6 items per page).
