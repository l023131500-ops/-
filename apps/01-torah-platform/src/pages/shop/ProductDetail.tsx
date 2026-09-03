import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, ShoppingCart, ShoppingBag, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useCart } from "@/hooks/useCart";
import { formatILS } from "@/lib/utils";
import { toast } from "sonner";

export default function ProductDetail() {
  const { slug } = useParams();
  const { tenant } = useTenant();
  const nav = useNavigate();
  const addItem = useCart((s) => s.addItem);
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug, tenant?.id],
    enabled: !!tenant?.id && !!slug,
    queryFn: async () => {
      // PostgREST treats , and ( ) in an .or() filter string as condition/group
      // separators; without escaping, a slug containing them could break out
      // of the intended filter and append arbitrary clauses.
      const safeSlug = slug!.replace(/[,()]/g, "\\$&");
      const { data } = await supabase
        .from("products").select("*")
        .eq("tenant_id", tenant!.id)
        .or(`slug.eq.${safeSlug},id.eq.${safeSlug}`)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-10">טוען...</div>;
  if (!product) return <div className="container mx-auto px-4 py-10">מוצר לא נמצא</div>;

  const inStock = product.stock === null || product.stock > 0;
  const image = product.images?.[0];

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <Button asChild variant="ghost" className="mb-4"><Link to="/shop"><ArrowRight className="ml-2 h-4 w-4" /> חזור לחנות</Link></Button>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {image ? (
            <img src={image} alt={product.name} className="w-full aspect-square object-cover rounded-lg bg-muted" />
          ) : (
            <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
              <ShoppingBag className="h-24 w-24 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div>
          <h1 className="font-heading text-3xl md:text-4xl mb-2">{product.name}</h1>
          {product.short_description && <p className="text-muted-foreground mb-4">{product.short_description}</p>}
          {product.is_featured && <Badge className="mb-3">מומלץ</Badge>}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-heading text-primary">{formatILS(product.price_ils)}</span>
            {product.compare_at_price_ils != null && product.compare_at_price_ils > product.price_ils && (
              <span className="text-lg text-muted-foreground line-through">{formatILS(product.compare_at_price_ils)}</span>
            )}
          </div>
          {!inStock && <Badge variant="destructive" className="mb-3">אזל מהמלאי</Badge>}
          {product.description && <div className="prose max-w-none mb-6 text-foreground/85 whitespace-pre-wrap">{product.description}</div>}

          {inStock && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-medium">כמות:</span>
                <div className="flex items-center border rounded-md">
                  <Button variant="ghost" size="icon" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
                  <span className="w-10 text-center">{qty}</span>
                  <Button variant="ghost" size="icon" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button size="lg" onClick={() => {
                  addItem({ product_id: product.id, product_name: product.name, unit_price_ils: product.price_ils, quantity: qty, image_url: image });
                  toast.success("נוסף לעגלה");
                }}>
                  <ShoppingCart className="ml-2 h-4 w-4" /> הוסף לעגלה
                </Button>
                <Button size="lg" variant="gold" onClick={() => {
                  addItem({ product_id: product.id, product_name: product.name, unit_price_ils: product.price_ils, quantity: qty, image_url: image });
                  nav("/checkout");
                }}>קנייה מהירה</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
