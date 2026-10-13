import { useCart, formatMoney } from "../context/CartContext";

export default function Cart() {
  const { items, totalCents, dispatch } = useCart();

  return (
    <aside className="cart">
      <h2>Cart</h2>
      {items.length === 0 ? (
        <p className="muted">Your cart is empty.</p>
      ) : (
        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.id} data-testid="cart-item">
              <span className="cart-name">{item.name}</span>
              <span className="qty">
                <button aria-label={`Decrease ${item.name}`} data-testid="dec-btn" onClick={() => dispatch({ type: "DEC", id: item.id })}>-</button>
                <span data-testid="cart-qty">{item.qty}</span>
                <button aria-label={`Increase ${item.name}`} data-testid="inc-btn" onClick={() => dispatch({ type: "INC", id: item.id })}>+</button>
              </span>
              <span>${formatMoney(item.priceCents * item.qty)}</span>
              <button className="link" aria-label={`Remove ${item.name}`} onClick={() => dispatch({ type: "REMOVE", id: item.id })}>x</button>
            </li>
          ))}
        </ul>
      )}
      <p className="total">
        Total: $<span data-testid="cart-total">{formatMoney(totalCents)}</span>
      </p>
    </aside>
  );
}
