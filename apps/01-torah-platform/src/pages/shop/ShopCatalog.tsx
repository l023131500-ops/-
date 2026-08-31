import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { formatILS } from "@/lib/utils";

export default function ShopCatalog() {
  const { tenant } = useTenant();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { data: categories } = useQuery({
    queryKey: ["product-categories", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("product_categories").select("*").eq("tenant_id", tenant!.id).eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", tenant?.id, q, category],
    enabled: !!tenant?.id,
    queryFn: async () => {
      let qb = supabase.from("products").select("*").eq("tenant_id", tenant!.id).eq("is_active", true).order("created_at", { ascending: false });
      if (category !== "all") qb = qb.eq("category_id", category);
      // PostgREST treats , and ( ) in an .or() filter string as condition/group
      // separators; without escaping, a search term containing them could break
      // out of the intended filter and append arbitrary clauses.
      if (q) {
        const safeQ = q.replace(/[,()]/g, "\\$&");
        qb = qb.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
      }
      const { data } = await qb;
      return data || [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6"><ShoppingBag className="h-8 w-8 text-primary" /><h1 className="font-heading text-3xl md:text-4xl">תשמישי קדושה</h1></div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש מוצר..." className="pr-10" />
        </div>
      </div>

      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")}>הכל</Button>
          {categories.map((c: any) => (
            <Button key={c.id} size="sm" variant={category === c.id ? "default" : "outline"} onClick={() => setCategory(c.id)}>{c.name}</Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : (products?.length || 0) === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">אין מוצרים זמינים כרגע</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products!.map((p: any) => (
            <Link key={p.id} to={`/shop/${p.slug || p.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                {/* products stores a gallery in `images`; there is no image_url. */}
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full aspect-square object-cover bg-muted" />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="font-medium line-clamp-1">{p.name}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.short_description}</div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-heading text-lg text-primary">{formatILS(p.price_ils)}</span>
                    {p.stock !== null && p.stock <= 0 && <Badge variant="destructive">אזל</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
