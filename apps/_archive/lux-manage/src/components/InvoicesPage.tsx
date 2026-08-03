import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Plus, X, Download, Users, Package, Send, Check, Clock, Trash2 } from "lucide-react";
import { useFinancial } from "@/contexts/FinancialContext";

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

interface InvoiceItem { description: string; quantity: number; unitPrice: number; }
interface Client { id: string; name: string; email: string; phone: string; }
interface Invoice {
  id: string; number: string; clientId: string; clientName: string;
  items: InvoiceItem[]; date: string; status: "draft" | "sent" | "paid";
  total: number;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultClients: Client[] = [
  { id: "cl1", name: "חברת אלפא בע״מ", email: "info@alpha.co.il", phone: "03-1234567" },
  { id: "cl2", name: "סטודיו בטא", email: "hello@beta.co.il", phone: "052-9876543" },
  { id: "cl3", name: "גמא שירותים", email: "contact@gamma.co.il", phone: "04-5551234" },
];

export default function InvoicesPage() {
  const { addTransaction } = useFinancial();
  const [clients, setClients] = useState<Client[]>(defaultClients);
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: "inv1", number: "INV-001", clientId: "cl1", clientName: "חברת אלפא בע״מ", items: [{ description: "ייעוץ עסקי", quantity: 10, unitPrice: 450 }], date: "2026-03-01", status: "sent", total: 4500 },
    { id: "inv2", number: "INV-002", clientId: "cl2", clientName: "סטודיו בטא", items: [{ description: "עיצוב לוגו", quantity: 1, unitPrice: 5000 }, { description: "כרטיסי ביקור", quantity: 500, unitPrice: 2 }], date: "2026-03-10", status: "paid", total: 6000 },
    { id: "inv3", number: "INV-003", clientId: "cl3", clientName: "גמא שירותים", items: [{ description: "תחזוקה חודשית", quantity: 1, unitPrice: 3500 }], date: "2026-03-15", status: "draft", total: 3500 },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "" });
  const [newInvoice, setNewInvoice] = useState({
    clientId: "", items: [{ description: "", quantity: 1, unitPrice: 0 }] as InvoiceItem[],
  });

  const totalSent = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);

  const addItem = () => setNewInvoice((ni) => ({ ...ni, items: [...ni.items, { description: "", quantity: 1, unitPrice: 0 }] }));
  const removeItem = (idx: number) => setNewInvoice((ni) => ({ ...ni, items: ni.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, updates: Partial<InvoiceItem>) => {
    setNewInvoice((ni) => ({ ...ni, items: ni.items.map((item, i) => i === idx ? { ...item, ...updates } : item) }));
  };

  const createInvoice = useCallback(() => {
    const client = clients.find((c) => c.id === newInvoice.clientId);
    if (!client || newInvoice.items.every((i) => !i.description)) return;
    const total = newInvoice.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const inv: Invoice = {
      id: generateId(), number: `INV-${String(invoices.length + 1).padStart(3, "0")}`,
      clientId: client.id, clientName: client.name, items: newInvoice.items,
      date: new Date().toISOString().split("T")[0], status: "draft", total,
    };
    setInvoices((prev) => [...prev, inv]);
    setNewInvoice({ clientId: "", items: [{ description: "", quantity: 1, unitPrice: 0 }] });
    setShowCreate(false);
  }, [clients, newInvoice, invoices.length]);

  const markAsSent = (id: string) => setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: "sent" } : i));

  const markAsPaid = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: "paid" } : i));
    // Add to business income
    addTransaction({
      type: "income", amount: inv.total, category: "business",
      description: `חשבונית ${inv.number} — ${inv.clientName}`,
      date: new Date().toISOString().split("T")[0], isRecurring: false, isInstallment: false,
    });
  };

  const addNewClient = () => {
    if (!newClient.name) return;
    setClients((prev) => [...prev, { ...newClient, id: generateId() }]);
    setNewClient({ name: "", email: "", phone: "" });
    setShowClientForm(false);
  };

  const generatePDF = (inv: Invoice) => {
    const content = `
חשבונית מס / קבלה
━━━━━━━━━━━━━━━━━━━━━━
מספר: ${inv.number}
תאריך: ${inv.date}
לקוח: ${inv.clientName}
━━━━━━━━━━━━━━━━━━━━━━
פירוט:
${inv.items.map((i) => `  ${i.description} — ${i.quantity} × ₪${i.unitPrice.toLocaleString()} = ₪${(i.quantity * i.unitPrice).toLocaleString()}`).join("\n")}
━━━━━━━━━━━━━━━━━━━━━━
סה״כ לפני מע״מ: ₪${inv.total.toLocaleString()}
מע״מ (17%): ₪${Math.round(inv.total * 0.17).toLocaleString()}
סה״כ כולל מע״מ: ₪${Math.round(inv.total * 1.17).toLocaleString()}
    `.trim();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${inv.number}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<string, string> = {
    draft: "bg-secondary text-muted-foreground",
    sent: "bg-amber-500/10 text-amber-400",
    paid: "bg-emerald-500/10 text-emerald-400",
  };
  const statusLabels: Record<string, string> = { draft: "טיוטה", sent: "נשלחה", paid: "שולמה" };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-8 md:p-12 max-w-7xl mx-auto space-y-8">
      <div className="ambient-indigo w-[600px] h-[600px] top-0 end-0 -z-10" />

      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <FileText className="w-7 h-7 business-accent-text" />
            חשבוניות דיגיטליות
          </h1>
          <p className="text-sm text-muted-foreground">ניהול חשבוניות, לקוחות ופריטים</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowClientForm(true)} className="btn-clay-ghost text-xs">
            <Users className="w-4 h-4" /> לקוח חדש
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-clay-indigo text-xs">
            <Plus className="w-4 h-4" /> חשבונית חדשה
          </button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bento-card-business">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">סה״כ חשבוניות</p>
          <p className="text-2xl font-extrabold text-foreground">{invoices.length}</p>
        </div>
        <div className="bento-card-business">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">ממתין לתשלום</p>
          <p className="text-2xl font-extrabold business-accent-text">₪{totalSent.toLocaleString()}</p>
        </div>
        <div className="bento-card-business">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">שולם</p>
          <p className="text-2xl font-extrabold text-emerald-400">₪{totalPaid.toLocaleString()}</p>
        </div>
      </motion.div>

      {/* Invoice List */}
      <motion.div variants={itemVariants} className="bento-card-business">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-5">רשימת חשבוניות</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-right py-3 text-muted-foreground font-medium">מספר</th>
                <th className="text-right py-3 text-muted-foreground font-medium">לקוח</th>
                <th className="text-right py-3 text-muted-foreground font-medium">תאריך</th>
                <th className="text-right py-3 text-muted-foreground font-medium">סכום</th>
                <th className="text-right py-3 text-muted-foreground font-medium">סטטוס</th>
                <th className="text-right py-3 text-muted-foreground font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 font-bold text-foreground">{inv.number}</td>
                  <td className="py-3 text-foreground">{inv.clientName}</td>
                  <td className="py-3 text-muted-foreground">{inv.date}</td>
                  <td className="py-3 font-bold business-accent-text">₪{inv.total.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[inv.status]}`}>
                      {statusLabels[inv.status]}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {inv.status === "draft" && (
                        <button onClick={() => markAsSent(inv.id)} className="btn-clay text-[9px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400">
                          <Send className="w-3 h-3" /> שלח
                        </button>
                      )}
                      {inv.status === "sent" && (
                        <button onClick={() => markAsPaid(inv.id)} className="btn-clay text-[9px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Check className="w-3 h-3" /> שולם
                        </button>
                      )}
                      <button onClick={() => generatePDF(inv)} className="btn-clay text-[9px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                        <Download className="w-3 h-3" /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Client Database */}
      <motion.div variants={itemVariants} className="bento-card-business">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-5 flex items-center gap-2">
          <Users className="w-4 h-4 business-accent-text" /> מאגר לקוחות
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="p-4 rounded-2xl bg-secondary/40 border border-border/30">
              <p className="text-sm font-bold text-foreground">{c.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{c.email}</p>
              <p className="text-[10px] text-muted-foreground">{c.phone}</p>
              <p className="text-[10px] business-accent-text mt-2 font-bold">
                {invoices.filter((i) => i.clientId === c.id).length} חשבוניות
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Create Invoice Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card rounded-bento p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground">חשבונית חדשה</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-foreground mb-2 block">לקוח</label>
                  <select value={newInvoice.clientId} onChange={(e) => setNewInvoice((ni) => ({ ...ni, clientId: e.target.value }))}
                    className="wizard-input w-full">
                    <option value="">בחר לקוח</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground mb-2 block">פריטים</label>
                  <div className="space-y-3">
                    {newInvoice.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-end">
                        <input value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })}
                          placeholder="תיאור" className="wizard-input flex-1" />
                        <input type="number" value={item.quantity || ""} onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                          placeholder="כמות" className="wizard-input w-20 text-center" />
                        <input type="number" value={item.unitPrice || ""} onChange={(e) => updateItem(idx, { unitPrice: parseInt(e.target.value) || 0 })}
                          placeholder="מחיר" className="wizard-input w-24 text-center" />
                        {newInvoice.items.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="text-destructive/60 hover:text-destructive p-2"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={addItem} className="btn-clay-ghost text-[10px] mt-2">
                    <Plus className="w-3 h-3" /> הוסף פריט
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/40 border border-border/30">
                  <p className="text-xs text-muted-foreground">סה״כ:</p>
                  <p className="text-xl font-extrabold business-accent-text">
                    ₪{newInvoice.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}
                  </p>
                </div>

                <button onClick={createInvoice} className="btn-clay-indigo text-xs w-full justify-center">
                  <FileText className="w-4 h-4" /> צור חשבונית
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showClientForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowClientForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card rounded-bento p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground">לקוח חדש</h2>
                <button onClick={() => setShowClientForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-4">
                <input value={newClient.name} onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))}
                  placeholder="שם החברה / לקוח" className="wizard-input w-full" />
                <input value={newClient.email} onChange={(e) => setNewClient((c) => ({ ...c, email: e.target.value }))}
                  placeholder="אימייל" className="wizard-input w-full" />
                <input value={newClient.phone} onChange={(e) => setNewClient((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="טלפון" className="wizard-input w-full" />
                <button onClick={addNewClient} className="btn-clay-indigo text-xs w-full justify-center">
                  <Plus className="w-4 h-4" /> הוסף לקוח
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
