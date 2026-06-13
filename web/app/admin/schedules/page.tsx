import { SchedulesManager } from '@/components/admin/SchedulesManager';
import { AdminProtected } from '@/components/admin/AdminProtected';

export default function AdminSchedulesPage() {
  return (
    <AdminProtected>
      <SchedulesManager />
    </AdminProtected>
  );
}
