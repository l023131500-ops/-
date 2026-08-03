import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/partner/")({
  beforeLoad: () => { throw redirect({ to: "/partner/clients" }); },
});
