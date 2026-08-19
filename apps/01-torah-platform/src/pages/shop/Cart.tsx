import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingCart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { formatILS } from "@/lib/utils";

export default function Cart() {
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const updateQty = useCart((s) => s.updateQty);
  const removeItem = useCart((s) => s.removeItem);
  const nav = useNavigate();

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="font-heading text-3xl mb-6 flex items-center gap-2"><ShoppingCart className="h-7 w-7" /> סל הקניות</h1>

      {items.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4">הסל ריק</p>
          <Button asChild><Link to="/shop">לחנות</Link></Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.product_id}>
              <CardContent className="py-4 flex items-center gap-4">
                {it.image_url ? <img src={it.image_url} alt="" className="w-20 h-20 object-cover rounded" /> : <div className="w-20 h-20 bg-muted rounded" />}
                <div className="flex-1">
                  <div className="font-medium">{it.product_name}</div>
                  <div className="text-sm text-muted-foreground">{formatILS(it.unit_price_ils)} ליחידה</div>
                </div>
                <div className="flex items-center border rounded-md">
                  <Button variant="ghost" size="icon" onClick={() => updateQty(it.product_id, it.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                  <span className="w-10 text-center">{it.quantity}</span>
                  <Button variant="ghost" size="icon" onClick={() => updateQty(it.product_id, it.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="font-medium w-24 text-left">{formatILS(it.unit_price_ils * it.quantity)}</div>
                <Button variant="ghost" size="icon" onClick={() => removeItem(it.product_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="py-6 flex justify-between items-center">
              <div className="text-xl font-heading">סה״כ: <span className="text-primary">{formatILS(total)}</span></div>
              <Button size="lg" onClick={() => nav("/checkout")}>המשך לתשלום</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
