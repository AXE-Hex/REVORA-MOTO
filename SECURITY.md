# Security model

- Supabase Auth identifies users. Account/admin pages check `auth.getUser()` server-side. Admin actions check `has_permission()` and database RLS/RBAC.
- RLS scopes customer data and staff operations. Column grants deny public product cost and motorcycle VIN. Supplier costs and the email outbox have restricted access.
- Checkout, coupons, reservations, inventory, returns, warranties and staff role changes use validated inputs and server/database calculations. Browser price, deposit, discount, stock, role, status and refund amounts are not trusted.
- A database guard rejects paid order/reservation states without a verified capture. Signed webhook events must match reference and amount; only the server service role may record them. The app does not collect card data.
- Staff role RPCs reject unauthorized assignment, protect the last owner and audit changes. Customer directory requires `customers.read`; public-text settings accept only fixed keys through a permission-checked RPC. Inventory movements are immutable.
- Product/motorcycle JSON-LD escapes script-breaking content, and demo records are not represented as real sale offers.
- Case evidence accepts limited image types and checks file signatures. Storage policies should receive further security review before launch.

Remaining launch work includes rate limiting, Auth/OAuth/email configuration, a strict CSP, provider-specific webhook controls, full RLS matrix and browser security testing, storage review and legal/privacy approval. Keep all service and provider secrets server-side and outside Git.
