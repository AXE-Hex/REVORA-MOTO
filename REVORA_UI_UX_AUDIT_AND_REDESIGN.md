# REVORA MOTO — UI/UX Audit & Redesign Implementation Specification

**Repository:** `AXE-Hex/Web`  
**Application:** REVORA MOTO  
**Stack:** Next.js 15 / React 19 / TypeScript / Supabase  
**Primary UI:** Arabic RTL + English LTR  
**Purpose:** Implementation brief for Codex based on live production inspection plus source-code UI/UX review.

---

## 1. Audit Scope

### Live production audit
Reviewed:
- Homepage
- Shop listing
- Motorcycles listing
- Motorcycle detail
- Search
- Fitment
- Authentication
- Cart route behavior
- Protected account/admin route behavior

### Source-code audit
Reviewed:
- Global CSS and design tokens
- Header, footer, mobile menu
- Authentication form
- Product and motorcycle cards
- Product and motorcycle detail pages
- Cart and checkout
- Search and filtering
- Account pages
- Wishlist
- Notifications
- Addresses
- Orders
- Fitment / My Garage
- Admin dashboard
- Admin Products
- Admin Motorcycles
- Admin Orders
- Admin Inventory
- Admin Customers
- Admin Promotions
- Admin Staff
- Admin Settings / Reports architecture

Protected Admin pages were not fully visually inspected because the TinyFish browser did not retain the authenticated Supabase session. Admin findings are therefore source-backed unless explicitly stated as live-observed.

---

# 2. Executive Summary

REVORA already has a strong premium motorcycle identity: dark surfaces, bold typography, large imagery, and a recognizable acid-lime brand accent.

The main problem is not the brand concept. The main problem is that the current interaction system is too sharp, too form-heavy, inconsistent in action semantics, and too close to a developer/admin interface in several customer and staff flows.

The redesign should preserve the dark premium motorcycle identity while moving to a **Soft Industrial / Precision Motorsport UI**:

- softer geometric corners;
- clearer visual hierarchy;
- semantic action colors;
- more deliberate spacing;
- fewer raw forms;
- fewer desktop tables on mobile;
- stronger card composition;
- better RTL behavior;
- modern drawers, segmented controls, tabs, and sticky action areas;
- clearer destructive vs positive actions;
- more polished empty states and feedback.

Do **not** turn the product into a generic rounded SaaS dashboard. It should remain visually distinctive and automotive/motorsport-oriented.

---

# 3. Critical / High Priority UX Problems

## 3.1 Cart route
Observed live:
- `/ar/cart` returned a 404 during browser testing.

Required:
- Verify route deployment and locale middleware behavior.
- Ensure Header cart icon always resolves to a valid localized route.
- Add automated route coverage for `/ar/cart` and `/en/cart`.

Acceptance:
- Both routes return 200.
- Empty cart renders a real empty-state UI, not 404.

## 3.2 Authenticated session persistence
Observed live:
- `/ar/account`
- `/ar/checkout`
- `/ar/admin`
redirected to `/ar/auth` in the automated session.

Required:
- Audit Supabase session cookies.
- Audit middleware refresh.
- Ensure Vercel production uses the same Supabase project/env.
- Preserve session through navigation and refresh.
- Preserve return URL when redirecting unauthenticated users.

## 3.3 Search
Observed live:
- Search produced non-standard transitions and did not consistently show a predictable results grid.

Source review:
- Products and motorcycles have separate totals but share one page index.

Required:
- Use a single coherent Search Results page.
- Add visible query heading and result counts.
- Use tabs such as `All`, `Motorcycles`, `Products`, `Brands` or independent sections.
- Avoid surprising direct redirects to detail pages.

---

# 4. Visual Direction

## Target style
**Soft Industrial / Precision Motorsport**

Use:
- dark graphite base;
- layered charcoal surfaces;
- acid-lime brand highlight;
- cool blue informational accent;
- red only for destructive/high-risk actions;
- rounded but not cartoonish geometry;
- subtle motorsport micro-details;
- soft borders instead of hard boxes;
- restrained shadows;
- controlled glow only for focus/active states;
- strong photography;
- compact technical metadata.

Avoid:
- 0–4px square corners everywhere;
- pill buttons everywhere;
- excessive glassmorphism;
- neon on every element;
- generic SaaS styling;
- using red for normal positive actions.

---

# 5. Color System

```css
:root {
  --bg: #0A0D0C;

  --surface-1: #101412;
  --surface-2: #161B18;
  --surface-3: #1D231F;
  --surface-hover: #232A25;

  --border-soft: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  --text-primary: #F4F7F3;
  --text-secondary: #B1BAB3;
  --text-muted: #7F8982;

  --brand: #DDF037;
  --brand-hover: #E7F65E;
  --brand-pressed: #C6D92E;
  --brand-foreground: #0B0E0C;

  --danger: #FF4D57;
  --danger-hover: #FF6871;
  --danger-pressed: #D93843;
  --danger-foreground: #FFFFFF;

  --success: #2ED47A;
  --success-hover: #44DE8C;
  --success-pressed: #1FA861;
  --success-foreground: #08110C;

  --warning: #F5B942;
  --warning-hover: #F8C65F;
  --warning-pressed: #D89A27;
  --warning-foreground: #171006;

  --info: #5B8CFF;
  --info-hover: #75A0FF;
  --info-pressed: #416ED6;
  --info-foreground: #FFFFFF;
}
```

## Semantic rule
**Red is not the universal confirmation color.**

Red means:
- delete;
- cancel destructive operation;
- revoke;
- refund;
- remove access;
- delete account;
- final confirmation in a destructive dialog.

Positive confirmation uses:
- brand lime for normal primary actions;
- green for explicit completion/approval states.

| Action | Style |
|---|---|
| Add to Cart | Brand Primary |
| Reserve Motorcycle | Brand Primary |
| Save Changes | Brand Primary |
| Create Product | Brand Primary |
| Apply | Brand Primary |
| Mark delivered | Success |
| Approve / Complete | Success |
| Delete Account | Danger |
| Delete Product | Danger |
| Cancel Order | Danger |
| Refund | Danger |
| Sign Out | Danger Soft |
| Clear Filters | Neutral Ghost |
| Back / Cancel dialog | Neutral Secondary |
| Warning override | Warning |
| View details | Neutral / Info |

---

# 6. Button System

## Base

```css
.button {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-weight: 700;
  letter-spacing: 0;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 120ms ease,
    box-shadow 160ms ease;
}

.button:active {
  transform: translateY(1px) scale(0.99);
}
```

### Brand Primary

```css
.button-primary {
  background: var(--brand);
  color: var(--brand-foreground);
  box-shadow: 0 8px 22px rgba(221, 240, 55, 0.10);
}

.button-primary:hover {
  background: var(--brand-hover);
  box-shadow: 0 10px 28px rgba(221, 240, 55, 0.16);
}
```

Text on lime buttons must be dark, not white.

### Danger

```css
.button-danger {
  background: var(--danger);
  color: var(--danger-foreground);
}

.button-danger:hover {
  background: var(--danger-hover);
}
```

### Danger Soft

```css
.button-danger-soft {
  background: rgba(255, 77, 87, 0.10);
  color: #FF7880;
  border-color: rgba(255, 77, 87, 0.22);
}
```

Use for sign out, remove, archive, secondary destructive actions.

### Success

```css
.button-success {
  background: var(--success);
  color: var(--success-foreground);
}
```

### Secondary

```css
.button-secondary {
  background: var(--surface-2);
  color: var(--text-primary);
  border-color: var(--border-soft);
}

.button-secondary:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}
```

### Ghost

```css
.button-ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
}

.button-ghost:hover {
  background: rgba(255,255,255,0.05);
  color: var(--text-primary);
}
```

### Google Button
Use:
- background `#F7F8F6`
- text `#111411`
- border `#E0E4E1`
- Google icon visible
- radius `14px`
- min-height `48px`

### Disabled

```css
.button:disabled {
  background: #232825;
  color: #6C756F;
  border-color: #2D3430;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 1;
}
```

---

# 7. Radius System

```css
:root {
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 30px;
}
```

| Component | Radius |
|---|---:|
| Badge/chip | 8–10px |
| Input | 14px |
| Button | 14px |
| Product card | 18px |
| Admin panel | 18–20px |
| Dropdown | 16px |
| Drawer | 22px |
| Modal | 24px |
| Large marketing panel | 26–30px |

Do not round every element equally.

---

# 8. Cards and Panels

```css
.panel,
.card {
  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,0.025),
      rgba(255,255,255,0)
    ),
    var(--surface-1);

  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);

  box-shadow:
    0 18px 50px rgba(0,0,0,0.20),
    inset 0 1px 0 rgba(255,255,255,0.03);
}
```

Hover:
- `translateY(-2px)`
- slightly brighter border
- no aggressive glow

---

# 9. Inputs / Forms

Required:
- 14px radius;
- min 46px height;
- clear labels;
- helper text;
- inline validation;
- required indicators;
- meaningful icons only;
- styled selects instead of raw browser controls.

```css
.input:focus {
  border-color: rgba(221,240,55,.75);
  box-shadow: 0 0 0 4px rgba(221,240,55,.10);
}
```

---

# 10. Arabic / RTL

Problems:
- Shop/Motorcycles filter placement behaves visually LTR.
- Breadcrumbs mix Arabic and English.
- letter-spacing/uppercase styles leak into Arabic.
- raw DB enum values can appear.

Required:
- Arabic sidebar on the right.
- Directional icons mirror correctly.
- Localize breadcrumb labels.
- Localize all status values.
- No uppercase/letter-spacing behavior on Arabic.

```css
[dir='rtl'] .button,
[dir='rtl'] .section-index,
[dir='rtl'] .topline,
[dir='rtl'] .card-kicker {
  letter-spacing: 0;
  text-transform: none;
}
```

---

# 11. Header

Upgrade to:
- sticky header;
- soft translucent dark surface;
- subtle border;
- active nav state;
- cart badge;
- profile menu;
- search overlay;
- wishlist shortcut where useful;
- notification badge when signed in.

Mobile:
- replace basic `<details>` with Drawer/Sheet;
- 48px touch targets;
- clear sections;
- language switch;
- account state.

---

# 12. Homepage

Keep current premium hero identity.

Add non-catalog sections:
- New / Used motorcycles
- Shop by category
- Find parts for your bike
- My Garage / Fitment CTA
- Why REVORA
- Brands
- Reservation process
- Services / warranty / support
- Featured products when available

Do not let empty catalog grids dominate the page.

---

# 13. Shop Listing

Problems:
- too many filters visible simultaneously;
- toolbar source does not wrap;
- mobile filters take too much vertical space;
- filters feel like raw forms.

Desktop:
- Arabic filters on right;
- English filters on left;
- sticky sidebar;
- collapsible groups;
- products count + sort.

Mobile:
- filter button;
- bottom sheet/drawer;
- selected count badge;
- sticky `Show N products`;
- `Clear all`.

---

# 14. Motorcycles Listing

Use same filter architecture as Shop.

Motorcycle cards emphasize:
- image;
- model;
- year;
- condition;
- engine;
- mileage when used;
- price;
- availability;
- reservation CTA.

Used motorcycles should support:
- mileage;
- service history;
- inspection status;
- owners;
- warranty if available.

---

# 15. Product Cards

Current issues:
- sale label not fully localized;
- mobile density too high;
- grid remains two columns at narrow widths.

At `<=480px`:
- use one column, or a purpose-built horizontal compact card.

Preferred:
- one-column premium cards.

Include:
- image
- brand/category
- localized sale badge
- name
- price
- old price
- discount %
- availability
- fitment state

---

# 16. Product Detail

Required:
- sticky purchase column on desktop;
- better discounted-price hierarchy;
- stock state;
- visual variants/chips/swatches when appropriate;
- dominant Add to Cart;
- fitment state next to CTA;
- cleaner review cards;
- gallery selected border uses global brand accent, not unrelated gold.

Prefer:
- `In stock`
- `Only 2 left` when low

Do not expose exact stock by default unless useful.

---

# 17. Motorcycle Detail

Required:
- localize YEAR / ENGINE / POWER / CONDITION / MILEAGE;
- localize enum values;
- stronger reservation CTA;
- clearer deposit block;
- sticky desktop reservation panel;
- sticky mobile bottom CTA.

Motorcycles should remain reservation-based, not normal cart products.

---

# 18. Search

Search overlay:
- recent searches
- popular searches
- instant suggestions
- products
- motorcycles
- brands

Results:
- query title
- counts
- tabs
- filters
- no-result suggestions
- clear-filters action

Avoid one shared pagination state across unrelated datasets unless unified.

---

# 19. Fitment / My Garage

Make this a flagship feature.

```text
What do you ride?

Brand
Model
Year
Variant

[Save Motorcycle]
```

Saved bike:

```text
Yamaha
YZF-R1 · 2025

ACTIVE MOTORCYCLE

[Shop compatible parts]
```

Product cards should show:
- `Fits your Yamaha R1`
- incompatibility where relevant

Initial Fitment state must have:
- explanation
- 3-step visual guide
- example result
- My Garage CTA

---

# 20. Cart

First fix/verify live route.

Replace raw responsive table approach with commerce layout.

Desktop:
- product rows/cards
- image
- variant
- quantity stepper
- price
- remove
- sticky summary

Mobile:
- product cards
- no squeezed table

Add:
- quantity control
- promo
- shipping estimate
- clear checkout CTA

---

# 21. Checkout

Use:
1. Cart
2. Delivery
3. Payment
4. Review

Desktop:
- form left
- sticky summary right

Mobile:
- step indicator
- collapsible summary
- sticky primary CTA

Addresses and payment methods should use selectable cards.

Do not imply a real payment provider is active while the system is still sandbox-only.

---

# 22. Authentication

Confirmed source issues:
- forgot-password state has poor route back to sign-in;
- raw Supabase errors can appear;
- Google button contrast is weak;
- no password visibility toggle.

Required:
- explicit Sign In / Sign Up / Reset states
- Back to sign in
- localized error mapping
- show/hide password
- spinner + loading text
- improved Google button
- divider
- redirect-back after successful auth

Never show raw Supabase error strings to customers.

---

# 23. Account Area

Replace generic link grid with proper Account shell.

Desktop:
- sidebar
- overview workspace

Mobile:
- profile header
- section cards

Sections:
- Overview
- Orders
- Reservations
- Addresses
- My Garage
- Wishlist
- Returns
- Warranty
- Notifications
- Security
- Sign out

Sign Out:
- Danger Soft

Delete Account:
- dedicated Danger Zone
- solid red final confirmation

---

# 24. Orders

Customer orders should use cards instead of primarily raw tables.

Card:
- order number
- date
- localized status
- total
- item count
- View details
- Track order

Detail timeline:
- placed
- payment confirmed
- processing
- shipped
- delivered

---

# 25. Wishlist

Current source design is too text-only.

Reuse real ProductCard / MotorcycleCard:
- image
- name
- price
- availability
- Add to Cart / Reserve
- Remove

---

# 26. Notifications

Current cards consume too much vertical space.

Use compact list:
- unread dot
- title
- summary
- timestamp
- contextual icon

Add:
- mark all as read
- unread header badge

---

# 27. Addresses

For Egyptian checkout:
- recipient name
- mobile
- governorate
- city/markaz
- area
- street
- building
- floor/apartment
- landmark
- default toggle

Add:
- Edit
- Delete
- Set default

Use address cards.

---

# 28. Status System

Never render raw DB enums directly.

Create shared `StatusBadge`.

Examples:

```text
pending_payment -> في انتظار الدفع
paid            -> تم الدفع
processing      -> جاري التجهيز
shipped         -> تم الشحن
delivered       -> تم التسليم
cancelled       -> ملغي
refunded        -> تم الاسترجاع
```

Color:
- pending -> warning
- paid -> info/success
- processing -> info
- shipped -> info
- delivered -> success
- cancelled/refunded -> danger or danger-soft

---

# 29. Admin Architecture

High-impact redesign area.

Current Admin should no longer reuse storefront layout as its primary shell.

Create dedicated Admin shell:

```text
┌──────────────────────────────────────────────────────────┐
│ REVORA ADMIN             Search      Alerts      Owner  │
├───────────────┬──────────────────────────────────────────┤
│ Overview      │                                          │
│               │ Main workspace                           │
│ Commerce      │                                          │
│  Orders       │                                          │
│  Reservations │                                          │
│  Returns      │                                          │
│               │                                          │
│ Catalog       │                                          │
│  Products     │                                          │
│  Motorcycles  │                                          │
│  Categories   │                                          │
│  Brands       │                                          │
│               │                                          │
│ Operations    │                                          │
│  Inventory    │                                          │
│  Suppliers    │                                          │
│               │                                          │
│ Customers     │                                          │
│ Staff         │                                          │
│ Reports       │                                          │
│ Settings      │                                          │
└───────────────┴──────────────────────────────────────────┘
```

Do not show normal storefront footer inside Admin.

---

# 30. Admin Navigation Grouping

### Overview
- Dashboard
- Reports

### Commerce
- Orders
- Reservations
- Returns
- Warranties
- Promotions

### Catalog
- Products
- Motorcycles
- Categories
- Brands
- Fitment
- Reviews

### Operations
- Inventory
- Suppliers
- Branches
- Fulfillment

### Customers
- Customers
- Support

### Access
- Staff
- Roles
- Audit Logs

### System
- Site Settings

---

# 31. Admin Dashboard

Replace generic card grid with operational dashboard:
- Revenue
- Orders
- Reservations
- Customers
- Pending orders
- Low stock
- Returns requiring action
- Recent activity
- Top products
- Branch performance where available

Cards should be actionable, not only decorative.

---

# 32. Admin Products

New list page:

```text
Products                                  [+ Add Product]

[Search products...] [Category] [Status] [Stock]

IMAGE | PRODUCT | SKU | PRICE | STOCK | STATUS | ACTIONS
```

Actions:
- Edit
- Preview
- Duplicate
- Archive
- Delete only where allowed

Danger actions must be red.

---

# 33. Product Editor

Split into:
- Overview
- Pricing
- Inventory
- Variants
- Media
- Fitment
- SEO
- History

Sticky save area:

```text
Unsaved changes                 [Discard] [Save changes]
```

Save = brand lime  
Discard = neutral  
Delete = danger

---

# 34. Motorcycle Editor

Tabs:
- Overview
- Specifications
- Pricing
- Condition
- Media
- Branch
- Reservation
- History

Used bikes:
- mileage
- owners
- inspection
- accident history
- service history
- notes

---

# 35. Admin Tables

All tables:
- rounded container
- sticky header where useful
- row hover
- bulk select
- empty state
- status badges
- pagination footer

Mobile:
- responsive cards where possible
- horizontal scroll only as fallback

---

# 36. Destructive Actions

All destructive operations must use consistent semantics.

Example:

```text
Delete this product?

This action may remove the product from active listings.
This cannot be undone.

[Keep product]          [Delete product]
```

Keep = neutral  
Delete = solid red

Refund:
- danger/warning-danger
- show amount/reference
- require confirmation

---

# 37. Empty States

Do not use one generic state everywhere.

Examples:

Wishlist:
`You haven't saved anything yet.`
CTA: Explore shop

Orders:
`No orders yet.`
CTA: Start shopping

Search:
`No results for "...".`
Suggest removing filters / brand / price changes.

Inventory:
`No inventory records match these filters.`
CTA: Clear filters

Fitment:
`Add your motorcycle to discover compatible parts.`

---

# 38. Typography

Create:
```css
--font-display-en
--font-body-en
--font-display-ar
--font-body-ar
```

Keep strong display styling for marketing, but use a highly readable Arabic UI font for forms/body.

Move Google Fonts from CSS `@import` to `next/font`.

---

# 39. Motion

Use restrained motion:
- 120–180ms controls
- 180–240ms drawers
- subtle card lift
- tab indicator
- button press
- modal scale/fade

Respect:
```css
@media (prefers-reduced-motion: reduce)
```

---

# 40. Accessibility

Minimum:
- 44x44 touch targets
- visible focus
- semantic labels
- proper button types
- focus-trapped dialogs
- keyboard accessible dropdowns
- status not communicated only by color
- `aria-live` for async feedback
- proper alt text
- sufficient contrast

---

# 41. Responsive Breakpoints

Use deliberate small-device behavior:
- `<=480px`
- `481–760px`
- `761–1000px`
- desktop

At `<=480px`:
- one-column premium cards
- filter sheet
- sticky CTA
- smaller heading scale
- 16–18px page padding
- no giant tables

---

# 42. Implementation Order for Codex

## Phase 1 — Foundations
1. Semantic design tokens
2. Radius system
3. Button variants
4. Input/Select/Textarea system
5. StatusBadge
6. Arabic typography rules
7. `next/font`

## Phase 2 — Global shell
1. Header
2. Mobile drawer
3. Footer
4. Active navigation
5. Empty/error/loading states

## Phase 3 — Commerce
1. Fix cart route
2. Shop filters
3. Motorcycle filters
4. Cards
5. Search
6. Product detail
7. Motorcycle detail
8. Cart
9. Checkout

## Phase 4 — Account
1. Account shell
2. Orders
3. Wishlist
4. Addresses
5. Notifications
6. Garage/Fitment

## Phase 5 — Admin
1. Dedicated Admin layout
2. Sidebar grouping
3. Dashboard
4. Products
5. Motorcycles
6. Orders
7. Inventory
8. Customers
9. Promotions
10. Staff/Roles
11. Settings
12. Reports

## Phase 6 — QA
1. RTL
2. LTR
3. Desktop
4. Tablet
5. 390px mobile
6. Keyboard
7. Contrast
8. Route tests
9. Auth session tests
10. Visual regression screenshots

---

# 43. Non-Negotiable Acceptance Criteria

Codex must not consider the redesign complete until:

- no primary customer route returns unexpected 404;
- authenticated session persists;
- Arabic filters follow RTL;
- Arabic has no English-style letter spacing;
- destructive actions use danger semantics;
- normal positive confirmations are not red;
- cards/panels no longer look excessively sharp;
- buttons have consistent height, radius, text contrast, hover, press, focus, disabled states;
- mobile grids remain readable;
- mobile filters use drawer/sheet;
- cart is not a squeezed desktop table;
- checkout has clear steps;
- raw Supabase/database errors are not shown;
- raw DB statuses are localized;
- Admin has dedicated shell;
- storefront footer/nav are not primary Admin shell;
- Product/Motorcycle editors are split into manageable sections;
- all important pages have meaningful empty/loading/error states;
- REVORA still looks distinctive, not generic.

---

# 44. Codex Execution Instruction

Implement this redesign in the existing repository. Do not create a new app.

Rules:
- preserve existing business logic and Supabase schema unless a safe supporting change is genuinely required;
- do not use fake production data;
- do not remove working features;
- do not weaken auth/RLS/security;
- do not expose server-side secrets;
- do not seed production;
- keep Arabic and English fully supported;
- reuse shared components;
- prefer design tokens and typed variants;
- run lint, type checks, tests, and production build after each major phase;
- add/update tests for routes and critical interactions;
- document backend limitations rather than inventing backend behavior;
- require explicit confirmation for destructive actions;
- do not perform destructive operations against live production data during testing.

The final result should feel like a premium modern motorcycle commerce platform with soft industrial geometry, strong action semantics, and a distinctive REVORA visual identity.


---

# 45. Additional Requirement — Redesign the Shopping / Purchase Experience

Add a full redesign of the **shopping and purchase presentation layer**, especially product cards, listing badges, promotional markers, and product-state indicators.

This applies to:
- homepage featured commerce sections;
- shop listing cards;
- search result cards;
- wishlist cards;
- related product cards;
- cart previews / mini-cart if added later;
- product detail hero media area.

The goal is to make commercial states immediately visible without forcing the user to read the card line by line.

## 45.1 Product State / Commerce Badge System

Introduce a reusable **BadgeStrip / CommerceBadge** system that can appear:
- above the image;
- over the top edge of the card;
- or as a corner ribbon where appropriate.

### Primary rule
Badges must be:
- visually strong;
- short;
- localized;
- consistent;
- limited in number (avoid clutter).

### Recommended placement
#### A. Top ribbon / top strip
Use for the most important commercial state:
- discount;
- new;
- sold out / out of stock;
- limited;
- bestseller.

#### B. Small secondary chips
Use below or over the image for:
- fitment;
- branch;
- used/new condition;
- reserved;
- low stock.

---

## 45.2 Badge Types

### Discount badge
If a product has a discount, show a **red strip above the image/card**.

Examples:
- `خصم 15%`
- `-15%`
- `SALE 15%`

Arabic preferred:
```text
خصم 15%
```

Color:
- background: `#FF4D57`
- text: `#FFFFFF`

Behavior:
- show original price struck through;
- show discounted price prominently;
- show percentage in the red strip.

Example layout:
```text
[ خصم 15% ]   ← red strip

[ product image ]

AGV Pista GP RR
15,900 EGP
18,500 EGP
```

### New badge
If a product or motorcycle is newly added or marked as new, show:

```text
جديد
```

Recommended style:
- background: acid-lime or cool-blue depending hierarchy
- text:
  - if lime background -> dark text
  - if blue background -> white text

Preferred:
- lime for standard “new”
- red remains reserved mainly for discount/destructive states

### Bestseller badge
If item is high-performing:
```text
الأكثر طلبًا
```

Recommended:
- background: `#F5B942`
- text: dark

### Limited stock badge
Examples:
- `كمية محدودة`
- `تبقى 2 فقط`

Recommended:
- background: warning amber
- text: dark

### Out of stock badge
Examples:
- `غير متوفر`
- `نفدت الكمية`

Recommended:
- background: neutral dark or desaturated red
- text: white

### Reserved badge (for motorcycles)
Examples:
- `محجوز`
- `قيد الحجز`

Recommended:
- background: muted neutral / warning
- text: white or dark depending contrast

### Used / New condition badge for motorcycles
Examples:
- `مستعملة`
- `جديدة`

Use:
- `جديدة` -> brand/lime or success-soft
- `مستعملة` -> neutral steel / blue-gray

---

## 45.3 Badge Priority Rules

Only one **top primary strip** should appear at a time, chosen by priority.

Priority order:
1. Out of stock
2. Discount
3. Reserved
4. New
5. Bestseller
6. Limited stock

Secondary badges may still appear as compact chips if needed.

Example:
- If a product is discounted and new, the top strip should show:
  `خصم 15%`
- Then a small chip can show:
  `جديد`

Do not stack 4 large ribbons on a single card.

---

## 45.4 Card Composition Upgrade

Every commerce card should support:

1. Top commerce badge strip
2. Large clean image area
3. Brand or category micro-label
4. Product name
5. Price block
6. Availability / compatibility / condition
7. Primary CTA

### Price block states

#### Normal price
```text
1,950 EGP
```

#### Discounted price
```text
1,650 EGP
1,950 EGP
```

Where:
- discounted price is larger and brighter;
- old price is smaller, muted, and struck through.

### Card CTA
Examples:
- `أضف إلى السلة`
- `احجز الآن`
- `عرض التفاصيل`

Use one main CTA only.
Avoid showing too many equal-priority buttons on the card itself.

---

## 45.5 Shopping Cart / Purchase UI Redesign

Expand the cart/checkout redesign section with richer visual commerce cues.

### Cart item card should show
- product image
- badge if discounted
- title
- variant
- price
- old price if discounted
- quantity control
- line total
- remove action
- stock/availability note if relevant

### Mini message examples
- `تم تطبيق الخصم`
- `هذا المنتج عليه خصم 15%`
- `آخر قطعتين`
- `لا يتوافق مع دراجتك النشطة` (if fitment applies)

### Order summary
Add:
- subtotal
- total savings
- shipping
- final total

If discounts exist, explicitly show:

```text
إجمالي التوفير
-250 EGP
```

This improves perceived value and purchase confidence.

---

# 46. Commerce Badge Design Tokens

Add dedicated tokens:

```css
:root {
  --badge-discount-bg: #FF4D57;
  --badge-discount-fg: #FFFFFF;

  --badge-new-bg: #DDF037;
  --badge-new-fg: #0B0E0C;

  --badge-bestseller-bg: #F5B942;
  --badge-bestseller-fg: #171006;

  --badge-limited-bg: #F5B942;
  --badge-limited-fg: #171006;

  --badge-outofstock-bg: #424B45;
  --badge-outofstock-fg: #FFFFFF;

  --badge-used-bg: #5B6672;
  --badge-used-fg: #FFFFFF;

  --badge-info-bg: #5B8CFF;
  --badge-info-fg: #FFFFFF;
}
```

---

# 47. Required Badge Components

Codex should create reusable components, for example:

- `CommerceBadge`
- `BadgeStrip`
- `StatusChip`
- `PriceBlock`
- `ProductStateStack`

These components must be reusable across:
- homepage;
- shop listing;
- motorcycles listing;
- search;
- wishlist;
- product detail;
- cart;
- related products;
- admin preview cards where useful.

---

# 48. Badge Localization Rules

All badge text must be localized.

Arabic examples:
- `خصم 20%`
- `جديد`
- `الأكثر طلبًا`
- `كمية محدودة`
- `غير متوفر`
- `محجوز`
- `مستعملة`
- `جديدة`

English examples:
- `20% OFF`
- `NEW`
- `BESTSELLER`
- `LIMITED`
- `OUT OF STOCK`
- `RESERVED`
- `USED`
- `NEW`

Do not leave commerce ribbons in English while the surrounding card is Arabic.

---

# 49. Additional Acceptance Criteria for Commerce Redesign

Codex must not consider the shopping redesign complete until:

- discounted products visibly show a red discount strip with percentage;
- new items visibly show a “new” badge;
- additional useful states (bestseller, limited, out of stock, reserved, used/new condition) are implemented;
- card layouts remain uncluttered;
- badge priority prevents visual overload;
- cart and order summary clearly display discounts and savings;
- badges are localized in Arabic and English;
- badge colors are semantically consistent;
- commerce badges are reusable components rather than page-specific hacks.


---

# 50. Reservation Flow Redesign

The motorcycle reservation flow needs a complete guided experience.

## Required flow

1. Motorcycle selected
2. Branch selection
3. Customer information
4. Deposit/payment method
5. Review reservation
6. Confirmation

Desktop:
- stepper at top;
- main form area;
- sticky motorcycle/reservation summary.

Mobile:
- compact step indicator;
- sticky bottom CTA;
- collapsible summary.

## Reservation summary must show
- motorcycle image;
- model/year;
- condition;
- branch;
- deposit;
- reservation status;
- next step.

## Success state
After successful reservation creation, show a dedicated success screen:

```text
تم تسجيل حجزك

رقم الحجز
RV-R-10293

Yamaha YZF-R1 · 2025
فرع القاهرة

العربون: 25,000 EGP

[عرض الحجز]
[العودة إلى الدراجات]
```

Do not finish the flow with a plain redirect or generic notice.

---

# 51. Motorcycle Comparison Page

The app already supports adding motorcycles to comparison. Build a real comparison experience.

## Requirements
- compare up to the supported maximum;
- fixed motorcycle header cards;
- image, name, year, condition, price;
- row-by-row specs;
- highlight differences;
- optional `Show differences only`;
- remove motorcycle from comparison;
- add another motorcycle;
- sticky first column/headers on desktop where useful;
- horizontal swipe/scroll on mobile;
- avoid unreadably compressed tables.

## Comparison rows
Examples:
- Price
- Year
- Condition
- Engine
- Power
- Mileage
- Transmission
- Fuel
- Weight
- Seat height
- Warranty
- Availability
- Branch
- Deposit

CTA per motorcycle:
- View details
- Reserve

Use brand-lime for normal primary CTA.

---

# 52. Reviews UX

Improve reviews beyond a simple list.

## Product review summary
Show:
- average rating;
- total review count;
- rating distribution (5 to 1 stars);
- verified-purchase count when applicable.

## Filters
Allow:
- Most recent
- Highest rating
- Lowest rating
- Verified purchase only

## Review card
- rating;
- body;
- verified-purchase badge;
- date;
- useful metadata;
- images only if backend supports them.

Do not invent reviewer avatars or images.

## Writing a review
- star selector;
- character guidance;
- order reference shown in user-friendly form;
- moderation/pending state;
- success confirmation.

---

# 53. Returns and Refunds UX

Create a customer-facing return flow.

## Customer flow
1. Select eligible order
2. Select item(s)
3. Select reason
4. Add details
5. Review request
6. Submit
7. Track status

## Return statuses
Examples:
- Requested
- Under review
- Approved
- Rejected
- Item received
- Refund processing
- Refunded

All statuses must be localized and use the shared status system.

## Admin
Admin Returns should include:
- request details;
- order reference;
- items;
- reason;
- evidence where supported;
- status history;
- refund state;
- staff notes;
- destructive/high-risk controls styled correctly.

---

# 54. Warranty UX

Customer warranty area should support:
- warranty-covered purchases;
- product/motorcycle;
- warranty start/end dates;
- remaining period;
- terms link;
- claim/service request;
- current claim status.

Admin:
- warranty case list;
- customer/order reference;
- coverage;
- status timeline;
- staff notes.

Do not claim coverage that is not stored in backend data.

---

# 55. Global Toast / Feedback System

Create a shared toast/feedback system.

Use for:
- Saved successfully
- Added to cart
- Removed from wishlist
- Copied
- Updated
- Upload complete
- Error
- Permission denied

Types:
- success
- error
- warning
- info

Rules:
- brief;
- localized;
- keyboard accessible;
- `aria-live`;
- not used for critical confirmations;
- destructive actions still require a modal/dialog.

Avoid showing raw server/Supabase errors.

---

# 56. Loading / Skeleton System

Replace blank loading states and generic `Loading...` text with structured skeletons.

Create reusable:
- ProductCardSkeleton
- MotorcycleCardSkeleton
- TableSkeleton
- DetailSkeleton
- DashboardMetricSkeleton
- FormSectionSkeleton

Rules:
- preserve final layout dimensions where possible;
- prevent layout shift;
- respect reduced-motion settings;
- do not use aggressive shimmer.

---

# 57. Error Pages — 403 / 404 / 500

Create branded error experiences.

## 403
For authenticated users without permission:

```text
ليس لديك صلاحية للوصول إلى هذه الصفحة.
```

Actions:
- Back
- Admin overview / account as appropriate

Do not always hide authorization problems behind 404 unless there is a specific security requirement.

## 404
Use REVORA visual language:
- clear message;
- search;
- Home;
- Shop;
- Motorcycles.

## 500
Show:
- clear non-technical message;
- Retry;
- Home;
- support/contact path.

Never expose stack traces or internal error messages.

---

# 58. Permission-Aware Admin UI

Admin UI must reflect permissions before the user clicks.

Examples:
- hide actions that are completely unavailable;
- disable actions where visibility is useful but execution is not allowed;
- show a clear tooltip/reason;
- never rely only on frontend hiding for security.

Backend/RLS/authorization remains authoritative.

Examples:
- employee without `products.write` should not see enabled Edit/Delete actions;
- employee without refund permission must not get active Refund controls.

---

# 59. Image Management States

Build consistent media management UX.

Support:
- upload progress;
- upload failure;
- retry;
- cover image;
- reorder;
- delete;
- alt text;
- image preview;
- empty media state.

Product/motorcycle editor should clearly show:
- Cover
- Gallery
- Variant-specific image where relevant

Do not use destructive red as the dominant visual across the whole gallery; use it only for delete/remove.

---

# 60. Success Screens

Major workflows require explicit success screens/states.

Examples:
- Order placed
- Reservation created
- Return submitted
- Warranty request submitted
- Password reset email sent

Each should include:
- success state;
- reference number where relevant;
- what happens next;
- next actions.

---

# 61. Unsaved Changes Protection

Apply to all large editors, not only Products.

Include:
- Product editor
- Motorcycle editor
- Promotions
- Settings
- Staff permissions
- large account forms where relevant

When dirty:
- show sticky `Unsaved changes`;
- Save;
- Discard;
- warn before route leave/close where feasible.

Do not show warnings if nothing changed.

---

# 62. Date / Currency / Number Formatting

Create centralized formatting utilities.

## Currency
Use consistent EGP formatting.

Arabic example:
`15,900 ج.م` or the selected consistent product convention.

English example:
`EGP 15,900`

Choose one convention per locale and use it everywhere.

## Dates
Arabic:
- Arabic/Egypt locale
English:
- en-GB or selected product locale

## Numbers
Avoid inconsistent raw DB numbers.

Use centralized:
- `formatCurrency`
- `formatDate`
- `formatNumber`
- `formatPercent`
- `formatDistance`

---

# 63. Admin Bulk Actions

Where safe and useful, support selecting multiple records.

Examples:
- Products
- Orders
- Inventory
- Customers where appropriate

Actions:
- Archive
- Publish/unpublish
- status update
- export

Rules:
- show selected count;
- use confirmation for risky actions;
- respect permission system;
- do not add bulk destructive operations unless business logic safely supports them.

---

# 64. Admin Activity / Audit Log UX

Do not render raw logs as an unreadable table.

Add:
- actor;
- action;
- entity;
- timestamp;
- concise change summary;
- filters;
- search;
- details drawer.

Filters:
- staff member
- entity type
- action type
- date range

Never expose secrets in audit log rendering.

---

# 65. Global Admin Search

Add a global Admin search/command experience.

Search across supported:
- orders;
- products;
- motorcycles;
- customers;
- reservations.

Results should identify entity type clearly.

Example:
```text
Order #RV-10293
Customer: Ahmed ...

Yamaha R1 2025
Motorcycle

AGV Pista GP RR
Product
```

Do not implement backend-wide search if the required indexed queries do not exist; document missing backend support instead.

---

# 66. Keyboard / Power User UX

For Admin only where useful:

Suggested shortcuts:
- `/` focus global search
- `Esc` close modal/drawer
- standard arrow/tab keyboard navigation
- optional command palette later

Do not introduce complex shortcuts that conflict with browser defaults or accessibility.

---

# 67. Sticky Action Bars

Long admin forms need persistent actions.

Example:

```text
Unsaved changes                     [Discard] [Save changes]
```

Desktop:
- sticky bottom/top action bar.

Mobile:
- compact sticky bottom actions.

Use:
- Save = brand primary
- Discard = neutral
- Delete = separate danger action, not placed directly beside Save without visual separation.

---

# 68. Responsive Dialog / Drawer Strategy

Desktop:
- center dialog for confirmation and focused edits.

Mobile:
- bottom sheet or full-screen sheet for long selections/forms.

Required:
- focus management;
- Escape support;
- swipe/close only if it does not risk losing data;
- safe-area padding;
- sticky actions.

---

# 69. Visual Consistency QA

Create a final visual consistency pass.

No page should define random standalone:
- button colors;
- radii;
- badge colors;
- input borders;
- shadows;
- status colors;
- spacing values

without using the shared design system unless there is a documented reason.

Review:
- button variants;
- card radii;
- modal radii;
- input states;
- icon sizes;
- badge hierarchy;
- spacing rhythm;
- heading scale;
- Arabic/English typography;
- responsive behavior.

---

# 70. Additional Acceptance Criteria

The redesign is not complete until:

- reservation flow has clear steps and success state;
- comparison page is usable on desktop and mobile;
- reviews have summary/distribution and proper cards;
- returns/refunds have customer tracking and Admin workflow;
- warranty UI uses real backend data only;
- toast system is shared and localized;
- important pages have skeleton states;
- 403/404/500 are branded and useful;
- Admin actions reflect permissions before interaction;
- media upload/reorder/failure states are designed;
- major actions show meaningful success screens;
- large editors warn about unsaved changes;
- money/date/number formatting is centralized;
- supported bulk actions use shared patterns;
- audit logs are readable and filterable;
- Admin global search is implemented only where backend support exists;
- long forms have sticky actions;
- mobile dialogs use an appropriate sheet strategy;
- no random page-specific UI styling bypasses the design system.


---

# 71. Authenticated Live Admin / Account Audit — Confirmed Findings

The authenticated TinyFish Browser Context Profile successfully opened and visually audited the protected areas.

## Pages successfully reviewed live

- `/ar/admin`
- `/ar/admin/products`
- `/ar/admin/motorcycles`
- `/ar/admin/orders`
- `/ar/admin/inventory`
- `/ar/admin/customers`
- `/ar/admin/promotions`
- `/ar/admin/staff`
- `/ar/admin/settings`
- `/ar/admin/reports`
- `/ar/account`
- `/ar/account/orders`
- `/ar/account/addresses`
- `/ar/account/wishlist`
- `/ar/account/notifications`
- `/ar/checkout`

These findings now supersede earlier uncertainty caused by the unauthenticated automation session.

---

## 71.1 Confirmed Critical Issues

### Staff RTL inconsistency
Observed live:
- Staff page headings are Arabic, but account/action sections still behave visually like LTR.
- Actions such as Assign Role / Remove Role do not feel integrated into the Arabic RTL flow.

Required:
- fully mirror alignment/layout for Arabic;
- localize action labels;
- ensure row/action groups follow RTL ordering;
- destructive role removal must use `danger` or `danger-soft`.

### Checkout empty state is styled like an error
Observed live:
- Empty cart/checkout state uses a dark red/error-like presentation.

Problem:
- an empty cart is not a system failure;
- red creates unnecessary alarm and damages purchase-flow tone.

Required:
- use a neutral empty state;
- use illustration/icon;
- explain what to do next;
- CTA: `استكشف المتجر`;
- reserve danger red for actual errors/destructive actions.

---

## 71.2 Confirmed High-Priority Issues

### Mixed Arabic / English in Admin
Observed particularly in:
- Settings
- Staff
- breadcrumbs
- action labels / placeholder values

Required:
- remove accidental English in Arabic locale;
- localize placeholders;
- localize actions;
- keep English only for intentional proper nouns, SKU, code, technical identifiers.

### Admin lacks persistent dedicated sidebar
Observed live:
- administration still depends too heavily on top-level navigation;
- navigation density will not scale as modules grow.

Required:
- implement the dedicated Admin shell already defined in this specification;
- persistent desktop sidebar;
- collapsible/Drawer navigation on mobile;
- grouped modules.

### Row actions are not discoverable enough
Observed in:
- Products
- Customers
- other management tables

Required:
- consistent Actions column or row menu;
- common options: View / Edit / Preview / Archive / Delete as allowed;
- use icon + accessible label/tooltip;
- permission-aware rendering;
- destructive actions visually distinct.

---

## 71.3 Confirmed Medium-Priority Issues

### Product and Motorcycle forms are too long
Observed live:
- long vertical single-column forms;
- excessive scrolling;
- weak grouping.

Required:
- convert to tabbed/grouped editors;
- use multi-column desktop form grids where appropriate;
- maintain single-column on mobile;
- sticky Save/Discard bar.

### Inventory forms may overflow / feel partially obscured
Observed live:
- Adjust Stock / Transfer interfaces did not fit cleanly in the visual audit.

Required:
- inspect overflow/width constraints;
- separate stock adjustment from transfer into clearly scoped panels/drawers;
- ensure no clipped inputs/actions;
- mobile uses bottom/full-screen sheet where needed.

---

## 71.4 Confirmed Button / Color Findings

### Brand lime is overused
Observed live:
- neon yellow/lime is effective but appears too often.

Problem:
- when everything is accented, nothing feels primary.

Required:
- reserve lime for primary actions, active states, and selected emphasis;
- secondary controls use neutral surface variants;
- informational actions use info/neutral;
- success actions use success;
- destructive actions use danger.

### Remove Role lacks strong destructive semantics
Observed live:
- Remove Role does not look sufficiently destructive.

Required:
- `danger-soft` for row-level removal;
- final confirmation button = solid `danger`;
- neutral cancel.

---

## 71.5 Confirmed Forms / Tables Findings

### Tables need better scalability
Observed live:
- Products and Customers are data-dense;
- filtering/sorting controls are limited.

Required:
- stronger search/filter/sort toolbar;
- sticky table header where useful;
- clear actions;
- status chips;
- pagination;
- column priority;
- mobile card/list transformation where practical.

### Desktop form layout wastes vertical space
Observed live:
- labels above controls are readable but long desktop forms become unnecessarily tall.

Required:
- keep labels above inputs;
- group related fields into 2-column desktop grids where appropriate;
- do not sacrifice scanability for density.

---

## 71.6 Confirmed Mobile Risks

Observed:
- Inventory/Product tables have too many columns for small screens.

Required:
- transform important rows into mobile cards;
- use horizontal scroll only as fallback;
- retain key action access;
- never shrink text/table columns until unreadable.

Positive:
- Account tile navigation provides large touch targets and works well as a mobile interaction pattern.

---

## 71.7 Confirmed RTL / Navigation Findings

### Navigation/icon grouping still feels LTR-centric
Observed:
- REVORA logo placement works in RTL;
- search/user/notification icon grouping still feels designed from an LTR structure.

Required:
- review header composition as an RTL layout, not merely text direction;
- ensure interaction hierarchy reads naturally from right to left.

### Breadcrumb language mixing
Observed:
- patterns similar to `ORDERS / ADMIN` mixed with Arabic headings.

Required:
- localize breadcrumb labels consistently.

---

## 71.8 Confirmed Strengths

Keep and preserve:
- dark premium identity;
- strong contrast;
- clean Arabic typography;
- generous spacing;
- recognizable REVORA visual character;
- large account tiles as mobile-friendly touch targets.

Do not erase these strengths during the redesign.

---

# 72. Updated Priority After Authenticated Audit

Codex should now execute in this order:

1. Fix RTL/localization defects in Staff and Admin.
2. Introduce semantic button/action colors, especially danger actions.
3. Build dedicated Admin shell/sidebar.
4. Add row-level actions to management tables.
5. Split Product/Motorcycle editors into tabs/grouped sections.
6. Fix Inventory form overflow/layout.
7. Redesign Checkout empty state as neutral, not destructive/error.
8. Improve Admin table filtering/sorting/responsiveness.
9. Reduce unnecessary brand-lime usage.
10. Perform a full mobile transformation of data-heavy Admin views.

These are confirmed from the authenticated production UI and should be treated as higher-confidence than source-only visual predictions.
