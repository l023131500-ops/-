import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Database, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import {
  getStatus,
  triggerFetch,
  type StatusResponse,
  type TriggerResponse,
} from "@/lib/price-bot.functions";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System Status — Price Compare | סטטוס המערכת" },
      {
        name: "description",
        content:
          "Backend health, price database size, and manual price refresh for the price comparison service.",
      },
      { property: "og:title", content: "System Status — Price Compare" },
      {
        property: "og:description",
        content: "Backend health and manual price refresh dashboard.",
      },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const { t } = useI18n();
  const getStatusFn = useServerFn(getStatus);
  const triggerFn = useServerFn(triggerFetch);

  const statusQuery = useQuery<StatusResponse>({
    queryKey: ["price-bot", "status"],
    queryFn: () => getStatusFn(),
    refetchInterval: 30_000,
  });

  const triggerMutation = useMutation<TriggerResponse, Error, void>({
    mutationFn: () => triggerFn(),
    onSuccess: (data) => {
      if (data.started) {
        toast.success(t("status.trigger.success"));
        void statusQuery.refetch();
      } else if (data.error === "unauthorized") {
        toast.error(t("status.trigger.unauthorized"));
      } else {
        toast.error(t("status.trigger.error"));
      }
    },
    onError: () => toast.error(t("status.trigger.error")),
  });

  const status = statusQuery.data;
  const isOnline = status?.ok === true;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {t("status.title")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("status.subtitle")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => statusQuery.refetch()}
            disabled={statusQuery.isFetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-4 w-4 ${statusQuery.isFetching ? "animate-spin" : ""}`}
            />
            {t("status.refresh")}
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="h-4 w-4" />
                {t("status.health")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusQuery.isLoading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      isOnline ? "bg-success" : "bg-destructive"
                    }`}
                  />
                  <span className="text-lg font-bold text-foreground">
                    {isOnline
                      ? t("status.online")
                      : status?.error === "not_configured"
                        ? t("status.notconfigured")
                        : t("status.offline")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Database className="h-4 w-4" />
                {t("status.rows")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusQuery.isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-2xl font-extrabold tabular-nums text-foreground">
                  {status?.priceRows != null
                    ? status.priceRows.toLocaleString()
                    : "—"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-accent" />
              {t("status.trigger.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t("status.trigger.body")}</p>
            <Button
              onClick={() => triggerMutation.mutate()}
              disabled={triggerMutation.isPending || !isOnline}
              className="gap-1.5"
            >
              <Zap className="h-4 w-4" />
              {triggerMutation.isPending
                ? t("status.trigger.running")
                : t("status.trigger.button")}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
