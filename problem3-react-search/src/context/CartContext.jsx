import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

const STORAGE_KEY = "cart-v1";

// ----- reducer: ADD, INC, DEC, REMOVE -----
export function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const { product } = action;
      const exists = state.some((i) => i.id === product.id);
      if (exists) return state.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...state, { id: product.id, name: product.name, priceCents: product.priceCents, qty: 1 }];
    }
    case "INC":
      return state.map((i) => (i.id === action.id ? { ...i, qty: i.qty + 1 } : i));
    case "DEC":
      // qty reaching 0 removes the item
      return state
        .map((i) => (i.id === action.id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0);
    case "REMOVE":
      return state.filter((i) => i.id !== action.id);
    default:
      return state;
  }
}

// Lazy initial state: read the saved cart from localStorage (survives refresh).
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or unavailable: ignore */
    }
  }, [items]);

  const totalCents = useMemo(() => items.reduce((sum, i) => sum + i.priceCents * i.qty, 0), [items]);
  const value = useMemo(() => ({ items, totalCents, dispatch }), [items, totalCents]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export const formatMoney = (cents) => (cents / 100).toFixed(2);
