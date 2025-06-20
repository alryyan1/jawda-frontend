// src/components/lab/workstation/ManageDeviceNormalRangeDialog.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  PlusCircle,
  Settings2,
  WandSparkles,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import apiClient from "@/services/api";

import type { ChildTestWithResult } from "@/types/labWorkflow";
import AddDeviceQuickDialog from "./AddDeviceQuickDialog";

// Define Device type locally since it's not exported from labTests
interface Device {
  id: number;
  name: string;
}

const fetchDevicesList = async (): Promise<Device[]> => {
  const response = await apiClient.get("/devices-list");
  return response.data.data;
};

interface DeviceNormalRangeData {
  id?: number;
  child_test_id: number;
  device_id: number;
  normal_range: string;
}

const fetchDeviceNormalRange = async (
  childTestId: number,
  deviceId: number
): Promise<DeviceNormalRangeData> => {
  const response = await apiClient.get(
    `/child-tests/${childTestId}/devices/${deviceId}/normal-range`
  );
  return response.data.data;
};

const saveDeviceNormalRange = async (
  childTestId: number,
  deviceId: number,
  normalRange: string
): Promise<DeviceNormalRangeData> => {
  const response = await apiClient.post(
    `/child-tests/${childTestId}/devices/${deviceId}/normal-range`,
    { normal_range: normalRange }
  );
  return response.data.data;
};

interface ManageDeviceNormalRangeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  childTest: ChildTestWithResult | null;
  currentResultNormalRange: string | null | undefined;
  onApplyRangeToResultField?: (newRange: string) => void;
}

const ManageDeviceNormalRangeDialog: React.FC<
  ManageDeviceNormalRangeDialogProps
> = ({
  isOpen,
  onOpenChange,
  childTest,
  currentResultNormalRange,
  onApplyRangeToResultField,
}) => {
  const { t, i18n } = useTranslation(["labResults", "common"]);
  const queryClient = useQueryClient();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [normalRangeInput, setNormalRangeInput] = useState<string>("");
  const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] = useState(false); // State for quick add dialog

  const { data: devices = [], isLoading: isLoadingDevices, refetch: refetchDevices } = useQuery<
    Device[],
    Error
  >({
    queryKey: ["labDevicesListForDialog"],
    queryFn: fetchDevicesList,
    enabled: isOpen,
  });

  const deviceNormalRangeQueryKey = useMemo(
    () => ["deviceNormalRange", childTest?.id, selectedDeviceId] as const,
    [childTest?.id, selectedDeviceId]
  );

  const { data: fetchedDeviceRangeData, isLoading: isLoadingRange } = useQuery<
    DeviceNormalRangeData,
    Error
  >({
    queryKey: deviceNormalRangeQueryKey,
    queryFn: () => {
      if (!childTest?.id || !selectedDeviceId)
        throw new Error("Child test and device must be selected.");
      return fetchDeviceNormalRange(childTest.id, parseInt(selectedDeviceId));
    },
    enabled: isOpen && !!childTest?.id && !!selectedDeviceId,
    placeholderData: (prevData) => prevData,
  });

  // Update normalRangeInput when data is fetched
  useEffect(() => {
    if (fetchedDeviceRangeData?.normal_range) {
      setNormalRangeInput(fetchedDeviceRangeData.normal_range);
    }
  }, [fetchedDeviceRangeData]);

  const saveRangeMutation = useMutation({
    mutationFn: (payload: {
      childTestId: number;
      deviceId: number;
      normalRange: string;
    }) =>
      saveDeviceNormalRange(
        payload.childTestId,
        payload.deviceId,
        payload.normalRange
      ),
    onSuccess: (savedData) => {
      toast.success(t("labResults:deviceNormalRange.savedSuccess"));
      queryClient.setQueryData(deviceNormalRangeQueryKey, savedData);
      setNormalRangeInput(savedData.normal_range);
    },
    onError: () => toast.error(t("labResults:deviceNormalRange.saveError")),
  });

  useEffect(() => {
    if (isOpen && devices.length > 0 && !selectedDeviceId) {
      // Don't auto-select if a selection was already made or if dialog just opened
      // This prevents resetting selection if list refetches.
    }
    if (!isOpen) {
      setSelectedDeviceId("");
      setNormalRangeInput("");
    }
  }, [isOpen]);
  const handleDeviceAdded = (newDevice: Device) => {
    refetchDevices().then(() => { // Refetch the devices list
        setSelectedDeviceId(String(newDevice.id)); // Auto-select the newly added device
    });
    setIsAddDeviceDialogOpen(false); // Close the quick add dialog
  };
  const handleSave = () => {
    if (!childTest?.id || !selectedDeviceId || saveRangeMutation.isPending)
      return;
    saveRangeMutation.mutate({
      childTestId: childTest.id,
      deviceId: parseInt(selectedDeviceId),
      normalRange: normalRangeInput,
    });
  };

  const handleApplyToCurrent = () => {
    if (onApplyRangeToResultField) {
      onApplyRangeToResultField(normalRangeInput);
      toast.info(t("labResults:deviceNormalRange.appliedToCurrentResult"));
    }
    onOpenChange(false);
  };

  const isSaveDisabled =
    !selectedDeviceId ||
    isLoadingRange ||
    saveRangeMutation.isPending ||
    normalRangeInput === (fetchedDeviceRangeData?.normal_range || "");
  const isApplyDisabled =
    !selectedDeviceId ||
    isLoadingRange ||
    saveRangeMutation.isPending ||
    normalRangeInput === (currentResultNormalRange || "");

  return (
    <>
    
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {t("labResults:deviceNormalRange.dialogTitle")}
          </DialogTitle>
          {childTest && (
            <DialogDescription>
              {t("labResults:deviceNormalRange.forTest", {
                testName: childTest.child_test_name,
              })}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4 space-y-4">
        <div>
                             <Label htmlFor="device-select" className="flex justify-between items-center">
                 {t('labResults:deviceNormalRange.selectDevice')}
                 <Button 
                   type="button" 
                   variant="ghost" 
                   size="icon" 
                   className="h-6 w-6 p-0"
                   onClick={() => setIsAddDeviceDialogOpen(true)}
                   title={t('labResults:devices.quickAddTitle')}
                 >
                   <PlusCircle className="h-4 w-4 text-primary"/>
                 </Button>
               </Label>
              <Select
                value={selectedDeviceId}
                onValueChange={setSelectedDeviceId}
                disabled={isLoadingDevices || devices.length === 0}
                dir={i18n.dir()}
              >
                <SelectTrigger id="device-select" className="mt-1">
                  <SelectValue placeholder={isLoadingDevices ? t('common:loading') : t('labResults:deviceNormalRange.devicePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={String(device.id)}>{device.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          {selectedDeviceId && (
            <div>
              <Label htmlFor="device-normal-range-input">
                {t("labResults:deviceNormalRange.normalRangeForDevice", {
                  deviceName:
                    devices.find((d) => String(d.id) === selectedDeviceId)
                      ?.name || "",
                })}
              </Label>
              {isLoadingRange ? (
                <div className="flex justify-center items-center h-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Textarea
                  id="device-normal-range-input"
                  value={normalRangeInput}
                  onChange={(e) => setNormalRangeInput(e.target.value)}
                  rows={3}
                  className="mt-1"
                  placeholder={t(
                    "labResults:deviceNormalRange.rangeInputPlaceholder"
                  )}
                  disabled={saveRangeMutation.isPending}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {onApplyRangeToResultField && (
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyToCurrent}
              disabled={isApplyDisabled}
              className="text-xs"
            >
              <WandSparkles className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("labResults:deviceNormalRange.applyToCurrentResult")}
            </Button>
          )}
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t("common:cancel")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaveDisabled}
            >
              {saveRangeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
              )}
              {t("common:saveChanges")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
      {/* Render the AddDeviceQuickDialog */}
      <AddDeviceQuickDialog
        isOpen={isAddDeviceDialogOpen}
        onOpenChange={setIsAddDeviceDialogOpen}
        onDeviceAdded={handleDeviceAdded}
      />
    </>
    
  );
};

export default ManageDeviceNormalRangeDialog;
