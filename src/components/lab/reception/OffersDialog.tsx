import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import apiClient from "@/services/api";
import { useQuery } from "@tanstack/react-query";

type OfferedMainTest = {
  id: number;
  main_test_name: string;
  pivot?: { price?: number };
  price?: number; // sometimes APIs include price directly
};

type Offer = {
  id: number;
  name: string;
  price: number | string;
  main_tests?: OfferedMainTest[]; // Laravel relation uses snake_case by default
  mainTests?: OfferedMainTest[]; // fallback if transformed
};

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (payload: { mainTestIds: number[]; overridePrices: Record<number, number> }) => void;
};

const OffersDialog: React.FC<Props> = ({ isOpen, onOpenChange, onApply }) => {
  const [query, setQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());

  const { data, isLoading, isError } = useQuery<Offer[], Error>({
    queryKey: ["offers", isOpen],
    queryFn: async () => {
      const res = await apiClient.get("/offers");
      return res.data?.data || [];
    },
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const offers = React.useMemo(() => data || [], [data]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter((o) =>
      String(o.id).includes(q) ||
      (o.name || "").toLowerCase().includes(q)
    );
  }, [offers, query]);

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedOffers = React.useMemo(() => offers.filter((o) => selectedIds.has(o.id)), [offers, selectedIds]);
  const selectedTotal = React.useMemo(
    () => selectedOffers.reduce((sum, o) => sum + Number(o.price || 0), 0),
    [selectedOffers]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>عروض المختبر</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-3">
          <Input
            placeholder="ابحث باسم العرض أو الرقم"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button variant="secondary" onClick={() => setQuery("")}>مسح</Button>
        </div>

        {isLoading && (
          <div className="py-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
        )}
        {isError && !isLoading && (
          <div className="py-8 text-center text-sm text-red-600">فشل في جلب العروض</div>
        )}

        {!isLoading && !isError && (
          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-12 font-semibold bg-muted px-3 py-2 text-sm">
              <div className="col-span-1 text-center">اختر</div>
              <div className="col-span-8">اسم العرض</div>
              <div className="col-span-3 text-left">السعر</div>
            </div>
            <div className="max-h-[480px] overflow-auto">
              {filtered.map((offer) => (
                <div
                  key={offer.id}
                  className="grid grid-cols-12 items-center px-3 py-2 border-t text-sm hover:bg-accent/30 cursor-pointer select-none"
                  onClick={() => toggleOne(offer.id)}
                  role="button"
                  aria-pressed={selectedIds.has(offer.id)}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(offer.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleOne(offer.id)}
                    />
                  </div>
                  <div className="col-span-8 font-medium truncate" title={offer.name}>{offer.name}</div>
                  <div className="col-span-3 text-left">{Number(offer.price || 0).toFixed(2)}</div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-muted-foreground text-sm">لا توجد عروض مطابقة</div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-muted-foreground">
            المحدد: <span className="font-semibold">{selectedOffers.length}</span> | الإجمالي: <span className="font-semibold">{selectedTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            {onApply && (
              <Button
                disabled={selectedOffers.length === 0}
                onClick={() => {
                  // Aggregate all tests from selected offers, building override price map
                  const overridePrices: Record<number, number> = {};
                  const mainTestIds: number[] = [];
                  selectedOffers.forEach((offer) => {
                    const tests = (offer.mainTests || offer.main_tests || []) as OfferedMainTest[];
                    tests.forEach((t) => {
                      const price = (t.pivot?.price ?? t.price ?? 0) as number;
                      overridePrices[t.id] = price; // last one wins if duplicates across offers
                      mainTestIds.push(t.id);
                    });
                  });
                  // De-duplicate test IDs
                  const uniqueIds = Array.from(new Set(mainTestIds));
                  onApply({ mainTestIds: uniqueIds, overridePrices });
                }}
              >
                تطبيق
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>إغلاق</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OffersDialog;


