import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layouts/RoleLayout";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: () => <PlaceholderPage title="יומן עסקאות וסליקה" description="מעקב אחר תשלומים ופעולות סליקה." />,
});
