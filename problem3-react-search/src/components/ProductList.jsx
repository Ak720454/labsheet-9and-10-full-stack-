import { useCart, formatMoney } from "../context/CartContext";

export default function ProductList({ items }) {
  const { dispatch } = useCart();

  return (
    <ul className="product-list">
      {items.map((product) => (
        <li key={product.id} className="product-card" data-testid="product-item">
          <h3>{product.name}</h3>
          <p className="price">${formatMoney(product.priceCents)}</p>
          <button data-testid="add-btn" onClick={() => dispatch({ type: "ADD", product })}>
            Add to cart
          </button>
        </li>
      ))}
    </ul>
  );
}
