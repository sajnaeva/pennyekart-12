import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ShoppingCart, Image, Store, Truck } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { usePermissions } from "@/hooks/usePermissions";

interface StatCard {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  perm: string | null;
}

const Dashboard = () => {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [stats, setStats] = useState({
    users: 0, products: 0, sellerProducts: 0, orders: 0, banners: 0, deliveryStaff: 0, sellers: 0,
  });

  const canSee = (perm: string | null) => {
    if (!perm) return true;
    return isSuperAdmin || hasPermission(perm);
  };

  useEffect(() => {
    const fetchStats = async () => {
      const queries: PromiseLike<any>[] = [];
      const keys: string[] = [];

      if (canSee("read_users")) {
        queries.push(supabase.from("profiles").select("id", { count: "exact", head: true }).then());
        keys.push("users");
        queries.push(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "delivery_staff").then());
        keys.push("deliveryStaff");
        queries.push(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "selling_partner").then());
        keys.push("sellers");
      }
      if (canSee("read_products")) {
        queries.push(supabase.from("products").select("id", { count: "exact", head: true }).then());
        keys.push("products");
        queries.push(supabase.from("seller_products").select("id", { count: "exact", head: true }).then());
        keys.push("sellerProducts");
      }
      if (canSee("read_orders")) {
        queries.push(supabase.from("orders").select("id", { count: "exact", head: true }).then());
        keys.push("orders");
      }
      if (canSee("read_banners")) {
        queries.push(supabase.from("banners").select("id", { count: "exact", head: true }).then());
        keys.push("banners");
      }

      const results = await Promise.all(queries);
      const newStats = { ...stats };
      results.forEach((r, i) => {
        (newStats as any)[keys[i]] = r.count ?? 0;
      });
      setStats(newStats);
    };
    fetchStats();
  }, [isSuperAdmin]);

  const allCards: StatCard[] = [
    { label: "Users", value: stats.users, icon: Users, color: "text-blue-600", perm: "read_users" },
    { label: "Products", value: stats.products, icon: Package, color: "text-green-600", perm: "read_products" },
    { label: "Seller Products", value: stats.sellerProducts, icon: Store, color: "text-teal-600", perm: "read_products" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, color: "text-amber-600", perm: "read_orders" },
    { label: "Banners", value: stats.banners, icon: Image, color: "text-purple-600", perm: "read_banners" },
    { label: "Delivery Staff", value: stats.deliveryStaff, icon: Truck, color: "text-orange-600", perm: "read_users" },
    { label: "Selling Partners", value: stats.sellers, icon: Store, color: "text-indigo-600", perm: "read_users" },
  ];

  const visibleCards = allCards.filter((c) => canSee(c.perm));

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      {visibleCards.length === 0 ? (
        <p className="text-muted-foreground">No data available for your permissions.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleCards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default Dashboard;
