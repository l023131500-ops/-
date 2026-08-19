import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PackageSearch, Search, Sparkles, Store, TrendingDown } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { searchPrices, type SearchResponse } from "@/lib/price-bot.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Price Compare — Cheapest Supermarket Prices | השוואת מחירים" },
      {
        name: "description",
        content:
          "Compare Israeli supermarket prices by barcode or product name and find the cheapest store. השוואת מחירים בסופרמרקטים לפי ברקוד או שם מוצר.",
      },
      { property: "og:title", content: "Price Compare — Cheapest Supermarket Prices" },
      {
        property: "og:description",
        content: "Find the cheapest supermarket price by barcode or product name.",
      },
    ],
  }),
  component: SearchPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_TOKENS = ["bg-gold text-gold-foreground", "bg-silver text-silver-foreground", "bg-bronze text-bronze-foreground"];

function SearchPage() {
  const { t, formatPrice } = useI18n();
  const [query, setQuery] = useState("");
  const search = useServerFn(searchPrices);

  const mutation = useMutation<SearchResponse, Error, string>({
    mutationFn: (q: string) => search({ data: { query: q } }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length === 0) return;
    mutation.mutate(q);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <section className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            {t("app.tagline")}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t("search.title")}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {t("search.subtitle")}
          </p>

          <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder")}
                className="h-12 ps-11 text-base"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-12 px-7 text-base"
              disabled={mutation.isPending || query.trim().length === 0}
            >
              {mutation.isPending ? t("search.searching") : t("search.button")}
            </Button>
          </form>
        </section>

        <section className="mx-auto mt-10 max-w-2xl">
          {mutation.isPending ? (
            <ResultsSkeleton />
          ) : mutation.isError ? (
            <StateCard
              icon={<TrendingDown className="h-7 w-7" />}
              title={t("search.error.title")}
              body={t("search.error.body")}
              tone="error"
            />
          ) : mutation.data ? (
            <Results data={mutation.data} formatPrice={formatPrice} t={t} />
          ) : (
            <StateCard
              icon={<PackageSearch className="h-7 w-7" />}
              title={t("search.empty.title")}
              body={t("search.empty.body")}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function Results({
  data,
  formatPrice,
  t,
}: {
  data: SearchResponse;
  formatPrice: (v: number) => string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  if (data.status === "not_configured") {
    return (
      <StateCard
        icon={<Store className="h-7 w-7" />}
        title={t("search.notconfigured.title")}
        body={t("search.notconfigured.body")}
        tone="error"
      />
    );
  }

  if (data.status === "error") {
    return (
      <StateCard
        icon={<TrendingDown className="h-7 w-7" />}
        title={t("search.error.title")}
        body={t("search.error.body")}
        tone="error"
      />
    );
  }

  if (data.status === "not_found" || data.results.length === 0) {
    return (
      <StateCard
        icon={<PackageSearch className="h-7 w-7" />}
        title={t("search.notfound.title")}
        body={t("search.notfound.body")}
      />
    );
  }

  const prices = data.results.map((r) => r.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const savings = max - min;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-foreground">
          {data.results[0].product_name}
        </h2>
        <span className="text-sm text-muted-foreground">{t("results.cheapest")}</span>
      </div>

      <ul className="space-y-3">
        {data.results.map((r, i) => (
          <li key={`${r.chain_name}-${r.branch_name}-${i}`}>
            <Card className="overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${RANK_TOKENS[i] ?? "bg-secondary text-secondary-foreground"}`}
                  aria-hidden
                >
                  {MEDALS[i] ?? i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {r.chain_name}
                  </p>
                  {r.branch_name ? (
                    <p className="truncate text-sm text-muted-foreground">
                      {t("results.branch")} {r.branch_name}
                    </p>
                  ) : null}
                </div>
                <div className="text-end">
                  <p className="text-xl font-extrabold tabular-nums text-primary">
                    {formatPrice(r.price)}
                  </p>
                  {i === 0 ? (
                    <span className="text-xs font-medium text-success">
                      {t("results.rank.1")}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {savings > 0 ? (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingDown className="h-6 w-6 shrink-0 text-accent" />
            <div>
              <p className="font-semibold text-foreground">
                {t("results.savings")}: {formatPrice(savings)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("results.savings.between", {
                  min: formatPrice(min),
                  max: formatPrice(max),
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StateCard({
  icon,
  title,
  body,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone?: "default" | "error";
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
            tone === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {icon}
        </span>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
