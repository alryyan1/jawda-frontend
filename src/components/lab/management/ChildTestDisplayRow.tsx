import React from 'react';
import { 
  TableCell, 
  TableRow, 
  IconButton, 
  Tooltip, 
  CircularProgress,
  Box 
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Settings as SettingsIcon, 
  DragIndicator as DragIcon 
} from '@mui/icons-material';
import type { ChildTest } from '@/types/labTests';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { List } from 'lucide-react';

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
  isHighlighted?: boolean;
}

const ChildTestDisplayRow: React.FC<ChildTestDisplayRowProps> = ({
  childTest, onEdit, onDelete, onManageOptions,
  isDeletingThisRow,
  canEdit, canDelete, canManageOptions, canReorder, isHighlighted
}) => {

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
        onClick={() => onEdit(childTest.id!)}
        sx={{
          touchAction: 'none', // Important for dnd-kit pointer sensor on touch devices
          opacity: isDragging ? 0.7 : 1,
          backgroundColor: isDragging ? 'action.hover' : (isHighlighted ? 'success.light' : 'inherit'),
          boxShadow: isDragging ? 3 : 'none',
          cursor: 'pointer',
          transition: 'background-color 600ms ease',
          '@keyframes rowPulse': {
            '0%': { backgroundColor: 'transparent' },
            '30%': { backgroundColor: 'rgba(76,175,80,0.3)' },
            '100%': { backgroundColor: 'transparent' }
          },
          animation: isHighlighted ? 'rowPulse 1200ms ease-out' : 'none',
        }}
        data-testid={`child-test-row-${childTest.id || childTest._localId}`}
    >
      {/* Drag Handle Cell */}
      <TableCell  >
  
          <IconButton 
            {...attributes} 
            {...listeners} 
            size="small"
            onClick={(e) => e.stopPropagation()}
            sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
            aria-label="اسحب لإعادة الترتيب"
          >
            <DragIcon />
          </IconButton>
       
      </TableCell>

      {/* Data Cells */}
      <TableCell className="text-2xl!"
        sx={{ 
          py: 1, 
          fontWeight: 'medium', 
          minWidth: { xs: 180, sm: 200 }, 
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }} 
        title={childTest.child_test_name}
      >
        {childTest.child_test_name}
      </TableCell>
      <TableCell className="text-2xl!"
        sx={{ 
          py: 1, 
          display: { xs: 'none', sm: 'table-cell' },
          minWidth: { xs: 70, sm: 80 }, 
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }} 
        title={childTest.unit?.name || childTest.unit_name || ''}
      >
        {childTest.unit?.name || childTest.unit_name || '-'}
      </TableCell>
      <TableCell className="text-2xl!"
        sx={{ 
          py: 1, 
          display: { xs: 'none', md: 'table-cell' },
          minWidth: { xs: 100, sm: 120 }, 
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }} 
        title={childTest.child_group?.name || childTest.child_group_name || ''}
      >
        {childTest.child_group?.name || childTest.child_group_name || '-'}
      </TableCell>
      <TableCell className="text-2xl!"
        sx={{ 
          py: 1, 
          display: { xs: 'none', lg: 'table-cell' },
          minWidth: { xs: 120, sm: 150 }, 
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }} 
        title={childTest.normalRange || ''}
      >
        {childTest.normalRange || 
         ((childTest.low !== null && childTest.low !== undefined && String(childTest.low).trim() !== '') || 
          (childTest.upper !== null && childTest.upper !== undefined && String(childTest.upper).trim() !== '') ? 
            `${String(childTest.low || '-').trim()} - ${String(childTest.upper || '-').trim()}` 
            : '-')}
      </TableCell>
      <TableCell className="text-2xl!" sx={{ py: 1, textAlign: 'center', width: 70 }}>
        {displayOrder || '-'}
      </TableCell>
      
      {/* Actions Cell */}
      <TableCell className="text-2xl!" sx={{ py: 1, textAlign: 'right', width: { xs: 130, sm: 150 }, display: { print: 'none' } }}>
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
            <Tooltip title="إدارة الخيارات">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onManageOptions(childTest); }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <List />
              </IconButton>
            </Tooltip>
          
            <Tooltip title="تعديل">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(childTest.id!); }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <EditIcon />
              </IconButton>
            </Tooltip>
        
            <Tooltip title="حذف">
              <IconButton 
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); onDelete(childTest.id!); }} 
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                disabled={isDeletingThisRow}
              >
                {isDeletingThisRow ? <CircularProgress size={16} /> : <DeleteIcon />}
              </IconButton>
            </Tooltip>
          
        </Box>
      </TableCell>
    </TableRow>
  );
};
export default ChildTestDisplayRow;