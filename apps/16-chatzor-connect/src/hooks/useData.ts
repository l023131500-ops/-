import { useQuery } from "@tanstack/react-query";
import {
  getSynagogueBySlug,
  listAnnouncements,
  listLessons,
  listPrayerTimes,
  listServices,
  listSynagogues,
} from "@/data/repositories";

export const useSynagogues = () =>
  useQuery({ queryKey: ["synagogues"], queryFn: listSynagogues });

export const useSynagogue = (slug: string) =>
  useQuery({ queryKey: ["synagogue", slug], queryFn: () => getSynagogueBySlug(slug), enabled: !!slug });

export const usePrayerTimes = (synagogueId: string | undefined) =>
  useQuery({
    queryKey: ["prayer-times", synagogueId],
    queryFn: () => listPrayerTimes(synagogueId!),
    enabled: !!synagogueId,
  });

export const useLessons = (synagogueId?: string) =>
  useQuery({ queryKey: ["lessons", synagogueId ?? "all"], queryFn: () => listLessons(synagogueId) });

export const useServices = () =>
  useQuery({ queryKey: ["services"], queryFn: listServices });

export const useAnnouncements = (synagogueId?: string) =>
  useQuery({ queryKey: ["announcements", synagogueId ?? "all"], queryFn: () => listAnnouncements(synagogueId) });
