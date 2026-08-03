import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DonationSuccess() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-xl text-center">
      <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto mb-4" />
      <h1 className="font-heading text-3xl mb-3">תודה רבה!</h1>
      <p className="text-muted-foreground mb-6">התרומה התקבלה בהצלחה. קבלה תישלח לדוא״ל שלך.</p>
      <Button asChild><Link to="/">חזור לעמוד הבית</Link></Button>
    </div>
  );
}
