import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Bot, User, Clock, BookOpen, Calendar,
  Heart, Scale, Users, Gavel, Scroll, HeartHandshake, HelpCircle,
  ArrowRight, Droplets, Sparkles, Phone, ExternalLink, Mail, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDailyZmanim } from '@/data/synagogues';
import type { KnowledgeItem } from '@/lib/knowledgeStore';
import type { QuestionDestination } from '@/lib/rabbiQuestionsStore';

// Fetch knowledge from Supabase
let cachedKnowledge: KnowledgeItem[] = [];
let lastKnowledgeFetch = 0;
const getKnowledge = async (): Promise<KnowledgeItem[]> => {
  const now = Date.now();
  if (now - lastKnowledgeFetch < 30000 && cachedKnowledge.length > 0) return cachedKnowledge;
  lastKnowledgeFetch = now;
  const { data } = await supabase.from('knowledge_base').select('*').eq('is_active', true);
  if (data) cachedKnowledge = data.map(d => ({
    id: d.id, category: d.category, subcategory: d.subcategory || undefined,
    title: d.title, content: d.content, phone: d.phone || undefined,
    address: d.address || undefined, contact_name: d.contact_name || undefined,
  }));
  return cachedKnowledge;
};

const saveRabbiQuestion = async (q: { name: string; question: string; contact_method: string; contact_value: string; destination: string; urgent: boolean }) => {
  const { error } = await supabase.from('rabbi_questions').insert(q);
  return error;
};

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  type?: 'text' | 'rabbi_form';
}

type ConversationStep = 'categories' | 'ask_name' | 'show_info' | 'show_contact' | 'free' | 'rabbi_form';

const categories = [
  { id: 'zmanim', label: 'זמני היום', icon: Clock, gradient: 'from-amber-500 to-orange-600' },
  { id: 'prayers', label: 'זמני תפילות', icon: BookOpen, gradient: 'from-orange-500 to-red-600' },
  { id: 'events', label: 'שיעורים ואירועים', icon: Calendar, gradient: 'from-rose-500 to-pink-600' },
  { id: 'gemachim', label: 'גמ"חים', icon: Heart, gradient: 'from-red-500 to-rose-600' },
  { id: 'kashrut', label: 'כשרות', icon: Scale, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'mikveh', label: 'מקוואות', icon: Droplets, gradient: 'from-sky-500 to-cyan-600' },
  { id: 'marriage', label: 'נישואין', icon: HeartHandshake, gradient: 'from-pink-500 to-fuchsia-600' },
  { id: 'rabbi', label: 'שאל את הרב', icon: HelpCircle, gradient: 'from-amber-600 to-yellow-600' },
  { id: 'court', label: 'בית הדין', icon: Gavel, gradient: 'from-stone-500 to-stone-700' },
  { id: 'stam', label: 'מחלקת סת"ם', icon: Scroll, gradient: 'from-orange-600 to-amber-700' },
  { id: 'counseling', label: 'ייעוץ זוגי', icon: Users, gradient: 'from-teal-500 to-emerald-600' },
  { id: 'mourning', label: 'פטירה ואבלות', icon: Sparkles, gradient: 'from-slate-500 to-gray-700' },
];

const getContactInfo = (catId: string): string => {
  const contacts: Record<string, string> = {
    zmanim: '📞 משרד המועצה: 054-203-0901',
    prayers: '📞 משרד המועצה: 054-203-0901',
    events: '📞 054-203-0901\n📧 info@mechubarim.co.il',
    gemachim: '📞 054-203-0901',
    kashrut: '📞 מחלקת כשרות: 054-203-0901',
    mikveh: '📞 054-203-0901',
    marriage: '📞 רבנות: 054-203-0901',
    rabbi: '📞 הרב עוזיאל דיעי: 054-203-0901\nשעות קבלה: א\'-ה\' 09:00-12:00',
    court: '📞 בית הדין: 054-203-0901\nקבלת קהל: א\', ג\' 16:00-18:00',
    stam: '📞 מחלקת סת"ם: 054-203-0901',
    counseling: '📞 054-203-0901',
    mourning: '📞 חברה קדישא: 054-203-0901\nפעילים 24/6 (חוץ משבת)',
  };
  return contacts[catId] || '📞 054-203-0901';
};

// Cache for DB data so bot always has latest
let cachedSynagogues: any[] = [];
let cachedKashrut: any[] = [];
let cachedMikvaot: any[] = [];
let lastFetch = 0;

const fetchBotData = async () => {
  const now = Date.now();
  if (now - lastFetch < 30000 && cachedSynagogues.length > 0) return; // cache 30s
  lastFetch = now;
  
  const [synRes, prayerRes, lessonRes, kashrutRes, mikvaotRes] = await Promise.all([
    supabase.from('synagogues').select('*').order('name'),
    supabase.from('synagogue_prayer_times').select('*'),
    supabase.from('synagogue_lessons').select('*'),
    supabase.from('kashrut_establishments').select('*').eq('is_active', true),
    supabase.from('mikvaot').select('*').eq('is_active', true),
  ]);

  cachedSynagogues = (synRes.data || []).map(syn => ({
    ...syn,
    prayerTimes: (prayerRes.data || []).filter(p => p.synagogue_id === syn.id),
    lessons: (lessonRes.data || []).filter(l => l.synagogue_id === syn.id),
  }));
  cachedKashrut = kashrutRes.data || [];
  cachedMikvaot = mikvaotRes.data || [];
};

const getAnswerByCategory = async (catId: string): Promise<string> => {
  await fetchBotData();
  const knowledge = await getKnowledge();

  switch (catId) {
    case 'zmanim': {
      // Computed at answer time, so the bot cannot quote yesterday's sunset.
      const zmanimText = getDailyZmanim().map(z => `• ${z.name}: ${z.time}`).join('\n');
      return `🕐 **זמני היום — חצור הגלילית:**\n${zmanimText}`;
    }
    case 'prayers': {
      let results = '';
      for (const syn of cachedSynagogues) {
        const weekday = syn.prayerTimes.filter((p: any) => p.day === 'weekday');
        const shabbat = syn.prayerTimes.filter((p: any) => p.day === 'shabbat');
        results += `\n🏛 **${syn.name}** (${syn.nusach}):\n`;
        if (weekday.length) results += `חול: ${weekday.map((p: any) => `${p.name} ${p.time}`).join(' | ')}\n`;
        if (shabbat.length) results += `שבת: ${shabbat.map((p: any) => `${p.name} ${p.time}`).join(' | ')}\n`;
      }
      return `📿 **זמני תפילות:**${results}`;
    }
    case 'events': {
      let results = '';
      for (const syn of cachedSynagogues) {
        if (syn.lessons.length > 0) {
          results += `\n🏛 **${syn.name}:**\n`;
          results += syn.lessons.map((l: any) => `• ${l.subject} — ${l.teacher} (${l.day} ${l.time})`).join('\n');
        }
      }
      const kbEvents = knowledge.filter(k => k.category === 'מידע כללי' || k.category === 'אירועים');
      if (kbEvents.length) results += '\n\n' + kbEvents.map(k => `📋 **${k.title}**\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}`).join('\n\n');
      return results ? `📖 **שיעורים, פעילויות ואירועים:**${results}` : 'אין אירועים מתוכננים כרגע.';
    }
    case 'kashrut': {
      if (cachedKashrut.length > 0) {
        const mehadrin = cachedKashrut.filter(k => k.kashrut_level === 'mehadrin');
        const regular = cachedKashrut.filter(k => k.kashrut_level === 'regular');
        let result = '🍽 **כשרות בחצור הגלילית:**\n';
        if (mehadrin.length) result += `\n🏅 **מהדרין:**\n${mehadrin.map(k => `• ${k.name} (${k.category}) — ${k.address}${k.phone ? ` 📞 ${k.phone}` : ''}`).join('\n')}`;
        if (regular.length) result += `\n\n✅ **רגיל:**\n${regular.map(k => `• ${k.name} (${k.category}) — ${k.address}${k.phone ? ` 📞 ${k.phone}` : ''}`).join('\n')}`;
        return result;
      }
      const items = knowledge.filter(k => k.category === 'כשרות');
      if (items.length) return items.map(k => `🍽 **${k.title}**\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}`).join('\n\n---\n\n');
      return '🍽 **כשרות:**\nמחלקת כשרות חצור הגלילית\n📞 054-203-0901';
    }
    case 'mikveh': {
      if (cachedMikvaot.length > 0) {
        return cachedMikvaot.map(m => `🏊 **${m.name}**\n📍 ${m.address}${m.phone ? `\n📞 ${m.phone}` : ''}${m.opening_hours ? `\n🕐 ${m.opening_hours}` : ''}`).join('\n\n---\n\n');
      }
      const items = knowledge.filter(k => k.category === 'מקוואות');
      if (items.length) return items.map(k => `🏊 **${k.title}**\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}`).join('\n\n---\n\n');
      return '🏊 **מקוואות:**\nמקווה נשים: 04-XXXXXXX\nמקווה גברים: 04-XXXXXXX';
    }
    case 'gemachim': {
      const items = knowledge.filter(k => k.category === 'גמ"חים');
      if (items.length) return items.map(k => `💝 **${k.title}**${k.subcategory ? ` [${k.subcategory}]` : ''}\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}${k.address ? `\n📍 ${k.address}` : ''}`).join('\n\n---\n\n');
      return '💝 **גמ"חים בחצור הגלילית:**\nציוד רפואי, שמחות, ביגוד, מזון — פרטים בפורטל הניהול.';
    }
    case 'marriage': {
      const items = knowledge.filter(k => k.category === 'נישואין');
      if (items.length) return items.map(k => `💍 **${k.title}**\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}`).join('\n\n---\n\n');
      return '💍 **רישום לנישואין:**\nפנו לרבנות האזורית\n📞 054-203-0901';
    }
    case 'rabbi':
      return '🙏 **שאל את הרב:**\nהרב עוזיאל דיעי שליט"א\nרב העיר חצור הגלילית\n📞 054-203-0901\n\nשעות קבלה: א\'-ה\' 09:00-12:00';
    case 'court': {
      const items = knowledge.filter(k => k.category === 'בית דין');
      if (items.length) return items.map(k => `⚖️ **${k.title}**\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}`).join('\n\n---\n\n');
      return '⚖️ **בית הדין לממונות:**\nסכסוכי שכנים, תביעות ממוניות, בוררות.\n📞 054-203-0901\nקבלת קהל: א\', ג\' 16:00-18:00';
    }
    case 'stam': {
      const items = knowledge.filter(k => k.category === 'סת"ם');
      if (items.length) return items.map(k => `📜 **${k.title}**\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}`).join('\n\n---\n\n');
      return '📜 **מחלקת סת"ם:**\nבדיקת מזוזות ותפילין\n📞 054-203-0901';
    }
    case 'counseling': {
      const items = knowledge.filter(k => k.category === 'ייעוץ נישואין');
      if (items.length) return items.map(k => `👫 **${k.title}**\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}`).join('\n\n---\n\n');
      return '👫 **ייעוץ זוגי ומשפחתי:**\nהפניות דרך המועצה הדתית.\n📞 054-203-0901';
    }
    case 'mourning': {
      const items = knowledge.filter(k => k.category === 'פטירה ואבלות');
      if (items.length) return items.map(k => `🕯 **${k.title}**\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}`).join('\n\n---\n\n');
      return '🕯 **פטירה ואבלות:**\nחברה קדישא\n📞 054-203-0901\nפעילים 24/6 (חוץ משבת)';
    }
    default:
      return 'בחרו נושא מהרשימה.';
  }
};

const findAnswer = async (query: string): Promise<string> => {
  const q = query.trim().toLowerCase();
  await fetchBotData();
  const knowledge = await getKnowledge();

  if (q.includes('זמן') || q.includes('שקיעה') || q.includes('הנץ') || q.includes('עלות') || q.includes('צאת'))
    return getAnswerByCategory('zmanim');
  if (q.includes('תפיל') || q.includes('שחרית') || q.includes('מנחה') || q.includes('ערבית') || q.includes('מניין'))
    return getAnswerByCategory('prayers');
  if (q.includes('שיעור') || q.includes('לימוד') || q.includes('גמרא') || q.includes('פעילות'))
    return getAnswerByCategory('events');
  if (q.includes('מקוו') || q.includes('טבילה'))
    return getAnswerByCategory('mikveh');
  if (q.includes('נישואין') || q.includes('חתונה'))
    return getAnswerByCategory('marriage');
  if (q.includes('כשרות') || q.includes('כשר') || q.includes('מהדרין') || q.includes('מאפי'))
    return getAnswerByCategory('kashrut');
  if (q.includes('גמ"ח') || q.includes('גמח'))
    return getAnswerByCategory('gemachim');
  if (q.includes('סת"ם') || q.includes('מזוזה') || q.includes('תפילין'))
    return getAnswerByCategory('stam');
  if (q.includes('בית דין') || q.includes('ממונות'))
    return getAnswerByCategory('court');
  if (q.includes('ייעוץ') || q.includes('זוגי'))
    return getAnswerByCategory('counseling');
  if (q.includes('פטירה') || q.includes('אבלות') || q.includes('חברה קדישא'))
    return getAnswerByCategory('mourning');

  const matchedSyn = cachedSynagogues.find(s => q.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(q));
  if (matchedSyn) {
    const weekday = matchedSyn.prayerTimes.filter((p: any) => p.day === 'weekday');
    const shabbat = matchedSyn.prayerTimes.filter((p: any) => p.day === 'shabbat');
    let info = `🏛 **${matchedSyn.name}**\n📍 ${matchedSyn.neighborhood} | ${matchedSyn.nusach}\n\n`;
    if (weekday.length) info += `**חול:** ${weekday.map((p: any) => `${p.name} ${p.time}`).join(' | ')}\n`;
    if (shabbat.length) info += `**שבת:** ${shabbat.map((p: any) => `${p.name} ${p.time}`).join(' | ')}\n`;
    if (matchedSyn.lessons.length) info += `\n**שיעורים:** ${matchedSyn.lessons.map((l: any) => `${l.subject} (${l.day} ${l.time})`).join(' | ')}`;
    return info;
  }

  const kbResults = knowledge.filter(k =>
    k.title.toLowerCase().includes(q) || k.content.toLowerCase().includes(q) ||
    q.split(' ').some(word => word.length > 2 && (k.title.includes(word) || k.content.includes(word)))
  );
  if (kbResults.length > 0) {
    return kbResults.map(k => `📋 **${k.title}** (${k.category})\n${k.content}${k.phone ? `\n📞 ${k.phone}` : ''}`).join('\n\n---\n\n');
  }

  return 'SHOW_CATEGORIES';
};

// Inline Rabbi Question Form
const InlinRabbiForm = ({ userName, onSent }: { userName: string | null; onSent: () => void }) => {
  const [question, setQuestion] = useState('');
  const [contactMethod, setContactMethod] = useState<'email' | 'phone' | 'whatsapp'>('whatsapp');
  const [contactValue, setContactValue] = useState('');
  const [destination, setDestination] = useState<QuestionDestination>('beit_horaa');
  const [urgent, setUrgent] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim() || !contactValue.trim()) return;
    setError(false);
    const err = await saveRabbiQuestion({
      name: userName || 'אנונימי',
      question,
      contact_method: contactMethod,
      contact_value: contactValue,
      destination,
      urgent,
    });
    if (err) {
      setError(true);
      return;
    }
    setSent(true);
    onSent();
  };

  if (sent) {
    return (
      <div className="text-center py-3">
        <p className="text-primary font-bold text-sm">✅ השאלה נשלחה בהצלחה!</p>
        <p className="text-muted-foreground text-xs mt-1">התשובה תגיע אליך בהקדם</p>
      </div>
    );
  }

  const contactMethods = [
    { id: 'email' as const, label: 'מייל', icon: Mail },
    { id: 'phone' as const, label: 'טלפון', icon: Phone },
    { id: 'whatsapp' as const, label: 'וואטסאפ', icon: MessageCircle },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        <button onClick={() => setDestination('beit_horaa')}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${destination === 'beit_horaa' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>
          בית ההוראה
        </button>
        <button onClick={() => setDestination('rabbi')}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${destination === 'rabbi' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>
          הרב שליט"א
        </button>
      </div>

      <textarea
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="כתוב את שאלתך כאן..."
        rows={2}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
      />

      <div className="flex gap-1.5">
        {contactMethods.map(m => (
          <button key={m.id} onClick={() => setContactMethod(m.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${contactMethod === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>
            <m.icon className="w-3 h-3" />{m.label}
          </button>
        ))}
      </div>

      <input
        value={contactValue}
        onChange={e => setContactValue(e.target.value)}
        placeholder={contactMethod === 'email' ? 'your@email.com' : '050-0000000'}
        dir="ltr"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      <button onClick={() => setUrgent(!urgent)}
        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${urgent ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-muted text-muted-foreground border-border'}`}>
        <AlertTriangle className="w-3 h-3" />{urgent ? '⚡ סומן כדחוף' : 'סמן כפנייה דחופה'}
      </button>

      <button onClick={handleSubmit} disabled={!question.trim() || !contactValue.trim()}
        className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs hover:brightness-110 transition-all disabled:opacity-40">
        <Send className="w-3 h-3" /> שלח שאלה לרב
      </button>
      {error && (
        <p role="alert" className="text-center text-destructive font-bold text-[10px]">
          השאלה לא נשלחה עקב תקלה. נסה/י שוב.
        </p>
      )}
    </div>
  );
};

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showCategories, setShowCategories] = useState(true);
  const [input, setInput] = useState('');
  const [conversationStep, setConversationStep] = useState<ConversationStep>('categories');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showRabbiForm, setShowRabbiForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, showRabbiForm]);

  // Pre-fetch data when bot opens
  useEffect(() => {
    if (open) fetchBotData();
  }, [open]);

  const addBotMessage = (content: string, delay = 600) => {
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', content }]);
    }, delay);
  };

  const handleCategoryClick = (cat: typeof categories[0]) => {
    setShowCategories(false);
    setActiveCategoryId(cat.id);
    setShowRabbiForm(false);
    setMessages(prev => [...prev, { role: 'user', content: cat.label }]);
    setConversationStep('ask_name');
    addBotMessage(`שמחים שפנית אלינו בנושא **${cat.label}**! 😊\nנשמח לעזור לך בכל מה שתצטרך.\n\n**מה השם שלך?**`);
  };

  const handleNameResponse = async (name: string) => {
    setUserName(name);
    setConversationStep('show_info');
    addBotMessage(`שלום **${name}**! נעים מאוד 🤝\nהנה מידע ראשוני שיכול לעזור לך:`);

    setTimeout(async () => {
      const mainAnswer = await getAnswerByCategory(activeCategoryId || '');
      setMessages(prev => [...prev, { role: 'bot', content: mainAnswer }]);

      setTimeout(() => {
        setConversationStep('show_contact');
        setMessages(prev => [...prev, {
          role: 'bot',
          content: `💬 ${name}, רוצה **לשלוח שאלה לרב**? כתוב "שאלה לרב"\nאו כתוב "צור קשר" לפרטי התקשרות 📞\nאפשר גם להקליד שאלה חופשית!`
        }]);
      }, 1200);
    }, 1000);
  };

  const handleShowContact = () => {
    const catId = activeCategoryId || '';
    const contactInfo = getContactInfo(catId);
    const catLabel = categories.find(c => c.id === catId)?.label || 'השירות';
    const whatsappNumber = '972542030901';
    const whatsappText = encodeURIComponent(`שלום, אני ${userName || ''} ואני מעוניין/ת בנושא ${catLabel}`);

    setMessages(prev => [...prev, {
      role: 'bot',
      content: `📞 **פרטי התקשרות — ${catLabel}:**\n\n${contactInfo}\n\n📱 [לחץ כאן לשליחת וואטסאפ](https://wa.me/${whatsappNumber}?text=${whatsappText})`
    }]);
    setConversationStep('free');
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');

    if (conversationStep === 'ask_name') {
      handleNameResponse(userMsg);
      return;
    }

    const lower = userMsg.toLowerCase();

    if (lower.includes('שאלה לרב') || lower.includes('שאל את הרב')) {
      setShowRabbiForm(true);
      addBotMessage('📝 נפתח טופס שאלה לרב. מלא/י את הפרטים למטה:');
      return;
    }

    if (lower.includes('צור קשר') || lower.includes('טלפון') || lower.includes('וואטסאפ')) {
      handleShowContact();
      return;
    }

    if (lower.includes('תפריט') || lower.includes('חזור')) {
      setShowCategories(true);
      setConversationStep('categories');
      addBotMessage('בחר/י נושא מהתפריט:');
      return;
    }

    const answer = await findAnswer(userMsg);
    if (answer === 'SHOW_CATEGORIES') {
      setShowCategories(true);
      addBotMessage(`לא מצאתי תשובה ספציפית${userName ? `, ${userName}` : ''}. 🤔\nנסו לבחור נושא מהתפריט, או נסחו שאלה אחרת.\nניתן גם לכתוב **"שאלה לרב"** ונעביר את השאלה ישירות.`);
    } else {
      addBotMessage(answer);
      setTimeout(() => {
        addBotMessage(`💬 ${userName || 'ידידנו'}, יש לך שאלה נוספת?\n• כתוב **"תפריט"** לחזרה\n• כתוב **"שאלה לרב"** לפנייה אישית\n• או הקלד שאלה חופשית!`, 800);
      }, 600);
    }
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 left-6 z-50 w-16 h-16 rounded-full bg-gradient-hero text-primary-foreground shadow-elevated flex items-center justify-center hover:scale-110 transition-transform ${open ? 'hidden' : ''}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ rotate: [0, -10, 10, 0] }}
        aria-label="פתח צ'אט"
      >
        {/* הפקד נושא את הסמל של הפאנל שהוא פותח (`Bot`, כותרת "מחוברים בוט")
            ולא את `message-circle`, שמציין בעמוד הזה את הוואטסאפ. */}
        <Bot className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full animate-pulse-gentle" />
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-6 z-50 w-[370px] max-h-[85vh] bg-card rounded-3xl shadow-elevated border border-border/50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-hero px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-black text-primary-foreground text-base">מחוברים בוט</h3>
                  <p className="text-primary-foreground/60 text-[10px]">מועצה דתית חצור הגלילית</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-primary-foreground/60 hover:text-primary-foreground transition-colors" aria-label="סגור צ'אט">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <Bot className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-foreground font-bold text-sm">שלום! 👋</p>
                  <p className="text-muted-foreground text-xs mt-1">איך אפשר לעזור לך היום?</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}>
                    <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="underline font-bold">$1</a>')
                    }} />
                  </div>
                </motion.div>
              ))}

              {/* Rabbi form */}
              {showRabbiForm && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-muted rounded-2xl p-3">
                  <InlinRabbiForm userName={userName} onSent={() => {
                    setShowRabbiForm(false);
                    addBotMessage(`תודה ${userName || ''}! 🙏 השאלה נשלחה והרב יחזור אליך בהקדם.`);
                  }} />
                </motion.div>
              )}
            </div>

            {/* Categories grid */}
            {showCategories && (
              <div className="px-4 pb-3 grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    className="flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-xl bg-muted/60 hover:bg-primary/10 border border-border/30 hover:border-primary/20 transition-all text-center"
                  >
                    <cat.icon className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-foreground leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-border/50 bg-card shrink-0">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder={conversationStep === 'ask_name' ? 'הקלד/י את שמך...' : 'הקלד/י הודעה...'}
                  dir="rtl"
                  className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  aria-label="הקלד הודעה"
                />
                <button
                  onClick={handleSendMessage}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 transition-all shrink-0"
                  aria-label="שלח"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
