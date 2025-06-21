// src/components/lab/sample_collection/SampleActionsPane.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Printer as PrinterIcon,
  Settings2 as SettingsIcon,
  ListChecks,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface SampleActionsPaneProps {
  selectedVisitId: number | null;
  canMarkAllCollected: boolean; // True if there are uncollected samples for the selected visit
  onMarkAllCollectedSuccess: (updatedCount: number) => void;
  onPrintAllLabels: () => void; // Callback to trigger PDF generation from parent
  // Add onSettingsClick if needed for lab settings specific to sample collection
}

const SampleActionsPane: React.FC<SampleActionsPaneProps> = ({
  selectedVisitId,
  canMarkAllCollected,
  onMarkAllCollectedSuccess,
  onPrintAllLabels,
}) => {
  const { t, i18n } = useTranslation([
    "labSampleCollection",
    "common",
    "labResults",
  ]);
  // const queryClient = useQueryClient(); // Not directly used here, parent handles invalidation

  const markAllMutation = useMutation({
    mutationFn: () => {
      // Mock implementation - replace with actual API call
      return Promise.resolve({ updated_count: 0, message: "Not implemented" });
    },
    onSuccess: (data) => {
      onMarkAllCollectedSuccess(data.updated_count);
    },
    onError: (error: Error) => {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message || t("common:error.operationFailed")
      );
    },
  });

  const handleMarkAll = () => {
    if (selectedVisitId && canMarkAllCollected) {
      markAllMutation.mutate();
    } else if (!selectedVisitId) {
      toast.info(t("labSampleCollection:selectVisitFirst"));
    } else if (!canMarkAllCollected) {
      // Explicitly check this condition
      toast.info(t("labSampleCollection:noSamplesToMarkAll"));
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "bg-card border-border p-1.5 flex flex-col items-center space-y-2 overflow-y-auto h-full shadow-md",
          i18n.dir() === "rtl"
            ? "border-r dark:border-slate-700"
            : "border-l dark:border-slate-700"
        )}
        style={{ width: "56px" }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              onClick={handleMarkAll}
              disabled={
                !selectedVisitId ||
                !canMarkAllCollected ||
                markAllMutation.isPending
              }
              aria-label={t("labSampleCollection:actions.markAllCollected")}
            >
              {markAllMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ListChecks className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side={i18n.dir() === "rtl" ? "left" : "right"}
            sideOffset={5}
          >
            <p>{t("labSampleCollection:actions.markAllCollected")}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              onClick={onPrintAllLabels}
              disabled={!selectedVisitId}
            >
              <PrinterIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side={i18n.dir() === "rtl" ? "left" : "right"}
            sideOffset={5}
          >
            <p>{t("labSampleCollection:actions.printAllLabels")}</p>
          </TooltipContent>
        </Tooltip>

        <Separator className="my-2" />

        <div className="flex-grow"></div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              onClick={() =>
                toast.info(
                  "Navigate to Lab Settings (Sample Collection Module)"
                )
              }
            >
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side={i18n.dir() === "rtl" ? "left" : "right"}
            sideOffset={5}
          >
            <p>{t("labResults:labActions.labSettings")}</p>
          </TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  );
};

export default SampleActionsPane;
