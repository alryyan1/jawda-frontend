import React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FirestoreDoctor, UpdateDoctorData } from "@/services/firestoreSpecialistService";

interface EditDoctorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  doctorToEdit: FirestoreDoctor | null;
  doctorEditForm: UpdateDoctorData;
  isPending: boolean;
  onFormChange: (data: UpdateDoctorData) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const EditDoctorDialog: React.FC<EditDoctorDialogProps> = ({
  isOpen,
  onOpenChange,
  doctorToEdit,
  doctorEditForm,
  isPending,
  onFormChange,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الطبيب</DialogTitle>
          <DialogDescription>{doctorToEdit?.docName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="docName">اسم الطبيب</Label>
              <Input
                id="docName"
                value={doctorEditForm.docName || ""}
                onChange={(e) =>
                  onFormChange({ ...doctorEditForm, docName: e.target.value })
                }
                placeholder="اسم الطبيب"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">رقم الهاتف</Label>
              <Input
                id="phoneNumber"
                value={doctorEditForm.phoneNumber || ""}
                onChange={(e) =>
                  onFormChange({
                    ...doctorEditForm,
                    phoneNumber: e.target.value,
                  })
                }
                placeholder="رقم الهاتف"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="morningPatientLimit">حد المرضى الصباحي</Label>
                <Input
                  id="morningPatientLimit"
                  type="number"
                  min="0"
                  value={doctorEditForm.morningPatientLimit || 0}
                  onChange={(e) =>
                    onFormChange({
                      ...doctorEditForm,
                      morningPatientLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="حد المرضى الصباحي"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eveningPatientLimit">حد المرضى المسائي</Label>
                <Input
                  id="eveningPatientLimit"
                  type="number"
                  min="0"
                  value={doctorEditForm.eveningPatientLimit || 0}
                  onChange={(e) =>
                    onFormChange({
                      ...doctorEditForm,
                      eveningPatientLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="حد المرضى المسائي"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">نشط</Label>
                <Switch
                  id="isActive"
                  checked={doctorEditForm.isActive ?? true}
                  onCheckedChange={(checked) =>
                    onFormChange({ ...doctorEditForm, isActive: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isBookingEnabled">الحجز متاح</Label>
                <Switch
                  id="isBookingEnabled"
                  checked={doctorEditForm.isBookingEnabled ?? false}
                  onCheckedChange={(checked) =>
                    onFormChange({
                      ...doctorEditForm,
                      isBookingEnabled: checked,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                "حفظ التغييرات"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDoctorDialog;

