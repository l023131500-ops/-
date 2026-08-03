import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layouts/RoleLayout";

export const Route = createFileRoute("/_authenticated/partner/feedbacks")({
  component: () => <PlaceholderPage title="משובים ועדכונים" description="עדכוני סטטוס טיפול ומשוב לכל לקוח." />,
});
