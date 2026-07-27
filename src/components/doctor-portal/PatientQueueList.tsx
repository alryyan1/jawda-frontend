import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, Clock, History, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { ActivePatientVisit, RecentDoctorVisitSearchItem } from '@/types/patients';
import type { DoctorShift } from '@/types/doctors';
import { searchRecentDoctorVisits } from '@/services/patientService';
import PatientQueueCard from './PatientQueueCard';

interface PatientQueueListProps {
  patients: ActivePatientVisit[];
  isLoading: boolean;
  selectedVisitId: number | null;
  onSelectPatient: (visit: ActivePatientVisit) => void;
  onSelectVisitId: (visitId: number) => void;
  /** All known doctor shifts today, used to label the group dividers. */
  doctorShifts?: DoctorShift[];
  /** The doctor's currently-open shift, if any — highlighted as "active" in the divider. */
  activeDoctorShiftId?: number;
  /** The day the queue (not history search) is showing, as YYYY-MM-DD. */
  selectedDate: string;
  onDateChange: (date: string) => void;
  /** Visit ids spliced in via realtime in the last few seconds — flashed as "new". */
  newlyAddedVisitIds?: Set<number>;
}

const PatientQueueList: React.FC<PatientQueueListProps> = ({
  patients,
  isLoading,
  selectedVisitId,
  onSelectPatient,
  onSelectVisitId,
  doctorShifts = [],
  activeDoctorShiftId,
  selectedDate,
  onDateChange,
  newlyAddedVisitIds,
}) => {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'queue' | 'history'>('queue');

  // Debounce the search term before hitting the cross-day history search endpoint
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const { data: historyResults = [], isLoading: isLoadingHistory } = useQuery<RecentDoctorVisitSearchItem[]>({
    queryKey: ['recentDoctorVisitsSearch', debouncedSearch],
    queryFn: () => searchRecentDoctorVisits(debouncedSearch, 20),
    enabled: mode === 'history' && debouncedSearch.trim().length >= 2,
  });

  const filtered = useMemo(() => {
    let list = patients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.patient.name.toLowerCase().includes(q) ||
        (p.patient.phone ?? '').includes(q)
      );
    }
    return list;
  }, [patients, search]);

  // Group the queue by doctor_shift_id so patients from an earlier (closed and
  // reopened) shift today are still visible, separated from the current one.
  const groupedByShift = useMemo(() => {
    const groups = new Map<number, ActivePatientVisit[]>();
    for (const visit of filtered) {
      const key = visit.doctor_shift_id;
      const existing = groups.get(key);
      if (existing) {
        existing.push(visit);
      } else {
        groups.set(key, [visit]);
      }
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
  }, [filtered]);

  const shiftLabel = (shiftId: number): string => {
    if (shiftId === activeDoctorShiftId) return 'الوردية الحالية';
    const shift = doctorShifts.find(s => s.id === shiftId);
    if (shift?.formatted_start_time) return `وردية سابقة — ${shift.formatted_start_time}`;
    return `وردية سابقة #${shiftId}`;
  };

  return (
    <div className="w-[300px] shrink-0 flex flex-col border-l bg-background h-full overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b flex flex-col gap-2">
        <div className="relative">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={mode === 'queue' ? 'بحث بالاسم أو رقم الهاتف...' : 'بحث عن مريض في زيارات سابقة...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 ps-8 text-[0.8rem]"
          />
        </div>

      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {mode === 'queue' ? (
          isLoading ? (
            <div className="flex justify-center pt-8">
              <Loader2 className="animate-spin text-muted-foreground" size={28} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center pt-12 gap-2 text-muted-foreground/60">
              <Users size={36} />
              <p className="text-sm text-center">{search ? 'لا توجد نتائج' : 'لا يوجد مرضى'}</p>
            </div>
          ) : (
            groupedByShift.map(([shiftId, visits]) => (
              <React.Fragment key={shiftId}>
                {groupedByShift.length > 1 && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[0.68rem] text-muted-foreground whitespace-nowrap px-1">
                      {shiftLabel(shiftId)} ({visits.length})
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                {visits.map(visit => (
                  <PatientQueueCard
                    key={visit.id}
                    visit={visit}
                    isSelected={selectedVisitId === visit.id}
                    onSelect={onSelectPatient}
                    onSelectVisitId={onSelectVisitId}
                    isNew={newlyAddedVisitIds?.has(visit.id) ?? false}
                  />
                ))}
              </React.Fragment>
            ))
          )
        ) : debouncedSearch.trim().length < 2 ? (
          <div className="text-center pt-12 text-muted-foreground/60">
            <History size={36} className="mx-auto" />
            <p className="text-sm mt-2">اكتب حرفين على الأقل من اسم المريض للبحث في الزيارات السابقة</p>
          </div>
        ) : isLoadingHistory ? (
          <div className="flex justify-center pt-8">
            <Loader2 className="animate-spin text-muted-foreground" size={28} />
          </div>
        ) : historyResults.length === 0 ? (
          <div className="text-center pt-12 text-muted-foreground/60">
            <p className="text-sm">لا توجد نتائج</p>
          </div>
        ) : (
          historyResults.map(item => (
            <Card
              key={item.visit_id}
              onClick={() => onSelectVisitId(item.visit_id)}
              className={cn(
                'p-2.5 mb-2 gap-0 cursor-pointer shadow-none transition-colors',
                selectedVisitId === item.visit_id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-accent/40 hover:border-primary/40'
              )}
            >
              <p className="text-[0.8rem] font-semibold truncate">{item.patient_name}</p>
              <p className="text-[0.7rem] text-muted-foreground">
                {item.visit_date ?? '—'} {item.doctor_name ? `— د. ${item.doctor_name}` : ''}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PatientQueueList;
