import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { Smile } from 'lucide-react';
import type { DoctorVisit, RequestedService } from '@/types/visits';
import ToothServicesDialog from '../ToothServicesDialog';
import { TOOTH_SPOTS } from './teethChartData';

interface TeethSectionProps {
  visit: DoctorVisit | undefined;
}

const ASSIGNED_FILL = '#2e7d32';
const HOVER_FILL = '#90caf9';
const IDLE_FILL = '#ffffff';

const TeethSection: React.FC<TeethSectionProps> = ({ visit }) => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);

  const services = useMemo(() => visit?.requested_services ?? [], [visit]);

  const servicesByTooth = useMemo(() => {
    const map = new Map<number, RequestedService[]>();
    services.forEach(svc => {
      if (!svc.tooth_id) return;
      const list = map.get(svc.tooth_id) ?? [];
      list.push(svc);
      map.set(svc.tooth_id, list);
    });
    return map;
  }, [services]);

  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  const toothFill = (id: number): string => {
    if (servicesByTooth.has(id)) return ASSIGNED_FILL;
    if (hoveredTooth === id) return HOVER_FILL;
    return IDLE_FILL;
  };

  const sortedAssignedTeeth = Array.from(servicesByTooth.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Smile size={18} />
          <Typography variant="subtitle2" fontWeight={700}>مخطط الأسنان</Typography>
          <Box sx={{ flex: 1 }} />
          <Chip
            label="بها خدمات مسندة"
            size="small"
            sx={{ bgcolor: ASSIGNED_FILL, color: '#fff', fontSize: '0.68rem', height: 20 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          اضغط على أي سن لإسناد خدمات هذه الزيارة إليه
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', color: 'text.primary' }}>
          <svg viewBox="0 0 450 700" width="100%" style={{ maxWidth: 420 }}>
            <g>
              {TOOTH_SPOTS.map(t => (
                <text
                  key={`lbl-${t.id}`}
                  transform={t.labelTransform}
                  fontSize={t.labelFontSize}
                  fill="currentColor"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {t.id}
                </text>
              ))}
            </g>
            <g>
              {TOOTH_SPOTS.map(t => {
                const toothServices = servicesByTooth.get(t.id) ?? [];
                const title = toothServices.length > 0
                  ? toothServices.map(s => s.service?.name).filter(Boolean).join('، ')
                  : `سن رقم ${t.id}`;
                const commonProps: React.SVGAttributes<SVGElement> = {
                  fill: toothFill(t.id),
                  stroke: '#666',
                  strokeWidth: 1,
                  style: { cursor: 'pointer', transition: 'fill 0.15s ease' },
                  onClick: () => setSelectedTooth(t.id),
                  onMouseEnter: () => setHoveredTooth(t.id),
                  onMouseLeave: () => setHoveredTooth(null),
                };
                return t.shape === 'polygon' ? (
                  <polygon key={t.id} points={t.points} {...commonProps}>
                    <title>{title}</title>
                  </polygon>
                ) : (
                  <path key={t.id} d={t.d} {...commonProps}>
                    <title>{title}</title>
                  </path>
                );
              })}
            </g>
          </svg>
        </Box>
      </Paper>

      {sortedAssignedTeeth.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            الخدمات المسندة للأسنان
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sortedAssignedTeeth.map(([toothId, toothServices]) => (
              <Box key={toothId} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`سن ${toothId}`}
                  size="small"
                  color="primary"
                  onClick={() => setSelectedTooth(toothId)}
                  sx={{ fontSize: '0.7rem', height: 22, cursor: 'pointer' }}
                />
                {toothServices.map(s => (
                  <Chip
                    key={s.id}
                    label={s.service?.name ?? '—'}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 22 }}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      <ToothServicesDialog
        open={selectedTooth !== null}
        onClose={() => setSelectedTooth(null)}
        visitId={visit.id}
        toothId={selectedTooth}
        services={services}
      />
    </Box>
  );
};

export default TeethSection;
