// App entry point: loads products, renders the catalog and cart, and wires
// up navigation, scroll reveal, and the order form. Data lives in
// data/products.json, cart logic lives in cart.js, message building in order.js.

import { loadProducts } from "./products.js";
import * as cart from "./cart.js";
import { buildOrderMessage, buildWhatsAppUrl } from "./order.js";

let products = [];

function formatPrice(product) {
  return `${product.price} ${product.currency}`;
}

function createImageFallback(label) {
  const div = document.createElement("div");
  div.className = "product-card__image product-card__image--fallback";
  div.textContent = label;
  return div;
}

function renderProducts() {
  const container = document.getElementById("product-list");
  if (!container) return;
  container.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = product.id;

    const media = document.createElement("div");
    media.className = "product-card__media";

    const img = document.createElement("img");
    img.src = product.image;
    img.alt = product.name;
    img.className = "product-card__image";
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.replaceWith(createImageFallback(product.name));
    });
    media.appendChild(img);

    if (product.category === "coming-soon") {
      const badge = document.createElement("span");
      badge.className = "product-card__badge";
      badge.textContent = "Coming Soon";
      media.appendChild(badge);
    }

    const title = document.createElement("h3");
    title.className = "product-card__title";
    title.dir = "auto";
    title.textContent = product.name;

    const description = document.createElement("p");
    description.className = "product-card__description";
    description.dir = "auto";
    description.textContent = product.description || "";

    const price = document.createElement("p");
    price.className = "product-card__price";
    price.textContent = formatPrice(product);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "product-card__add";
    addButton.textContent = "Add to Cart";
    addButton.disabled = !product.available;
    addButton.addEventListener("click", () => {
      cart.addItem(product.id, 1);
      renderCart();
    });

    card.append(media, title, description, price, addButton);
    container.appendChild(card);
  });
}

function renderCart() {
  const list = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const countEl = document.getElementById("cart-count");
  const headerCountEl = document.getElementById("header-cart-count");
  if (!list || !totalEl || !countEl) return;

  const currentCart = cart.getCart();
  list.innerHTML = "";

  Object.entries(currentCart).forEach(([productId, qty]) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const item = document.createElement("li");
    item.className = "cart-item";

    const name = document.createElement("span");
    name.className = "cart-item__name";
    name.dir = "auto";
    name.textContent = product.name;

    const decreaseBtn = document.createElement("button");
    decreaseBtn.type = "button";
    decreaseBtn.className = "cart-item__step";
    decreaseBtn.textContent = "-";
    decreaseBtn.setAttribute("aria-label", `Decrease quantity of ${product.name}`);
    decreaseBtn.addEventListener("click", () => {
      cart.decrement(productId);
      renderCart();
    });

    const qtyEl = document.createElement("span");
    qtyEl.className = "cart-item__qty";
    qtyEl.textContent = String(qty);

    const increaseBtn = document.createElement("button");
    increaseBtn.type = "button";
    increaseBtn.className = "cart-item__step";
    increaseBtn.textContent = "+";
    increaseBtn.setAttribute("aria-label", `Increase quantity of ${product.name}`);
    increaseBtn.addEventListener("click", () => {
      cart.increment(productId);
      renderCart();
    });

    const lineTotal = document.createElement("span");
    lineTotal.className = "cart-item__line-total";
    lineTotal.textContent = `${product.price * qty} ${product.currency}`;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "cart-item__remove";
    removeBtn.textContent = "Remove";
    removeBtn.setAttribute("aria-label", `Remove ${product.name} from cart`);
    removeBtn.addEventListener("click", () => {
      cart.removeItem(productId);
      renderCart();
    });

    item.append(name, decreaseBtn, qtyEl, increaseBtn, lineTotal, removeBtn);
    list.appendChild(item);
  });

  const currency = products[0] ? products[0].currency : "EGP";
  const totalQty = cart.getTotalQuantity();
  totalEl.textContent = `${cart.getSubtotal(products)} ${currency}`;
  countEl.textContent = String(totalQty);
  if (headerCountEl) headerCountEl.textContent = String(totalQty);
}

function setOrderStatus(message, isError) {
  const statusEl = document.getElementById("order-status");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("order-status--error", Boolean(isError));
}

function handleOrderSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const customer = {
    name: form.elements["customer-name"].value.trim(),
    phone: form.elements["customer-phone"].value.trim(),
    address: form.elements["customer-address"].value.trim(),
  };

  const currentCart = cart.getCart();
  if (Object.keys(currentCart).length === 0) {
    setOrderStatus("Your cart is empty. Please add at least one product before checking out.", true);
    return;
  }

  const message = buildOrderMessage(customer, currentCart, products);

  try {
    const url = buildWhatsAppUrl(message);
    window.open(url, "_blank", "noopener");
    setOrderStatus("WhatsApp is opening with your order details ready to send.", false);
  } catch (err) {
    setOrderStatus("Ordering isn't available yet — the company WhatsApp number hasn't been configured.", true);
    console.error(err);
  }
}

function setupNavToggle() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setupScrollReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
}

function setupFooterYear() {
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

async function init() {
  try {
    products = await loadProducts();
  } catch (err) {
    console.error(err);
    products = [];
  }

  renderProducts();
  renderCart();
  setupNavToggle();
  setupScrollReveal();
  setupFooterYear();

  const orderForm = document.getElementById("order-form");
  if (orderForm) {
    orderForm.addEventListener("submit", handleOrderSubmit);
  }
}

document.addEventListener("DOMContentLoaded", init);
