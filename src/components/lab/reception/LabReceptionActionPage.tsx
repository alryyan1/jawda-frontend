import React from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { UserPlus, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabReceptionActionPageProps {
  isFormVisible: boolean;
  onToggleForm: () => void;
}

const LabReceptionActionPage: React.FC<LabReceptionActionPageProps> = ({
  isFormVisible,
  onToggleForm,
}) => {
  const { t, i18n } = useTranslation(['labReception', 'common']);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "bg-card border-border p-2 flex flex-col items-center space-y-2 overflow-y-auto h-full shadow-md",
          i18n.dir() === "rtl" ? "border-l" : "border-r"
        )}
        style={{ width: "60px" }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isFormVisible ? "secondary" : "ghost"}
              size="icon"
              className="w-11 h-11"
              onClick={onToggleForm}
              aria-label={
                isFormVisible
                  ? t('actions.viewPatientQueue', 'View Patient Queue')
                  : t('actions.registerNewPatient', 'Register New Patient')
              }
            >
              {isFormVisible ? (
                <LayoutGrid className="h-5 w-5" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
            <p>
              {isFormVisible
                ? t('actions.viewPatientQueue', 'View Patient Queue')
                : t('actions.registerNewPatient', 'Register New Patient')}
            </p>
          </TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  );
};

export default LabReceptionActionPage; 