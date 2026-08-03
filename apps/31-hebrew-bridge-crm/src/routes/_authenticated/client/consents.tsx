import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layouts/RoleLayout";

export const Route = createFileRoute("/_authenticated/client/consents")({
  component: () => <PlaceholderPage title="ניהול שיתוף מידע" description="קבע אילו שותפים רשאים לצפות בפרטיך." />,
});
