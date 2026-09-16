// Loads product data from data/products.json.
// This is the only place product data is fetched — the UI never hard-codes products.

const PRODUCTS_URL = "data/products.json";

let cachedProducts = null;

export async function loadProducts() {
  if (cachedProducts) return cachedProducts;

  const response = await fetch(PRODUCTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load ${PRODUCTS_URL}: HTTP ${response.status}`);
  }

  cachedProducts = await response.json();
  return cachedProducts;
}

export function findProduct(products, productId) {
  return products.find((product) => product.id === productId) || null;
}
