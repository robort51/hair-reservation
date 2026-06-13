import { AdminAppointments } from '@/components/admin/AdminAppointments';
import { AdminProtected } from '@/components/admin/AdminProtected';

export default function AdminAppointmentsPage() {
  return (
    <AdminProtected>
      <AdminAppointments mode="all" />
    </AdminProtected>
  );
}
