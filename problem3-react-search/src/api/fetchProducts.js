// Mock API: resolves after a random 100-800 ms delay.
// Signature required by the assignment: fetchProducts(query, page).
// An optional third argument (AbortSignal) lets callers cancel the request.

export const PAGE_SIZE = 6;

const NAMES = [
  "Laptop", "Laptop Stand", "Laptop Sleeve", "Wireless Mouse", "Gaming Mouse", "Mouse Pad",
  "Mechanical Keyboard", "Keyboard Cover", "USB-C Hub", "USB Cable", "HDMI Cable", "Monitor 24 inch",
  "Monitor 27 inch", "Monitor Arm", "Webcam HD", "Webcam Cover", "Headphones", "Gaming Headset",
  "Bluetooth Speaker", "Smart Watch", "Fitness Band", "Phone Case", "Phone Charger", "Power Bank",
  "Tablet", "Tablet Stylus", "External SSD", "Flash Drive", "Router", "Desk Lamp",
  "Office Chair", "Standing Desk", "Notebook", "Ballpoint Pens", "Backpack", "Water Bottle",
];

const PRODUCTS = NAMES.map((name, i) => ({
  id: i + 1,
  name,
  priceCents: 499 + ((i * 1371) % 9000), // deterministic pseudo prices
}));

export function fetchProducts(query = "", page = 1, signal) {
  return new Promise((resolve, reject) => {
    const delay = 100 + Math.random() * 700;

    const timer = setTimeout(() => {
      const q = String(query).trim().toLowerCase();
      const matches = q ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(q)) : PRODUCTS;
      const start = (page - 1) * PAGE_SIZE;
      resolve({
        items: matches.slice(start, start + PAGE_SIZE),
        total: matches.length,
        page,
        totalPages: Math.max(1, Math.ceil(matches.length / PAGE_SIZE)),
      });
    }, delay);

    if (signal) {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }
  });
}
