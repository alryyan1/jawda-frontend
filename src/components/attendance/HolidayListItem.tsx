// src/components/attendance/HolidayListItem.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Loader2, Repeat } from 'lucide-react';
import type { Holiday } from '@/types/attendance';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

interface HolidayListItemProps {
  holiday: Holiday;
  onEdit: (holiday: Holiday) => void;
  onDelete: (id: number, name: string) => void;
  isDeleting: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const HolidayListItem: React.FC<HolidayListItemProps> = ({
  holiday, onEdit, onDelete, isDeleting, canEdit = true, canDelete = true
}) => {
  const { t, i18n } = useTranslation(['attendance', 'common']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  return (
    <TableRow>
      <TableCell className="font-medium text-center">{holiday.name}</TableCell>
      <TableCell className="text-center">
        {format(parseISO(holiday.holiday_date), 'PPP', { locale: dateLocale })}
      </TableCell>
      <TableCell className="text-center hidden sm:table-cell">
        {holiday.is_recurring ? <Repeat className="h-4 w-4 mx-auto text-blue-500" /> : '-'}
      </TableCell>
      <TableCell className="hidden md:table-cell truncate max-w-xs" title={holiday.description || undefined}>
        {holiday.description || '-'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {canEdit && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(holiday)} className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(holiday.id, holiday.name)}
              disabled={isDeleting}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default HolidayListItem;