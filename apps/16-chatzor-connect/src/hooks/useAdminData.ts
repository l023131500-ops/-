import { useQuery } from "@tanstack/react-query";
import { listAllSynagogues, listInquiries, listRabbiQuestions } from "@/data/repositories";

export const useAllSynagogues = () =>
  useQuery({ queryKey: ["all-synagogues"], queryFn: listAllSynagogues });

export const useInquiries = () =>
  useQuery({ queryKey: ["inquiries"], queryFn: listInquiries });

export const useRabbiQuestions = () =>
  useQuery({ queryKey: ["rabbi-questions"], queryFn: listRabbiQuestions });
