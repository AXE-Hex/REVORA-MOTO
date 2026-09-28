import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import {
  assignStaffRole,
  removeStaffRole,
  setRolePermission,
} from '@/app/admin-staff-actions';

type Staff = {
  user_id: string;
  email: string;
  full_name: string;
  roles: string[];
};

const roleNames: Record<string, [string, string]> = {
  owner: ['مالك المتجر', 'Store owner'],
  super_admin: ['مدير عام', 'Super administrator'],
  admin: ['مدير', 'Administrator'],
  store_manager: ['مدير المتجر', 'Store manager'],
  sales: ['المبيعات', 'Sales'],
  warehouse: ['المخزون', 'Warehouse'],
  customer_support: ['دعم العملاء', 'Customer support'],
  accountant: ['محاسب', 'Accountant'],
  content_manager: ['مدير المحتوى', 'Content manager'],
};
const permissionNames: Record<string, [string, string]> = {
  'catalog.write': ['إدارة الكتالوج', 'Manage catalog'],
  'motorcycles.write': [
    'إدارة الدراجات والفروع',
    'Manage motorcycles and branches',
  ],
  'orders.read': ['عرض الطلبات', 'Read orders'],
  'orders.write': ['إدارة الطلبات', 'Manage orders'],
  'reservations.read': ['عرض الحجوزات', 'Read reservations'],
  'reservations.write': ['إدارة الحجوزات', 'Manage reservations'],
  'inventory.write': [
    'إدارة المخزون والموردين',
    'Manage inventory and suppliers',
  ],
  'payments.read': ['عرض المدفوعات', 'Read payments'],
  'staff.write': ['إدارة الموظفين والصلاحيات', 'Manage staff and permissions'],
  'reports.read': ['عرض التقارير', 'Read reports'],
  'content.write': ['إدارة المحتوى والتقييمات', 'Manage content and reviews'],
  'audit.read': ['عرض سجل التدقيق', 'Read audit log'],
  'customers.read': ['عرض العملاء', 'Read customers'],
  'settings.write': ['إدارة إعدادات المتجر', 'Manage store settings'],
  'fulfillment.write': ['تجهيز الشحنات', 'Manage fulfillment'],
};

function roleName(locale: 'ar' | 'en', role: string) {
  const labels = roleNames[role];
  return labels ? pick(locale, labels[0], labels[1]) : role;
}

function permissionName(locale: 'ar' | 'en', permission: string) {
  const labels = permissionNames[permission];
  return labels ? pick(locale, labels[0], labels[1]) : permission;
}

export default async function AdminStaff({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string; error?: string; saved?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'staff.write',
  });
  if (!allowed) notFound();
  const [
    { data: directory, error: directoryError },
    { data: roles, error: rolesError },
    { data: permissions, error: permissionsError },
    { data: grants, error: grantsError },
  ] = await Promise.all([
    db!.rpc('staff_directory'),
    db!.from('roles').select('id,name').order('name'),
    db!.from('permissions').select('id,description').order('id'),
    db!.from('role_permissions').select('role_id,permission_id'),
  ]);
  const users = (directory || []) as Staff[];
  const query = await searchParams;
  const selectedRole = roles?.some((role) => role.id === query.role)
    ? query.role!
    : 'admin';
  const granted = new Set(
    (grants || [])
      .filter((grant) => grant.role_id === selectedRole)
      .map((grant) => grant.permission_id),
  );
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / STAFF
      </div>
      <h1 className="page-title">
        {pick(locale, 'الموظفون والصلاحيات', 'STAFF & PERMISSIONS')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر حفظ التغيير', 'Could not save change')}
        </p>
      )}
      {query.saved && (
        <p className="notice">{pick(locale, 'تم الحفظ', 'Saved')}</p>
      )}
      {[directoryError, rolesError, permissionsError, grantsError].some(
        Boolean,
      ) && (
        <p className="notice error" role="alert">
          {pick(
            locale,
            'تعذر تحميل بعض بيانات الموظفين والصلاحيات.',
            'Some staff and permission data could not load.',
          )}
        </p>
      )}
      <div className="panel admin-staff-directory">
        <h2>{pick(locale, 'حسابات المستخدمين', 'USER ACCOUNTS')}</h2>
        {!users.length && (
          <p className="admin-empty-table">
            {pick(
              locale,
              'لا توجد حسابات مستخدمين بعد.',
              'There are no user accounts yet.',
            )}
          </p>
        )}
        {users.map((user) => (
          <article className="admin-staff-card" key={user.user_id}>
            <div>
              <strong dir="auto">
                {user.full_name || pick(locale, 'بلا اسم', 'Unnamed account')}
              </strong>
              <span dir="ltr">{user.email}</span>
            </div>
            <ul aria-label={pick(locale, 'الأدوار', 'Roles')}>
              {user.roles.length ? (
                user.roles.map((role) => (
                  <li dir="auto" key={role}>
                    {roleName(locale, role)}
                  </li>
                ))
              ) : (
                <li>{pick(locale, 'عميل', 'Customer')}</li>
              )}
            </ul>
          </article>
        ))}
      </div>
      <div className="two-column admin-staff-forms">
        <form action={assignStaffRole} className="panel form-stack">
          <h2>{pick(locale, 'تعيين دور', 'ASSIGN ROLE')}</h2>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'المستخدم', 'USER')}
            <select className="input" name="user" required>
              <option value="">—</option>
              {users.map((user) => (
                <option value={user.user_id} key={user.user_id}>
                  {user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'الدور', 'ROLE')}
            <select className="input" name="role">
              {(roles || []).map((role) => (
                <option value={role.id} key={role.id}>
                  {roleName(locale, role.name)}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-primary" type="submit">
            {pick(locale, 'تعيين', 'ASSIGN')}
          </button>
        </form>
        <form action={removeStaffRole} className="panel form-stack">
          <h2>{pick(locale, 'إزالة دور', 'REMOVE ROLE')}</h2>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'الموظف', 'STAFF USER')}
            <select className="input" name="user" required>
              <option value="">—</option>
              {users
                .filter((user) => user.roles.length)
                .map((user) => (
                  <option value={user.user_id} key={user.user_id}>
                    {user.email} · {user.roles.join(', ')}
                  </option>
                ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'الدور', 'ROLE')}
            <select className="input" name="role">
              {(roles || []).map((role) => (
                <option value={role.id} key={role.id}>
                  {roleName(locale, role.name)}
                </option>
              ))}
            </select>
          </label>
          <ConfirmSubmit
            label={pick(locale, 'إزالة الدور', 'Remove role')}
            confirmation={pick(
              locale,
              'هل تريد إزالة هذا الدور من الموظف؟',
              'Remove this role from the staff member?',
            )}
          />
        </form>
      </div>
      <div className="panel" style={{ marginTop: 24 }}>
        <h2>{pick(locale, 'صلاحيات الأدوار', 'ROLE PERMISSIONS')}</h2>
        <div className="toolbar">
          {(roles || []).map((role) => (
            <Link
              className={`chip ${selectedRole === role.id ? 'active' : ''}`}
              href={`/${locale}/admin/staff?role=${role.id}`}
              key={role.id}
            >
              {roleName(locale, role.name)}
            </Link>
          ))}
        </div>
        {!permissions?.length && (
          <p>
            {pick(
              locale,
              'لا توجد صلاحيات معرفة.',
              'No permissions are configured.',
            )}
          </p>
        )}
        {(permissions || []).map((permission) => (
          <div className="spec-row admin-permission-row" key={permission.id}>
            <span className="admin-permission-label">
              <strong>{permissionName(locale, permission.id)}</strong>
              <code dir="ltr">{permission.id}</code>
            </span>
            <span>{granted.has(permission.id) ? '✓' : '—'}</span>
            {!['owner', 'super_admin'].includes(selectedRole) && (
              <form action={setRolePermission}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="role" value={selectedRole} />
                <input type="hidden" name="permission" value={permission.id} />
                <input
                  type="hidden"
                  name="enabled"
                  value={granted.has(permission.id) ? 'false' : 'true'}
                />
                {granted.has(permission.id) ? (
                  <ConfirmSubmitButton
                    label={pick(locale, 'إلغاء الصلاحية', 'Revoke permission')}
                    message={pick(
                      locale,
                      'هل تريد إلغاء هذه الصلاحية من الدور؟',
                      'Revoke this permission from the role?',
                    )}
                    className="button button-danger-soft"
                  />
                ) : (
                  <button className="button button-secondary" type="submit">
                    {pick(locale, 'منح الصلاحية', 'Grant permission')}
                  </button>
                )}
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
