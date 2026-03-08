import { Home, Tag, User, ShoppingCart, PlayCircle, Wallet } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (user && profile?.user_type === 'customer') {
      supabase
        .from('customer_wallets')
        .select('balance')
        .eq('customer_user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setWalletBalance(data.balance);
        });
    }
  }, [user, profile]);

  const tabs = [
    { icon: Home, label: "Home", path: "/" },
    { icon: PlayCircle, label: "Play", path: "/play" },
    ...(user && walletBalance !== null
      ? [{ icon: Wallet, label: `₹${walletBalance}`, path: "/customer/wallet" }]
      : [{ icon: Tag, label: "Top Deals", path: "/" }]),
    { icon: User, label: "Account", path: "/customer/profile" },
    { icon: ShoppingCart, label: "Cart", path: "/cart" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map((t) => (
          <button
            key={t.label}
            onClick={() => navigate(t.path)}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
              location.pathname === t.path
                ? "text-primary"
                : t.path === "/customer/wallet"
                  ? "text-emerald-600"
                  : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-5 w-5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
