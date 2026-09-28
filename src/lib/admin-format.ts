import { pick, type Locale } from './i18n';

const auditActions: Record<string, [string, string]> = {
  INSERT: ['إنشاء سجل', 'Record created'],
  UPDATE: ['تحديث سجل', 'Record updated'],
  DELETE: ['حذف سجل', 'Record deleted'],
  'inventory.adjust': ['تعديل المخزون', 'Inventory adjusted'],
  'order.cancel_unpaid': ['إلغاء طلب غير مدفوع', 'Unpaid order cancelled'],
  'order.transition': ['تحديث حالة الطلب', 'Order status changed'],
  'order.ship': ['تجهيز شحنة الطلب', 'Order shipment created'],
  'return.transition': ['تحديث حالة المرتجع', 'Return status changed'],
  'refund.retry': ['إعادة محاولة الاسترداد', 'Refund retried'],
  'reservation.refund.request': [
    'طلب استرداد حجز',
    'Reservation refund requested',
  ],
  'staff.role.assign': ['تعيين دور لموظف', 'Staff role assigned'],
  'staff.role.remove': ['إزالة دور موظف', 'Staff role removed'],
  'staff.permission.update': ['تحديث صلاحية دور', 'Role permission updated'],
  'site_setting.update': ['تحديث إعداد متجر', 'Store setting updated'],
  'checkout.rates.update': ['تحديث رسوم إتمام الطلب', 'Checkout rates updated'],
  'review.delete': ['حذف تقييم', 'Review deleted'],
};
const auditEntities: Record<string, [string, string]> = {
  orders: ['الطلبات', 'Orders'],
  inventory: ['المخزون', 'Inventory'],
  return_requests: ['المرتجعات', 'Returns'],
  refund_requests: ['الاستردادات', 'Refunds'],
  motorcycle_reservations: ['حجوزات الدراجات', 'Motorcycle reservations'],
  staff_roles: ['أدوار الموظفين', 'Staff roles'],
  role_permissions: ['صلاحيات الأدوار', 'Role permissions'],
  site_settings: ['إعدادات المتجر', 'Store settings'],
  reviews: ['التقييمات', 'Reviews'],
  products: ['المنتجات', 'Products'],
  motorcycles: ['الدراجات', 'Motorcycles'],
  promotions: ['العروض', 'Promotions'],
};
const movementKinds: Record<string, [string, string]> = {
  bootstrap: ['رصيد افتتاحي', 'Opening balance'],
  adjustment: ['تسوية مخزون', 'Stock adjustment'],
  transfer: ['نقل مخزون', 'Stock transfer'],
  receiving: ['استلام مخزون', 'Stock receiving'],
  purchase_order: ['استلام أمر شراء', 'Purchase order receiving'],
  catalog: ['تحديث من الكتالوج', 'Catalog update'],
  fulfillment: ['تجهيز طلب', 'Order fulfillment'],
};

function localized(
  locale: Locale,
  dictionary: Record<string, [string, string]>,
  value: string,
) {
  const labels = dictionary[value];
  return labels
    ? pick(locale, labels[0], labels[1])
    : value.replaceAll('_', ' ').replaceAll('.', ' ');
}

export const localizedAuditAction = (locale: Locale, action: string) =>
  localized(locale, auditActions, action);
export const localizedAuditEntity = (locale: Locale, entity: string) =>
  localized(locale, auditEntities, entity);
export const localizedInventoryMovement = (locale: Locale, kind: string) =>
  localized(locale, movementKinds, kind);
