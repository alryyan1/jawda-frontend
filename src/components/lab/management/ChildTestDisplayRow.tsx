import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Settings2, GripVertical, Loader2 } from 'lucide-react';
import type { ChildTest } from '@/types/labTests';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChildTestDisplayRowProps {
  childTest: ChildTest & { _localId: string }; // Ensure _localId is present for dnd-kit
  onEdit: (childTestId: number) => void;
  onDelete: (childTestId: number) => void;
  onManageOptions: (childTest: ChildTest) => void;
  
  // Mutation states from parent (ChildTestsTable or ChildTestsManagementPage)
  isDeletingThisRow: boolean; // True if this specific row's delete mutation is pending
  
  // Permissions
  canEdit: boolean;
  canDelete: boolean;
  canManageOptions: boolean;
  canReorder: boolean; // To show/hide drag handle or make it active
}

const ChildTestDisplayRow: React.FC<ChildTestDisplayRowProps> = ({
  childTest, onEdit, onDelete, onManageOptions,
  isDeletingThisRow,
  canEdit, canDelete, canManageOptions, canReorder
}) => {
  const { t } = useTranslation(['labTests', 'common']);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // True when this item is being dragged
  } = useSortable({ id: childTest._localId }); // Use the stable _localId from props

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1, // Make dragging item slightly transparent
    zIndex: isDragging ? 100 : 'auto', // Ensure dragging item is on top
    // Add a class for visual feedback during drag if desired
    // boxShadow: isDragging ? '0 0 0 2px hsl(var(--primary)), 0 4px 8px rgba(0,0,0,0.1)' : undefined,
  };

  // Determine if options management should be shown based on child test properties
  // (e.g., qualitative tests might not have numeric low/upper but have options)
  const isPotentiallyQualitative = 
    (childTest.low === null || childTest.low === undefined || String(childTest.low).trim() === '') &&
    (childTest.upper === null || childTest.upper === undefined || String(childTest.upper).trim() === '');
    // You might have a more explicit 'result_type' field on ChildTest model in the future


  // The order displayed is based on the array index passed from parent (after DND reorder)
  // The actual 'test_order' field from the database is used for initial sort.
  const displayOrder = childTest.test_order;


  return (
    <TableRow 
        ref={setNodeRef} 
        style={style} 
        className={cn(
            "touch-none", // Important for dnd-kit pointer sensor on touch devices
            isDragging && "shadow-xl bg-muted dark:bg-muted/50 opacity-75"
        )}
        data-testid={`child-test-row-${childTest.id || childTest._localId}`}
    >
      {/* Drag Handle Cell */}
      <TableCell className="py-2 w-10 text-center print:hidden">
        {canReorder ? (
          <button 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing p-1"
            aria-label={t('labTests:childTests.dragToReorderHandle')}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </button>
        ) : (
          <div className="p-1"><GripVertical className="h-5 w-5 text-muted-foreground/30" /></div>
        )}
      </TableCell>

      {/* Data Cells */}
      <TableCell className="py-2 font-medium min-w-[180px] sm:min-w-[200px] truncate" title={childTest.child_test_name}>
        {childTest.child_test_name}
      </TableCell>
      <TableCell className="py-2 hidden sm:table-cell min-w-[70px] sm:min-w-[80px] truncate" title={childTest.unit?.name || childTest.unit_name || ''}>
        {childTest.unit?.name || childTest.unit_name || '-'}
      </TableCell>
      <TableCell className="py-2 hidden md:table-cell min-w-[100px] sm:min-w-[120px] truncate" title={childTest.child_group?.name || childTest.child_group_name || ''}>
        {childTest.child_group?.name || childTest.child_group_name || '-'}
      </TableCell>
      <TableCell className="py-2 hidden lg:table-cell min-w-[120px] sm:min-w-[150px] truncate" title={childTest.normalRange || ''}>
        {childTest.normalRange || 
         ((childTest.low !== null && childTest.low !== undefined && String(childTest.low).trim() !== '') || 
          (childTest.upper !== null && childTest.upper !== undefined && String(childTest.upper).trim() !== '') ? 
            `${String(childTest.low || '-').trim()} - ${String(childTest.upper || '-').trim()}` 
            : '-')}
      </TableCell>
      <TableCell className="py-2 text-center w-[70px]">{displayOrder || '-'}</TableCell>
      
      {/* Actions Cell */}
      <TableCell className="py-2 text-right w-[130px] sm:w-[150px] print:hidden">
        <div className="flex gap-0.5 sm:gap-1 justify-end items-center">
          {canManageOptions && isPotentiallyQualitative && childTest.id && ( // Only for persisted child tests
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onManageOptions(childTest)}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('labTests:childTests.manageOptions')}</p></TooltipContent>
            </Tooltip>
          )}
          {canEdit && childTest.id && ( // Can only edit persisted child tests
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(childTest.id!)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('common:edit')}</p></TooltipContent>
            </Tooltip>
          )}
          {canDelete && childTest.id && ( // Can only delete persisted child tests
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive hover:text-destructive" 
                  onClick={() => onDelete(childTest.id!)} 
                  disabled={isDeletingThisRow}
                >
                  {isDeletingThisRow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('common:delete')}</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};
export default ChildTestDisplayRow;