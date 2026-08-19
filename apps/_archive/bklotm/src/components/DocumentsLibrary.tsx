import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Play, Volume2, FolderOpen, ChevronDown, FileArchive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type DocItem = {
  id: string;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  doc_type: string;
  pdf_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  display_order: number;
};

const DocumentsLibrary = () => {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openMedia, setOpenMedia] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, category, subcategory, title, description, doc_type, pdf_url, video_url, audio_url, display_order")
        .eq("is_published", true)
        .order("category", { ascending: true })
        .order("subcategory", { ascending: true })
        .order("display_order", { ascending: true });
      if (data) setDocs(data as DocItem[]);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || docs.length === 0) return null;

  // Group: category -> subcategory -> docs
  const grouped: Record<string, Record<string, DocItem[]>> = {};
  for (const d of docs) {
    const sub = d.subcategory || "כללי";
    grouped[d.category] ??= {};
    grouped[d.category][sub] ??= [];
    grouped[d.category][sub].push(d);
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-secondary/10 rounded-full px-4 py-1.5 mb-4">
            <FileArchive className="w-4 h-4 text-secondary" />
            <span className="text-xs font-bold text-secondary">מסמכים, טפסים ונספחים</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3">
            📂 מרכז ההורדות
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            אספנו לכם את המידע במדויק שיהיה לכם יותר קל. כל הטפסים והנספחים במקום אחד.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-3">
          {Object.entries(grouped).map(([category, subs], catIdx) => {
            const isOpen = openCategory === category;
            const totalCount = Object.values(subs).reduce((acc, arr) => acc + arr.length, 0);
            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: catIdx * 0.06 }}
                className="bg-card rounded-2xl border-2 border-border overflow-hidden"
              >
                <button
                  onClick={() => setOpenCategory(isOpen ? null : category)}
                  className="w-full p-5 flex items-center gap-4 hover:bg-muted/40 transition-colors text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-md">
                    <FolderOpen className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground">{category}</h3>
                    <p className="text-xs text-muted-foreground">{totalCount} מסמכים זמינים להורדה</p>
                  </div>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-4">
                        {Object.entries(subs).map(([subcat, items]) => (
                          <div key={subcat}>
                            {Object.keys(subs).length > 1 || subcat !== "כללי" ? (
                              <h4 className="text-sm font-bold text-primary mb-2 mt-3 border-r-2 border-primary pr-2">
                                {subcat}
                              </h4>
                            ) : null}
                            <div className="space-y-2">
                              {items.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="rounded-xl border border-border bg-background hover:border-primary/40 hover:shadow-md transition-all overflow-hidden"
                                >
                                  <div className="flex items-center gap-3 p-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                      doc.doc_type === "appendix" ? "bg-secondary/15" : "bg-primary/15"
                                    }`}>
                                      <FileText className={`w-4 h-4 ${
                                        doc.doc_type === "appendix" ? "text-secondary" : "text-primary"
                                      }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                          {doc.doc_type === "appendix" ? "נספח" : "טופס"}
                                        </span>
                                      </div>
                                      {doc.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{doc.description}</p>
                                      )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      {(doc.video_url || doc.audio_url) && (
                                        <button
                                          onClick={() => setOpenMedia(openMedia === doc.id ? null : doc.id)}
                                          className="p-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors"
                                          title="הסבר"
                                        >
                                          {doc.video_url ? <Play className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                        </button>
                                      )}
                                      {doc.pdf_url && (
                                        <a
                                          href={doc.pdf_url}
                                          download
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-colors"
                                          title="הורדה"
                                        >
                                          <Download className="w-4 h-4" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  <AnimatePresence>
                                    {openMedia === doc.id && (
                                      <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: "auto" }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="p-3 pt-0 space-y-2 bg-muted/30">
                                          {doc.video_url && (
                                            <video src={doc.video_url} controls className="w-full rounded-lg" preload="metadata">
                                              <track kind="captions" />
                                            </video>
                                          )}
                                          {doc.audio_url && (
                                            <audio src={doc.audio_url} controls className="w-full" />
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DocumentsLibrary;
