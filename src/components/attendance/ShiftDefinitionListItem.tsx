// src/components/attendance/ShiftDefinitionListItem.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge'; // Using shadcn Badge
import { Edit, Trash2, Loader2 } from 'lucide-react';
import type { ShiftDefinition } from '@/types/attendance';
import { cn } from '@/lib/utils';

interface ShiftDefinitionListItemProps {
  shift: ShiftDefinition;
  onEdit: (shift: ShiftDefinition) => void;
  onDelete: (id: number, name: string) => void;
  isDeleting: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const ShiftDefinitionListItem: React.FC<ShiftDefinitionListItemProps> = ({
  shift, onEdit, onDelete, isDeleting, canEdit = true, canDelete = true
}) => {
  const { t } = useTranslation(['attendance', 'common']);

  return (
    <TableRow>
      <TableCell className="font-medium text-center">{shift.name}</TableCell>
      <TableCell className="text-center">{shift.shift_label}</TableCell>
      <TableCell className="text-center">{shift.start_time}</TableCell>
      <TableCell className="text-center">{shift.end_time}</TableCell>
      <TableCell className="text-center hidden sm:table-cell">{shift.duration_hours?.toFixed(1) || '-'}</TableCell>
      <TableCell className="text-center">
        <Badge variant={shift.is_active ? 'success' : 'outline'} className="text-xs">
          {shift.is_active ? t('common:statusEnum.active') : t('common:statusEnum.inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {canEdit && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(shift)} className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(shift.id, shift.name)}
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

export default ShiftDefinitionListItem;