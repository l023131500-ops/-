import mashlima from "@/content/mashlima.json";
import regular from "@/content/regular.json";

export type Mashlima = {
  id: string; num: number; audience: string; title: string; meta: string; month: string;
  background: string[]; objectives: string[]; opening: string; story: string[]; activity: string;
  transition: string; crafts: { t: string; body: string }[]; rhyme: string[]; summary: string[];
  extensions: string[]; worksheet: string;
};
export type Regular = {
  id: string; topic: string; day: number; audience: string; title: string; meta: string;
  opening: string; teacherKnowledge: string[]; childLearning: string[]; deepening: string[];
  questions: string[]; summary: string; pasuk: string[]; sources: string; transitions: string[];
  crafts: { t: string; body: string }[]; worksheet: string;
};

export const mashlimaLessons = mashlima as Mashlima[];
export const regularLessons = regular as Regular[];

export function allCategories(): string[] {
  const set = new Set<string>();
  mashlimaLessons.forEach((l) => {
    const m = /תחום:\s*([^|]+)/.exec(l.meta || "");
    if (m) m[1].split(/[·,]/).forEach((c) => set.add(c.trim()));
  });
  return Array.from(set).filter(Boolean);
}

export function allMonths(): string[] {
  const set = new Set<string>();
  mashlimaLessons.forEach((l) => { if (l.month) set.add(l.month); });
  return Array.from(set);
}

export function findLesson(id: string): Mashlima | Regular | undefined {
  return (mashlimaLessons as any[]).concat(regularLessons as any[]).find((l) => l.id === id);
}
