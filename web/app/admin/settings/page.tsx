import { StoreSettings } from '@/components/admin/StoreSettings';
import { AdminProtected } from '@/components/admin/AdminProtected';

export default function AdminSettingsPage() {
  return (
    <AdminProtected>
      <StoreSettings />
    </AdminProtected>
  );
}
