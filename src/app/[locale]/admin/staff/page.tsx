import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
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
    { data: directory },
    { data: roles },
    { data: permissions },
    { data: grants },
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
      <div className="panel">
        <h2>{pick(locale, 'حسابات المستخدمين', 'USER ACCOUNTS')}</h2>
        {users.map((user) => (
          <div className="spec-row" key={user.user_id}>
            <span>
              {user.email} {user.full_name && `· ${user.full_name}`}
            </span>
            <span>{user.roles.join(', ') || 'customer'}</span>
          </div>
        ))}
      </div>
      <div className="two-column" style={{ marginTop: 24 }}>
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
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-accent" type="submit">
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
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-ghost" type="submit">
            {pick(locale, 'إزالة', 'REMOVE')}
          </button>
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
              {role.name}
            </Link>
          ))}
        </div>
        {(permissions || []).map((permission) => (
          <div className="spec-row" key={permission.id}>
            <span>
              {permission.id} · {permission.description}
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
                <button className="button button-ghost" type="submit">
                  {granted.has(permission.id)
                    ? pick(locale, 'إلغاء', 'REVOKE')
                    : pick(locale, 'منح', 'GRANT')}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
