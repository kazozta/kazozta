// Cart state management.
// The cart is stored as { [productId]: quantity } in sessionStorage, so it
// survives page navigation/reloads within the same browser tab session but
// clears when the tab is closed. sessionStorage may be unavailable (private
// browsing, disabled storage) — in that case the cart still works for the
// current page but won't persist across reloads.

const STORAGE_KEY = "kazozta_cart";

function readCart() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function writeCart(cart) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (err) {
    // Storage not available — cart keeps working in memory for this call only.
  }
}

export function getCart() {
  return readCart();
}

export function addItem(productId, quantity = 1) {
  const cart = readCart();
  cart[productId] = (cart[productId] || 0) + quantity;
  writeCart(cart);
  return cart;
}

export function removeItem(productId) {
  const cart = readCart();
  delete cart[productId];
  writeCart(cart);
  return cart;
}

export function setQuantity(productId, quantity) {
  const cart = readCart();
  if (quantity <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = quantity;
  }
  writeCart(cart);
  return cart;
}

export function increment(productId) {
  const cart = readCart();
  cart[productId] = (cart[productId] || 0) + 1;
  writeCart(cart);
  return cart;
}

export function decrement(productId) {
  const cart = readCart();
  if (!cart[productId]) return cart;
  cart[productId] -= 1;
  if (cart[productId] <= 0) delete cart[productId];
  writeCart(cart);
  return cart;
}

export function clearCart() {
  writeCart({});
  return {};
}

export function getTotalQuantity() {
  const cart = readCart();
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

export function getSubtotal(products) {
  const cart = readCart();
  return Object.entries(cart).reduce((sum, [productId, qty]) => {
    const product = products.find((p) => p.id === productId);
    return product ? sum + product.price * qty : sum;
  }, 0);
}
