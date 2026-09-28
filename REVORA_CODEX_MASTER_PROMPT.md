# MASTER CODEX PROMPT — REVORA MOTO UI/UX REDESIGN

You are working inside the existing REVORA MOTO repository.

Repository:
`AXE-Hex/Web`

Primary specification:
`REVORA_UI_UX_AUDIT_AND_REDESIGN.md`

Your task is to perform a complete, production-quality UI/UX redesign and remediation based on that specification.

Do not create a new application.
Do not replace the existing architecture blindly.
Do not remove working business logic.
Do not weaken authentication, authorization, Supabase RLS, or security controls.
Do not seed production or create fake production records.
Do not perform destructive actions against live production data.

---

## OBJECTIVE

Transform the current REVORA MOTO UI into a premium, modern motorcycle commerce platform using the design direction:

**Soft Industrial / Precision Motorsport**

The finished product must:
- preserve the existing dark premium REVORA identity;
- reduce the current overly sharp geometry;
- use a consistent radius system;
- use semantic action colors;
- improve Arabic RTL behavior;
- make mobile layouts intentionally designed rather than desktop layouts squeezed onto mobile;
- redesign commerce flows;
- redesign account flows;
- introduce a dedicated Admin shell;
- improve accessibility and loading/error/empty states;
- remain distinctive and automotive/motorsport-oriented rather than looking like a generic SaaS template.

The file `REVORA_UI_UX_AUDIT_AND_REDESIGN.md` is the authoritative UI/UX requirements document.
Read it completely before making changes.

---

# EXECUTION RULES

1. Start by auditing the current repository and mapping the implementation against the specification.
2. Do not immediately rewrite everything.
3. Identify reusable primitives first.
4. Implement in phases.
5. Keep every phase buildable and testable.
6. Reuse shared components and design tokens.
7. Remove duplicated page-specific styling where a shared primitive should exist.
8. Preserve existing routes and business behavior unless a route is confirmed broken.
9. When a requirement needs backend support that does not exist, document the gap instead of inventing fake behavior.
10. Never expose private/server-side keys to the browser.
11. Never display raw Supabase/database errors directly to users.
12. Do not use fake data to make empty interfaces look complete.
13. Keep Arabic and English fully supported.
14. Do not declare completion until all applicable acceptance criteria in the specification are satisfied.

---

# BEFORE IMPLEMENTATION

Perform a repository audit and create/update a tracking file such as:

`docs/UI_UX_REDESIGN_PROGRESS.md`

It must contain:

- current architecture;
- affected routes;
- shared components discovered;
- existing design tokens;
- current auth/session architecture;
- current responsive breakpoints;
- known broken routes;
- implementation phases;
- completed items;
- blocked items;
- backend dependencies;
- verification results.

Do not use this document as a substitute for implementation.

---

# DESIGN SYSTEM — REQUIRED

Create a shared semantic token system based on the specification.

The intended core palette is:

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

Use semantic variables instead of scattering raw colors throughout pages.

---

# ACTION COLOR SEMANTICS

Red is NOT the normal confirmation color.

Use Brand Primary for:
- Add to Cart
- Reserve Motorcycle
- Checkout
- Save
- Create
- Apply
- normal confirmations

Use Success for:
- Approve
- Complete
- Mark delivered
- explicitly successful state changes

Use Danger for:
- Delete
- Delete account
- Cancel order
- Refund
- Revoke access
- Remove staff
- destructive confirmations

Use Danger Soft for:
- Sign out
- Archive
- Remove
- lower-emphasis destructive actions

Use Neutral for:
- Back
- Cancel dialog
- Clear filters
- Secondary navigation

Use Warning for risky but non-destructive states.

---

# BUTTON SYSTEM

Build reusable typed button variants:

- primary
- secondary
- ghost
- danger
- danger-soft
- success
- warning
- icon

Minimum:
- 46px height on regular actions;
- 44px minimum touch target;
- 14px default radius;
- clear hover;
- pressed;
- focus-visible;
- disabled;
- loading.

Brand lime buttons must use dark text, not white.

Google auth button:
- light background;
- dark text;
- visible Google icon;
- 14px radius;
- 48px minimum height.

---

# RADIUS SYSTEM

Use:

```css
--radius-xs: 8px;
--radius-sm: 12px;
--radius-md: 16px;
--radius-lg: 22px;
--radius-xl: 30px;
```

Target:
- chips: 8–10px;
- input/button: 14px;
- product card: 18px;
- admin panel: 18–20px;
- drawer: 22px;
- modal: 24px;
- large marketing panel: 26–30px.

The result should be softer than the current sharp UI, but not overly pill-shaped.

---

# COMMERCE BADGES

Create reusable components:
- `CommerceBadge`
- `BadgeStrip`
- `StatusChip`
- `PriceBlock`
- `ProductStateStack`

Support:

## Discount
Top red strip:
`خصم 15%` / `15% OFF`

- red background;
- white text;
- original price struck through;
- discounted price prominent.

## New
`جديد` / `NEW`
Use brand lime with dark text.

## Bestseller
`الأكثر طلبًا` / `BESTSELLER`
Use warning amber.

## Limited
`كمية محدودة` / `LIMITED`
Use warning amber.

## Out of stock
`غير متوفر` / `OUT OF STOCK`
Use neutral/dark desaturated state.

## Reserved
`محجوز` / `RESERVED`
Use appropriate warning/neutral semantic state.

## Motorcycle condition
`جديدة` / `مستعملة`
Use brand/success-soft for new, steel/neutral for used.

Primary strip priority:
1. Out of stock
2. Discount
3. Reserved
4. New
5. Bestseller
6. Limited

Do not stack multiple large ribbons.

---

# RTL / ARABIC

Arabic must be first-class.

Required:
- filter sidebar appears on the right in Arabic;
- directional icons mirror correctly;
- breadcrumbs are localized;
- statuses are localized;
- raw DB enums never leak to users;
- no English-style letter spacing on Arabic;
- no uppercase transform on Arabic;
- layouts are reviewed at RTL, not merely text-aligned right.

Use:

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

# GLOBAL SHELL

Redesign Header:
- sticky;
- soft dark/translucent surface;
- active nav;
- cart count;
- account/profile menu;
- search overlay;
- notification badge;
- suitable wishlist shortcut.

Mobile:
- proper Drawer/Sheet;
- do not use a basic `<details>` menu as the final design;
- 48px interaction targets;
- language/account/cart clearly represented.

Improve Footer:
- legal links;
- contact;
- real social links only;
- payment method visuals only when actually supported.

---

# HOMEPAGE

Preserve strong hero identity.

Add meaningful non-catalog sections:
- New / Used
- Shop by category
- Fitment
- My Garage
- Why REVORA
- Brands
- Reservation process
- Services
- Featured products where data exists

Do not let an empty catalog make the homepage look unfinished.

---

# SHOP / MOTORCYCLES

Desktop:
- RTL-aware sidebar;
- sticky filters;
- collapsible groups;
- result count;
- sort.

Mobile:
- Filters button;
- Bottom Sheet/Drawer;
- active filter count;
- Clear all;
- sticky Show Results button.

At <=480px:
- use one-column premium product cards or a deliberately designed compact horizontal card;
- do not squeeze the existing two-column grid.

---

# PRODUCT / MOTORCYCLE CARDS

Product:
- image;
- commerce badge strip;
- brand/category;
- name;
- discounted price hierarchy;
- availability;
- fitment;
- one clear CTA.

Motorcycle:
- image;
- year;
- condition;
- engine;
- mileage for used;
- price;
- availability;
- reservation CTA.

Do not overload cards with equal-priority buttons.

---

# PRODUCT DETAIL

Required:
- sticky purchase column desktop;
- clear sale price;
- old price;
- discount percentage;
- stock state;
- visual variants/chips/swatches where appropriate;
- strong Add to Cart;
- fitment state near CTA;
- reviews redesign;
- gallery selection uses brand accent.

---

# MOTORCYCLE DETAIL

Required:
- localize specification keys;
- localize enum values;
- strong Reserve CTA;
- clear deposit explanation;
- sticky desktop reservation panel;
- sticky mobile bottom CTA;
- used-bike details where backend data supports them.

Do not put motorcycles into the normal product cart if reservations are the intended business model.

---

# SEARCH

Build:
- premium search overlay;
- recent searches;
- popular searches;
- suggestions;
- products;
- motorcycles;
- brands.

Results:
- query title;
- counts;
- tabs;
- filters;
- no-results state;
- clear filters.

Do not share one confusing page index between unrelated result datasets unless results are truly unified.

---

# FITMENT / MY GARAGE

Treat as flagship functionality.

Flow:
Brand -> Model -> Year -> Variant -> Save Motorcycle.

Saved bike card:
- motorcycle;
- year;
- active state;
- Shop compatible parts.

Product cards should show fitment state.

Initial page must include guidance instead of a blank result area.

---

# CART

Fix the deployed `/ar/cart` behavior first.

Design:
Desktop:
- image;
- title;
- variant;
- quantity stepper;
- price;
- old price;
- discount;
- remove;
- sticky summary.

Mobile:
- product cards;
- no squeezed table.

Summary:
- subtotal;
- savings;
- shipping;
- total.

If discounts exist:
show explicit total savings.

---

# CHECKOUT

Flow:
1. Cart
2. Delivery
3. Payment
4. Review

Desktop:
- form left;
- sticky summary right.

Mobile:
- compact step indicator;
- collapsible summary;
- sticky CTA.

Use selectable address cards and payment method cards.

Do not visually imply a real provider is active if payments are still sandbox-only.

---

# RESERVATION FLOW

Motorcycle reservation flow:

1. Motorcycle
2. Branch
3. Customer info
4. Deposit/payment
5. Review
6. Confirmation

Include dedicated success page with reservation number and next step.

---

# COMPARE MOTORCYCLES

Build a real comparison page.

Must support:
- images;
- names;
- prices;
- year;
- condition;
- engine;
- mileage;
- other supported specs;
- highlight differences;
- optional show differences only;
- remove/add motorcycle;
- mobile horizontal comparison;
- Reserve/View Details CTA.

---

# AUTHENTICATION

Fix:
- forgot-password navigation;
- raw Supabase errors;
- weak Google button;
- missing show/hide password;
- loading state;
- redirect-back after authentication.

Map backend errors to localized customer-facing messages.

---

# ACCOUNT

Create proper account shell.

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

Sign Out = danger-soft.
Delete Account = dedicated Danger Zone with explicit confirmation.

---

# ORDERS

Use customer-friendly order cards.

Order detail:
timeline:
- placed
- paid
- processing
- shipped
- delivered

Statuses must use shared localized StatusBadge.

---

# WISHLIST

Replace text-only panels with normal commerce cards.

---

# NOTIFICATIONS

Compact list:
- unread dot;
- title;
- summary;
- timestamp;
- contextual icon.

Add:
- mark all as read;
- global unread badge.

---

# ADDRESSES

Support Egyptian address fields:
- recipient
- phone
- governorate
- city/markaz
- area
- street
- building
- floor/apartment
- landmark
- default

Actions:
- Edit
- Delete
- Set default

---

# REVIEWS

Build:
- average score;
- count;
- distribution;
- filters;
- verified purchase badge;
- better review cards;
- proper write-review UI;
- pending/moderation feedback.

Use real backend data only.

---

# RETURNS / REFUNDS

Customer:
- select order/items;
- reason;
- details;
- review;
- submit;
- status tracking.

Admin:
- request details;
- items;
- reason;
- status history;
- refund state;
- notes.

Refund action uses danger semantics and explicit confirmation.

---

# WARRANTY

Customer:
- covered purchase;
- start/end;
- remaining period;
- terms;
- service/claim request;
- case status.

Admin:
- warranty cases;
- status;
- notes;
- timeline.

Never invent coverage data.

---

# STATUS SYSTEM

Create shared StatusBadge.

Map DB enums to localized labels.

Do not display raw values such as:
`pending_payment`
`processing`
`cancelled`

Use consistent semantic colors.

---

# TOAST SYSTEM

Create a reusable localized toast system for:
- saved;
- added to cart;
- updated;
- copied;
- errors;
- warnings.

Use `aria-live`.

Do not use toast instead of destructive confirmation.

---

# LOADING / SKELETONS

Implement reusable skeletons:
- product card;
- motorcycle card;
- detail;
- table;
- metrics;
- forms.

Avoid blank screens and generic Loading text.

---

# ERROR PAGES

Create branded:
- 403
- 404
- 500

403 must distinguish authenticated-but-not-authorized from anonymous login when appropriate.

Never expose stack traces.

---

# SUCCESS SCREENS

Create explicit success states for:
- order;
- reservation;
- return;
- warranty request;
- password reset email.

Include reference ID and next actions when applicable.

---

# ADMIN — DEDICATED SHELL

Do not use the normal storefront layout as the Admin UI.

Create:
- Admin topbar;
- grouped sidebar;
- main workspace;
- no storefront footer.

Navigation groups:

Overview:
- Dashboard
- Reports

Commerce:
- Orders
- Reservations
- Returns
- Warranties
- Promotions

Catalog:
- Products
- Motorcycles
- Categories
- Brands
- Fitment
- Reviews

Operations:
- Inventory
- Suppliers
- Branches
- Fulfillment

Customers:
- Customers
- Support

Access:
- Staff
- Roles
- Audit Logs

System:
- Site Settings

---

# ADMIN DASHBOARD

Use operational cards:
- Revenue
- Orders
- Reservations
- Customers
- Pending orders
- Low stock
- Returns requiring action
- Recent activity
- Top products
- Branch performance if supported

---

# ADMIN PRODUCTS

List-first UI:
- search;
- filters;
- image;
- product;
- SKU;
- price;
- stock;
- status;
- actions.

Actions:
- Edit
- Preview
- Duplicate
- Archive
- Delete where permitted.

---

# PRODUCT EDITOR

Tabs:
- Overview
- Pricing
- Inventory
- Variants
- Media
- Fitment
- SEO
- History

Sticky action bar:
- Unsaved changes
- Discard
- Save

Delete is a separate danger action.

---

# MOTORCYCLE EDITOR

Tabs:
- Overview
- Specifications
- Pricing
- Condition
- Media
- Branch
- Reservation
- History

Used-bike fields where backend supports them.

---

# ADMIN TABLES

Use:
- rounded containers;
- sticky header where useful;
- row hover;
- bulk selection;
- StatusBadge;
- empty state;
- pagination.

Mobile:
- cards where practical;
- horizontal scroll only as fallback.

---

# PERMISSION-AWARE ADMIN UI

UI must reflect permissions.

- hide unavailable actions where appropriate;
- disable with explanation where visibility helps;
- backend authorization remains authoritative;
- never rely on frontend hiding for security.

---

# ADMIN BULK ACTIONS

Add only safe supported bulk operations.

Examples:
- archive;
- publish/unpublish;
- status updates;
- export.

Show selected count.
Confirm risky changes.

---

# AUDIT LOG UX

Make audit logs readable:
- actor;
- action;
- entity;
- timestamp;
- change summary;
- filters;
- details drawer.

Never render secrets.

---

# ADMIN GLOBAL SEARCH

Search supported entities:
- orders;
- products;
- motorcycles;
- customers;
- reservations.

Only implement where backend querying supports it.

---

# MEDIA MANAGEMENT

Support:
- upload progress;
- retry;
- failure;
- cover;
- reorder;
- delete;
- alt text;
- preview;
- empty state.

---

# UNSAVED CHANGES

Apply dirty-state protection to major editors:
- Product
- Motorcycle
- Promotions
- Settings
- Staff permissions
- other large forms

Do not warn when no changes exist.

---

# STICKY ACTION BARS

Long forms:
- sticky Save/Discard.

Save = brand.
Discard = neutral.
Delete = separate danger area.

---

# MODALS / DRAWERS

Desktop:
- centered dialogs.

Mobile:
- bottom/full-screen sheets.

Must have:
- focus management;
- Esc;
- safe-area padding;
- sticky actions;
- no accidental data loss.

---

# TYPOGRAPHY

Create:
- `--font-display-en`
- `--font-body-en`
- `--font-display-ar`
- `--font-body-ar`

Move Google Fonts away from CSS `@import` and use `next/font` where practical.

---

# FORMATTING UTILITIES

Centralize:
- currency;
- date;
- number;
- percent;
- distance.

Avoid inconsistent EGP/date/number presentation.

---

# ACCESSIBILITY

Minimum:
- 44x44 touch targets;
- visible focus;
- semantic labels;
- correct button types;
- accessible dialogs;
- keyboard navigation;
- status not color-only;
- aria-live;
- sufficient contrast;
- alt text.

Respect `prefers-reduced-motion`.

---

# RESPONSIVE

Review at minimum:
- 390px
- <=480px
- 481–760px
- 761–1000px
- desktop

At <=480px:
- readable one-column commerce cards;
- filters in sheet;
- sticky CTA;
- reduced heading size;
- 16–18px page padding;
- no huge desktop tables.

---

# IMPLEMENTATION PHASES

## Phase 1 — Audit and foundations
- repository audit
- progress document
- semantic tokens
- radius
- buttons
- inputs
- badges
- status system
- typography
- formatting
- toast
- skeletons

## Phase 2 — Global shell
- Header
- mobile Drawer
- Footer
- navigation
- errors
- success states

## Phase 3 — Commerce
- cart route
- shop
- motorcycles
- cards
- commerce badges
- search
- product detail
- motorcycle detail
- compare
- fitment
- cart
- checkout
- reservation

## Phase 4 — Account
- Account shell
- Orders
- Reservations
- Wishlist
- Addresses
- Notifications
- Returns
- Warranty
- Security

## Phase 5 — Admin
- Admin shell
- navigation
- dashboard
- Products
- Motorcycles
- Orders
- Inventory
- Customers
- Promotions
- Returns
- Warranty
- Staff/Roles
- Audit Logs
- Settings
- Reports
- global search
- permission-aware actions

## Phase 6 — QA
- RTL
- LTR
- mobile
- tablet
- desktop
- keyboard
- accessibility
- route coverage
- auth/session tests
- visual regression where possible
- production build

---

# TESTING AND VERIFICATION

After each major phase run the applicable project checks:

- formatter
- lint
- TypeScript/type checks
- unit tests
- integration tests
- Playwright/E2E if present
- production build
- `git diff --check`

Add/update tests for:
- `/ar/cart`
- `/en/cart`
- auth/session persistence
- protected routes
- RTL critical UI behavior where testable
- search behavior
- critical customer journeys
- Admin permission behavior

Do not weaken tests simply to make them pass.

---

# FINAL ACCEPTANCE

Do not say the project is complete until:

- primary customer routes work;
- cart is not 404;
- auth session behavior is verified;
- RTL layouts are correct;
- destructive actions are semantically red;
- normal confirmation is not red;
- buttons/text contrast is correct;
- sharp geometry is replaced by the new radius system;
- mobile cards are readable;
- mobile filters use sheets/drawers;
- search is coherent;
- fitment is guided;
- cart/checkout are redesigned;
- reservation has steps and success state;
- comparison is usable;
- Account has a proper shell;
- reviews/returns/warranty are properly designed;
- Admin has a dedicated shell;
- permission-aware actions exist;
- raw DB statuses and raw Supabase errors are not exposed;
- all major flows have loading/error/empty/success states;
- design primitives are shared;
- no random page-specific design hacks remain without a documented reason;
- tests and production build pass.

---

# WORKING STYLE

Work autonomously through the phases.

Do not stop after producing a plan.
After the audit, begin implementation.

For each completed phase:
1. summarize files changed;
2. summarize UI/UX behavior changed;
3. run verification;
4. fix failures before continuing;
5. update `docs/UI_UX_REDESIGN_PROGRESS.md`.

If you encounter a real backend limitation:
- document it;
- implement the best truthful UI state;
- do not fabricate functionality.

Do not access or mutate production records merely to test visual behavior.

Begin now by reading `REVORA_UI_UX_AUDIT_AND_REDESIGN.md`, auditing the current repository, and creating the implementation plan/progress file. Then start Phase 1 immediately.


---

# AUTHENTICATED LIVE AUDIT — CONFIRMED PRODUCTION FINDINGS

The protected UI has now been audited in an authenticated owner session. Treat the following as confirmed production observations and prioritize them:

1. `/ar/admin/staff` has RTL inconsistencies and mixed-language actions.
2. Admin Settings and Staff contain Arabic/English mixing.
3. Admin lacks a scalable persistent sidebar and relies too much on horizontal/top-level navigation.
4. Products and Customers tables do not expose row actions clearly enough.
5. Product and Motorcycle creation/edit forms are too long and vertically dense.
6. Inventory Adjust Stock / Transfer layout requires overflow/responsiveness remediation.
7. Brand-lime is overused; reduce it so Primary actions remain visually important.
8. Remove Role and similar destructive actions need danger/danger-soft styling and explicit confirmation.
9. Checkout empty state currently looks like a red critical error; redesign it as a neutral commerce empty state.
10. Data-heavy tables require better filtering/sorting and deliberate mobile layouts.
11. Header icon grouping still feels LTR-centric in Arabic.
12. Breadcrumbs contain mixed English/Arabic labels.
13. Preserve the strong dark identity, high contrast, Arabic typography, spacing, and mobile-friendly Account tile targets.

Use these confirmed findings when ordering implementation work. They supersede earlier uncertainty about protected-page visuals.
