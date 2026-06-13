import { ServicesManager } from '@/components/admin/ServicesManager';
import { AdminProtected } from '@/components/admin/AdminProtected';

export default function AdminServicesPage() {
  return (
    <AdminProtected>
      <ServicesManager />
    </AdminProtected>
  );
}
