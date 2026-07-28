import { PageHero } from "@/components/ui/PageHero";
import { InquiryForm } from "@/components/InquiryForm";

export function Contact() {
  return (
    <>
      <PageHero eyebrow="צור קשר" title="צור קשר עם המועצה הדתית" subtitle="נשמח לעמוד לרשותכם בכל שאלה או בקשה." />
      <div className="container-page py-16">
        <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 shadow-soft sm:p-8">
          <InquiryForm />
        </div>
      </div>
    </>
  );
}
