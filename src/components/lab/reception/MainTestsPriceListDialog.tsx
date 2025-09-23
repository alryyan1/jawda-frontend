import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import type { MainTestStripped } from "@/types/labTests";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tests: MainTestStripped[];
};

const MainTestsPriceListDialog: React.FC<Props> = ({ isOpen, onOpenChange, tests }) => {
  const [query, setQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter(t =>
      String(t.id).includes(q) ||
      (t.main_test_name?.toLowerCase() || "").includes(q)
    );
  }, [tests, query]);

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isAllVisibleSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        filtered.forEach(t => next.delete(t.id));
      } else {
        filtered.forEach(t => next.add(t.id));
      }
      return next;
    });
  };

  const selectedItems = tests.filter(t => selectedIds.has(t.id));
  const total = selectedItems.reduce((sum, t) => sum + (Number(t.price) || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>قائمة أسعار الفحوصات</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-3">
          <Input
            placeholder="بحث بالرقم أو الاسم"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button variant="secondary" onClick={() => setQuery("")}>مسح</Button>
          <Button variant="outline" onClick={toggleAllVisible} disabled={filtered.length === 0}>
            {isAllVisibleSelected ? "إلغاء تحديد الظاهر" : "تحديد الظاهر"}
          </Button>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 font-semibold bg-muted px-3 py-2 text-sm">
            <div className="col-span-1 text-center">اختر</div>
            <div className="col-span-2">رقم</div>
            <div className="col-span-7">اسم الفحص</div>
            <div className="col-span-2 text-left">السعر</div>
          </div>
          <div className="max-h-[420px] overflow-auto">
            {filtered.map(test => (
              <div
                key={test.id}
                className="grid grid-cols-12 items-center px-3 py-2 border-t text-sm hover:bg-accent/30 cursor-pointer select-none"
                onClick={() => toggleOne(test.id)}
                role="button"
                aria-pressed={selectedIds.has(test.id)}
              >
                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(test.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleOne(test.id)}
                  />
                </div>
                <div className="col-span-2">{test.id}</div>
                <div className="col-span-7">{test.main_test_name}</div>
                <div className="col-span-2 text-left">{Number(test.price || 0).toFixed(2)}</div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-muted-foreground text-sm">لا توجد نتائج</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm">
            المحدد: <span className="font-semibold">{selectedItems.length}</span>
          </div>
          <div className="text-base font-bold">
            الإجمالي: {total.toFixed(2)}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" onClick={() => setSelectedIds(new Set())}>تفريغ التحديد</Button>
          <Button onClick={() => onOpenChange(false)}>إغلاق</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MainTestsPriceListDialog;


