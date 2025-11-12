// src/components/clinic/FavoriteServiceGroupsDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAllServiceGroupsList } from '@/services/serviceGroupService';
import type { ServiceGroup } from '@/types/services';
import { getFavoriteServiceGroups, saveFavoriteServiceGroups } from '@/lib/favoriteServiceGroups';
import { toast } from 'sonner';

interface FavoriteServiceGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FavoriteServiceGroupsDialog: React.FC<FavoriteServiceGroupsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  const { data: serviceGroups = [], isLoading } = useQuery<ServiceGroup[], Error>({
    queryKey: ['allServiceGroupsForFavorites'],
    queryFn: getAllServiceGroupsList,
    enabled: open,
  });

  // Load saved favorites when dialog opens
  useEffect(() => {
    if (open) {
      const favorites = getFavoriteServiceGroups();
      setSelectedGroupIds(favorites);
    }
  }, [open]);

  const handleToggleGroup = (groupId: number) => {
    setSelectedGroupIds((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleSave = () => {
    saveFavoriteServiceGroups(selectedGroupIds);
    toast.success(
      selectedGroupIds.length > 0
        ? `تم حفظ ${selectedGroupIds.length} مجموعة مفضلة`
        : 'تم مسح جميع المجموعات المفضلة'
    );
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('favoriteServiceGroupsChanged'));
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setSelectedGroupIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>اختر مجموعات الخدمات المفضلة</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-2">
              {serviceGroups.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  لا توجد مجموعات خدمات متاحة
                </p>
              ) : (
                serviceGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-accent rounded-md"
                  >
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={selectedGroupIds.includes(group.id)}
                      onCheckedChange={() => handleToggleGroup(group.id)}
                    />
                    <label
                      htmlFor={`group-${group.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {group.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
        <DialogFooter className="flex-row-reverse gap-2">
          <Button
            variant="outline"
            onClick={handleClearAll}
            disabled={selectedGroupIds.length === 0}
          >
            مسح الكل
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave}>
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FavoriteServiceGroupsDialog;

