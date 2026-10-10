# KAZOZTA Website

Static, dependency-free product website for KAZOZTA. Product ordering happens
by generating a pre-filled WhatsApp message; Cloudflare Pages Functions and D1
record a minimal order attempt and anonymous visit session for the dashboard.

This is the **technical foundation only**. The final visual design and UX
copy will be provided separately and layered on top of this structure.

## Folder structure

```
/
├── index.html          Page structure (semantic HTML, no hard-coded products)
├── assets/
│   ├── logo.png         KAZOZTA logo
│   └── coming-soon.png  Placeholder artwork (see "Known gap" below)
├── css/
│   └── styles.css       All styling. CSS variables for brand colors live here.
├── js/
│   ├── app.js            Wires everything together: renders products/cart, handles the order form
│   ├── products.js       Fetches and caches data/products.json
│   ├── cart.js            Cart state (add/remove/qty/totals), stored in sessionStorage
│   ├── order.js           Builds the order text and the wa.me WhatsApp link
│   └── config.js          Site configuration (WhatsApp number)
└── data/
    └── products.json    All product data
```

## Adding or editing products

Edit `data/products.json`. Nothing else needs to change — the page reads
this file at load time and renders whatever is in it.

Each product looks like:

```json
{
  "id": "coming-soon",
  "name": "قريبًا",
  "price": 0,
  "currency": "EGP",
  "image": "assets/coming-soon.png",
  "description": "",
  "category": "coming-soon",
  "available": true
}
```

- `id` — unique, no spaces, used internally by the cart. Never reuse an id for a different product.
- `name` — shown as the product title. Can be Arabic or English.
- `price` — a number, no currency symbol.
- `currency` — short code, e.g. `EGP`.
- `image` — path to an image file, relative to the site root (usually under `assets/`).
- `description` — optional short text.
- `category` — a free-text label, not used yet (reserved for future filtering).
- `available` — `true`/`false`. Setting it to `false` disables the "Add to Cart" button but still shows the product.

To add a real product, add another object to the JSON array. To remove one,
delete its object. To change a price, edit the `price` number.

## Changing the WhatsApp number

Open `js/config.js` and set:

```js
export const WHATSAPP_NUMBER = "201001234567"; // international format, digits only
```

It is currently empty on purpose — no number has been provided yet. Until
it's set, the "Send Order via WhatsApp" button shows an error instead of
opening WhatsApp.

## How the cart works

- Cart contents are kept in the browser's `sessionStorage` as
  `{ productId: quantity }`, so the cart survives page reloads/navigation
  within the same tab, but clears when the tab is closed.
- `js/cart.js` exposes: `addItem`, `removeItem`, `setQuantity`, `increment`,
  `decrement`, `clearCart`, `getCart`, `getTotalQuantity`, `getSubtotal`.
- `js/app.js` re-renders the cart list and totals after every cart change.

## How the WhatsApp ordering flow works

1. The customer fills in name, phone, and address, and adds products to the cart.
2. On submit, `js/order.js` builds a plain-text order summary (customer
   details, each product with quantity and line price, and the total).
3. The message is passed through `encodeURIComponent()` and appended to
   `https://wa.me/<WHATSAPP_NUMBER>?text=...`, which opens in a new tab.
4. Before opening WhatsApp, the site records products, quantities, prices,
   subtotal, and VAT in D1. It does not send customer name, phone, or address.
   This is an attempt only; the customer still has to press "Send" inside
   WhatsApp, and a staff member must confirm it in the dashboard. Prices from
   the browser are for dashboard tracking and are not a trusted accounting
   source.

## Known gap

`assets/coming-soon.png` is referenced by the placeholder product but does
**not exist yet** in the repository. The official KAZOZTA "Coming Soon"
artwork needs to be added at that path. Until then, the product card falls
back to showing the product name as plain text instead of a broken image.

## Deploying to Cloudflare Pages

This is a static site, so no build step is required. For a Cloudflare Pages project using Functions, use:

1. Connect this GitHub repository in the Cloudflare Pages dashboard.
2. Build command: `exit 0`.
3. Build output directory: `.` (repository root).
4. Production branch: `main`.

Because `index.html` uses `fetch()` to load `data/products.json` and
`<script type="module">`, the site must be served over `http(s)://`, not
opened directly as a `file://` path — use a local static server (e.g.
`npx serve` or `python3 -m http.server`) when testing locally.

## لوحة التحكم (Cloudflare Pages)

تمت إضافة واجهة إدارية عربية ومسارات Pages Functions لتسجيل زيارات الموقع ومحاولات الطلب قبل فتح واتساب، مع تأكيد الطلبات يدويًا وصلاحيات D1 ودخول Google OAuth. يلزم نشر الموقع عبر Cloudflare Pages لتشغيل الدوال؛ GitHub Pages يعرض الملفات الثابتة فقط. راجع [دليل الإعداد العربي](DASHBOARD_SETUP_AR.md). اترك الدومين الحالي دون تغيير حتى التحقق من رابط Pages التجريبي.
