import { StaffManager } from '@/components/admin/StaffManager';
import { AdminProtected } from '@/components/admin/AdminProtected';

export default function AdminStaffPage() {
  return (
    <AdminProtected>
      <StaffManager />
    </AdminProtected>
  );
}
