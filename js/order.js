// Builds the order text message and the WhatsApp deep link.
// No data is ever sent to a server — the message is only encoded into a
// wa.me URL that opens the customer's own WhatsApp app/web client.

import { WHATSAPP_NUMBER } from "./config.js";

export function buildOrderMessage(customer, cartItems, products) {
  const lines = [];
  lines.push("New Order - KAZOZTA");
  lines.push("");
  lines.push(`Name: ${customer.name}`);
  lines.push(`Phone: ${customer.phone}`);
  lines.push(`Address: ${customer.address}`);
  lines.push("");
  lines.push("Products:");

  let total = 0;
  let currency = products[0] ? products[0].currency : "EGP";

  Object.entries(cartItems).forEach(([productId, qty]) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const lineTotal = product.price * qty;
    total += lineTotal;
    currency = product.currency;
    lines.push(`- ${product.name} x ${qty} = ${lineTotal} ${product.currency}`);
  });

  lines.push("");
  lines.push(`Total: ${total} ${currency}`);

  return lines.join("\n");
}

export function buildWhatsAppUrl(message) {
  if (!WHATSAPP_NUMBER) {
    throw new Error("WHATSAPP_NUMBER is not configured yet. Set it in js/config.js.");
  }
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
