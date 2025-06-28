// src/components/lab/workstation/LabAppearanceSettingsDialog.tsx (New File)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Paintbrush, RotateCcw, Save } from 'lucide-react';
import { getAppearanceSettings, saveAppearanceSettings, DEFAULT_APPEARANCE_SETTINGS, LabAppearanceSettings, ItemState } from '@/lib/appearance-settings-store';
import { toast } from 'sonner';

interface LabAppearanceSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // Callback to trigger a re-render of the parent component to apply new styles
  onSettingsChanged: () => void; 
}

// A sub-component for styling one state (e.g., Default, Selected)
const StyleEditor: React.FC<{
  title: string;
  state: ItemState;
  settings: LabAppearanceSettings;
  onSettingChange: (state: ItemState, property: keyof LabItemStyle, value: string | boolean) => void;
}> = ({ title, state, settings, onSettingChange }) => {
  const currentStyle = settings[state];
  return (
    <div className="p-3 border rounded-lg space-y-3">
      <h4 className="font-semibold text-sm">{title}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 items-center text-xs">
        <ColorInput label="Background" value={currentStyle.backgroundColor} onChange={e => onSettingChange(state, 'backgroundColor', e.target.value)} />
        <ColorInput label="Border" value={currentStyle.borderColor} onChange={e => onSettingChange(state, 'borderColor', e.target.value)} />
        <ColorInput label="Text" value={currentStyle.textColor} onChange={e => onSettingChange(state, 'textColor', e.target.value)} />
        <ColorInput label="Badge BG" value={currentStyle.badgeBackgroundColor} onChange={e => onSettingChange(state, 'badgeBackgroundColor', e.target.value)} />
        <ColorInput label="Badge Text" value={currentStyle.badgeTextColor} onChange={e => onSettingChange(state, 'badgeTextColor', e.target.value)} />
        <div className="flex items-center space-x-2">
          <Checkbox id={`${state}-isBold`} checked={currentStyle.isBold} onCheckedChange={checked => onSettingChange(state, 'isBold', !!checked)} />
          <Label htmlFor={`${state}-isBold`} className="font-normal">Bold Text</Label>
        </div>
      </div>
    </div>
  );
};

const ColorInput: React.FC<{ label: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement> }> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <Label htmlFor={`${label}-color`} className="flex-1">{label}:</Label>
    <input
      id={`${label}-color`}
      type="color"
      value={value}
      onChange={onChange}
      className="w-8 h-8 p-0 border-none rounded-md cursor-pointer"
    />
  </div>
);

const LabAppearanceSettingsDialog: React.FC<LabAppearanceSettingsDialogProps> = ({ isOpen, onOpenChange, onSettingsChanged }) => {
  const { t } = useTranslation('labResults');
  const [settings, setSettings] = useState<LabAppearanceSettings>(getAppearanceSettings);

  useEffect(() => {
    // When dialog opens, load the latest settings from localStorage
    if (isOpen) {
      setSettings(getAppearanceSettings());
    }
  }, [isOpen]);

  const handleSettingChange = (state: ItemState, property: keyof LabItemStyle, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [state]: {
        ...prev[state],
        [property]: value,
      },
    }));
  };

  const handleLockIconColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({
        ...prev,
        isLocked: {
            ...prev.isLocked,
            iconColor: e.target.value,
        }
    }));
  }

  const handleSave = () => {
    saveAppearanceSettings(settings);
    onSettingsChanged(); // Tell parent to re-render
    onOpenChange(false);
    toast.success(t('appearanceSettings.savedSuccess'));
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_APPEARANCE_SETTINGS);
    toast.info(t('appearanceSettings.resetToDefaults'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-primary" />
            {t('appearanceSettings.title')}
          </DialogTitle>
          <DialogDescription>{t('appearanceSettings.description')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow my-4 pr-3 -mr-3">
          <div className="space-y-4">
            <StyleEditor title={t('appearanceSettings.defaultState')} state="default" settings={settings} onSettingChange={handleSettingChange} />
            <StyleEditor title={t('appearanceSettings.selectedState')} state="selected" settings={settings} onSettingChange={handleSettingChange} />
            <StyleEditor title={t('appearanceSettings.printedState')} state="printed" settings={settings} onSettingChange={handleSettingChange} />
            <div className="p-3 border rounded-lg space-y-3">
                <h4 className="font-semibold text-sm">{t('appearanceSettings.otherStyles')}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 items-center text-xs">
                    <ColorInput label="Lock Icon" value={settings.isLocked.iconColor} onChange={handleLockIconColorChange} />
                </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleResetToDefaults}>
            <RotateCcw className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t('appearanceSettings.resetButton')}
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild><Button type="button" variant="secondary">{t('common:cancel')}</Button></DialogClose>
            <Button type="button" onClick={handleSave}>
              <Save className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {t('common:saveChanges')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabAppearanceSettingsDialog;