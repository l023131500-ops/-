import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layouts/RoleLayout";

export const Route = createFileRoute("/_authenticated/partner/clients")({
  component: () => <PlaceholderPage title="לקוחות בטיפולי" description="רשימת הלקוחות המשויכים אליך לטיפול." />,
});
