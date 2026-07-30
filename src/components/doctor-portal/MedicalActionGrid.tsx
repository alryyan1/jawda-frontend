import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import {
  User,
  Stethoscope,
  FlaskConical,
  FileText,
  BookOpen,
  Activity,
  Scan,
  ClipboardList,
  Paperclip,
  Pill,
  Smile,
  CalendarClock,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivePatientVisit } from '@/types/patients';
import { getActionGridOrder, saveActionGridOrder } from '@/lib/medical-action-grid-store';

export type SectionKey =
  | 'info'
  | 'services'
  | 'lab'
  | 'notes'
  | 'history'
  | 'vitals'
  | 'systems'
  | 'diagnosis'
  | 'attachments'
  | 'prescriptions'
  | 'report'
  | 'appointments'
  | 'teeth';

interface ActionDef {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  placeholder?: boolean;
}

const ACTIONS: ActionDef[] = [
  { key: 'info',          label: 'بيانات المريض وزياراته', icon: User },
  { key: 'diagnosis',     label: 'التشخيص',           icon: ClipboardList },
  { key: 'report',        label: 'التقرير الطبي',     icon: FileText },
  { key: 'prescriptions', label: 'الوصفات الطبية',    icon: Pill },
  { key: 'services',      label: 'الخدمات',           icon: Stethoscope },
  { key: 'lab',           label: 'المختبر',            icon: FlaskConical },
  { key: 'history',       label: 'السجل الطبي',       icon: BookOpen },
  { key: 'vitals',        label: 'العلامات الحيوية',  icon: Activity },
  { key: 'systems',       label: 'مراجعة الأجهزة',   icon: Scan },
  { key: 'appointments',  label: 'المواعيد',           icon: CalendarClock },
  { key: 'teeth',         label: 'الأسنان',            icon: Smile },
];

const DEFAULT_ORDER: SectionKey[] = ACTIONS.map(action => action.key);

interface MedicalActionGridProps {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
  visit: ActivePatientVisit | null;
}

interface SortableActionCardProps {
  action: ActionDef;
  isActive: boolean;
  badgeCount: number | undefined;
  onSectionChange: (section: SectionKey) => void;
}

const SortableActionCard: React.FC<SortableActionCardProps> = ({
  action,
  isActive,
  badgeCount,
  onSectionChange,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: action.key,
  });

  const Icon = action.icon;

  const card = (
    <Paper
      ref={setNodeRef}
      onClick={() => onSectionChange(action.key)}
      elevation={isActive ? 3 : 0}
      sx={{
        position: 'relative',
        p: 1,
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        cursor: isDragging ? 'grabbing' : 'pointer',
        borderRadius: 2,
        border: '1px solid',
        transform: CSS.Transform.toString(transform),
        transition: [transition, 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease']
          .filter(Boolean)
          .join(', '),
        zIndex: isDragging ? 10 : 'auto',
        opacity: isDragging ? 0.5 : action.placeholder ? 0.6 : 1,
        borderColor: isActive ? 'primary.main' : 'divider',
        bgcolor: isActive
          ? 'primary.main'
          : action.placeholder
            ? 'action.disabledBackground'
            : 'background.paper',
        '&:hover': {
          borderColor: isActive ? 'primary.main' : 'primary.light',
          bgcolor: isActive ? 'primary.dark' : 'primary.50',
          boxShadow: action.placeholder ? 'none' : 2,
        },
        '&:hover .action-grip-handle': {
          opacity: 0.6,
        },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        className="action-grip-handle"
        onClick={event => event.stopPropagation()}
        sx={{
          position: 'absolute',
          top: 2,
          insetInlineEnd: 2,
          display: 'flex',
          p: 0.25,
          borderRadius: 0.5,
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: isDragging ? 0.6 : 0.35,
          transition: 'opacity 0.15s ease',
          color: isActive ? 'white' : 'text.disabled',
        }}
      >
        <GripVertical size={12} />
      </Box>
      <Icon
        size={20}
        className={cn(isActive ? 'text-white' : action.placeholder ? 'text-gray-400' : 'text-primary')}
      />
      <Typography
        variant="caption"
        textAlign="center"
        sx={{
          fontSize: '0.65rem',
          lineHeight: 1.2,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? 'white' : action.placeholder ? 'text.disabled' : 'text.primary',
        }}
      >
        {action.label}
      </Typography>
    </Paper>
  );

  return (
    <Grid size={1}>
      <Tooltip title={action.placeholder ? 'قريباً' : action.label} placement="top">
        <Box sx={{ width: '100%' }}>
          {badgeCount ? (
            <Badge badgeContent={badgeCount} color="error" sx={{ width: '100%' }}>
              {card}
            </Badge>
          ) : (
            card
          )}
        </Box>
      </Tooltip>
    </Grid>
  );
};

const MedicalActionGrid: React.FC<MedicalActionGridProps> = ({
  activeSection,
  onSectionChange,
  visit,
}) => {
  const [orderedKeys, setOrderedKeys] = useState<SectionKey[]>(() => getActionGridOrder(DEFAULT_ORDER));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        tolerance: 5,
        delay: 0,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getBadgeCount = (key: SectionKey): number | undefined => {
    if (!visit) return undefined;
    if (key === 'services') return visit.requested_services_count || undefined;
    if (key === 'lab') return visit.lab_requests_count || undefined;
    if (key === 'attachments') return visit.attachments?.length || undefined;
    return undefined;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedKeys(current => {
      const oldIndex = current.indexOf(active.id as SectionKey);
      const newIndex = current.indexOf(over.id as SectionKey);
      if (oldIndex === -1 || newIndex === -1) return current;
      const newOrder = arrayMove(current, oldIndex, newIndex);
      saveActionGridOrder(newOrder);
      return newOrder;
    });
  };

  const orderedActions = orderedKeys
    .map(key => ACTIONS.find(action => action.key === key))
    .filter((action): action is ActionDef => Boolean(action));

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <SortableContext items={orderedKeys} strategy={rectSortingStrategy}>
          <Grid container spacing={1} columns={11}>
            {orderedActions.map(action => (
              <SortableActionCard
                key={action.key}
                action={action}
                isActive={activeSection === action.key}
                badgeCount={getBadgeCount(action.key)}
                onSectionChange={onSectionChange}
              />
            ))}
          </Grid>
        </SortableContext>
      </DndContext>
    </Box>
  );
};

export default MedicalActionGrid;
