import { AdminAppointments } from '@/components/admin/AdminAppointments';
import { AdminProtected } from '@/components/admin/AdminProtected';

export default function AdminPage() {
  return (
    <AdminProtected>
      <AdminAppointments mode="today" />
    </AdminProtected>
  );
}
