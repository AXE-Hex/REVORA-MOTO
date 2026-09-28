import { describe, expect, it } from 'vitest';
import {
  localizedAuditAction,
  localizedAuditEntity,
  localizedInventoryMovement,
} from './admin-format';

describe('admin labels', () => {
  it('localizes known audit actions and entities', () => {
    expect(localizedAuditAction('ar', 'order.transition')).toBe(
      'تحديث حالة الطلب',
    );
    expect(localizedAuditEntity('en', 'return_requests')).toBe('Returns');
  });

  it('localizes stock movements and keeps unknown identifiers readable', () => {
    expect(localizedInventoryMovement('ar', 'purchase_order')).toBe(
      'استلام أمر شراء',
    );
    expect(localizedAuditAction('ar', 'vendor.record')).toBe('vendor record');
  });
});
