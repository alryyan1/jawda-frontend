import React from 'react';
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateEmptyOrder } from "@/hooks/useCreateEmptyOrder";

export const POSNewOrderButton: React.FC = () => {
  const { t } = useTranslation(["pos"]);
  const { createNewOrder, isCreating } = useCreateEmptyOrder();

  const handleCreateOrder = () => {
    createNewOrder();
  };

  return (
    <Button
      onClick={handleCreateOrder}
      disabled={isCreating}
      size="sm"
      className="flex items-center gap-2"
      title={t("createNewOrder", { defaultValue: "Create new order" })}
    >
      {isCreating ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {t("creating", { defaultValue: "Creating..." })}
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          {t("newOrder", { defaultValue: "New Order" })}
        </>
      )}
    </Button>
  );
}; 