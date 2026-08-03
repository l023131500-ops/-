import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Award,
  Users,
  Wallet,
  FileText,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SwitchFundDialog } from "./SwitchFundDialog";
import { SmartAdvisor } from "./SmartAdvisor";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type HfTopic,
  type HfTopicDetail,
  type HfMeta,
  fundColor,
  readableText,
  bestFundKey,
  FUND_ORDER,
} from "@/lib/hf";

export function TopicCard({ topic, meta }: { topic: HfTopic; meta?: HfMeta }) {
  const [open, setOpen] = useState(false);
  const value = topic.rangeText || topic.benefitSummary;
  const winnerKey = bestFundKey(topic.bestFund);

  // הפירוט נטען רק כשנפתח הכרטיס — הוא ~1.1MB לכל הנושאים יחד, ולכן אינו
  // מגיע ברשימה הראשית.
  const { data: detail, isLoading } = useQuery<HfTopicDetail>({
    queryKey: [`/api/hf/topics/${topic.id}`],
    enabled: open && topic.kind === "fund",
    staleTime: Infinity,
  });
  const hasDetail = !!detail?.fundDetails;

  return (
    <div
      className="overflow-hidden rounded-xl border border-card-border bg-card"
      data-testid={`card-topic-${topic.id}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover-elevate flex w-full items-center gap-3 px-4 py-3.5 text-right"
        data-testid={`button-toggle-${topic.id}`}
      >
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="truncate font-semibold text-foreground"
              data-testid={`text-topic-name-${topic.id}`}
            >
              {topic.topic}
            </span>
            {topic.catalogNo != null && (
              <span className="text-xs text-muted-foreground">
                #{topic.catalogNo}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {topic.category && (
              <Badge variant="secondary" className="text-xs font-normal">
                {topic.category}
              </Badge>
            )}
            {/* מדליה רק כשיש זוכה אמיתי — "טעון השוואה פרטנית" הוצג קודם עם
                אותו עיטור, כאילו הוא שם של קופה מנצחת. */}
            {winnerKey ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: fundColor(winnerKey, meta),
                  color: readableText(fundColor(winnerKey, meta)),
                }}
                data-testid={`chip-bestfund-${topic.id}`}
              >
                <Award className="h-3 w-3" />
                {topic.bestFund}
              </span>
            ) : (
              topic.kind === "fund" && (
                <span
                  className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground"
                  data-testid={`chip-undecided-${topic.id}`}
                >
                  טעון השוואה פרטנית
                </span>
              )
            )}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-card-border px-4 py-4">
              {topic.audience && (
                <InfoRow icon={<Users className="h-4 w-4" />} label="למי מיועד">
                  {topic.audience}
                </InfoRow>
              )}
              {value && (
                <InfoRow icon={<Wallet className="h-4 w-4" />} label="מה ניתן לקבל">
                  {value}
                </InfoRow>
              )}

              {/* ההשוואה עצמה: מסלול, שיעור, סכום ותקופת המתנה לכל קופה.
                  קודם הופיעו כאן ארבע הקופות עם שמות המסלולים בלבד — אותה רשימה
                  בדיוק בכל 435 הנושאים — כלומר לא היה כאן מה להשוות. */}
              {topic.kind === "fund" && (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Layers className="h-4 w-4 text-primary" />
                    השוואת הכיסוי בין הקופות
                  </div>

                  {isLoading && <Skeleton className="h-24 w-full rounded-lg" />}

                  {!isLoading && !hasDetail && (
                    <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                      פירוט הכיסוי לנושא זה אינו זמין כרגע.
                    </p>
                  )}

                  {!isLoading && hasDetail && (
                    <div className="space-y-2">
                      {FUND_ORDER.filter((k) => detail!.fundDetails![k]).map((k) => {
                        const bg = fundColor(k, meta);
                        const name =
                          meta?.funds.find((f) => f.key === k)?.name ?? k;
                        return (
                          <div
                            key={k}
                            className={`overflow-hidden rounded-lg border ${
                              k === winnerKey
                                ? "border-primary"
                                : "border-card-border"
                            }`}
                            data-testid={`block-fund-${k}-${topic.id}`}
                          >
                            <div
                              className="flex items-center justify-between px-3 py-1.5 text-sm font-semibold"
                              style={{ backgroundColor: bg, color: readableText(bg) }}
                            >
                              <span>{name}</span>
                              {k === winnerKey && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Award className="h-3 w-3" />
                                  הבולטת בנושא
                                </span>
                              )}
                            </div>
                            <div className="divide-y divide-card-border">
                              {detail!.fundDetails![k].map((p) => (
                                <div key={p.code} className="px-3 py-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-sm font-medium text-foreground">
                                      {p.plan}
                                    </span>
                                    {p.rate && <Fact>שיעור {p.rate}</Fact>}
                                    {p.amount && <Fact>עד {p.amount}</Fact>}
                                    {p.waiting && <Fact>המתנה {p.waiting}</Fact>}
                                  </div>
                                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    {p.text || "אין מידע במקורות שנסקרו — מומלץ לברר מול הקופה."}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        הפירוט משקף את תקנוני השב״ן כפי שנסקרו. תנאי הזכאות
                        המדויקים, התקרות ותקופות ההמתנה מאומתים מול הקופה עצמה.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <SmartAdvisor topicId={topic.id} topicName={topic.topic} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                {topic.sourceName && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    מקור: {topic.sourceName}
                  </span>
                )}
                {topic.kind === "fund" && (
                  <SwitchFundDialog topicId={topic.id} topicName={topic.topic} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Fact({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
