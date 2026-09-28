'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

const base = z.object({
  locale: z.enum(['ar', 'en']),
  user: z.string().uuid(),
  role: z.string().min(1).max(80),
});

async function staffDb(locale: 'ar' | 'en') {
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'staff.write',
  });
  if (!allowed) redirect(`/${locale}/admin`);
  return db!;
}

export async function assignStaffRole(form: FormData) {
  const parsed = base.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/staff?error=invalid');
  const { locale, user, role } = parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.rpc('admin_assign_staff_role', {
    p_user: user,
    p_role: role,
  });
  if (error) redirect(`/${locale}/admin/staff?error=role`);
  redirect(`/${locale}/admin/staff?saved=1`);
}

export async function removeStaffRole(form: FormData) {
  const parsed = base.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/staff?error=invalid');
  const { locale, user, role } = parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.rpc('admin_remove_staff_role', {
    p_user: user,
    p_role: role,
  });
  if (error) redirect(`/${locale}/admin/staff?error=role`);
  redirect(`/${locale}/admin/staff?saved=1`);
}

export async function setRolePermission(form: FormData) {
  const parsed = z
    .object({
      locale: z.enum(['ar', 'en']),
      role: z.string().min(1).max(80),
      permission: z.string().min(1).max(100),
      enabled: z.enum(['true', 'false']),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/staff?error=invalid');
  const { locale, role, permission, enabled } = parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.rpc('admin_set_role_permission', {
    p_role: role,
    p_permission: permission,
    p_enabled: enabled === 'true',
  });
  if (error) redirect(`/${locale}/admin/staff?role=${role}&error=permission`);
  redirect(`/${locale}/admin/staff?role=${role}&saved=1`);
}
