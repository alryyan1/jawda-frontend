// src/components/lab/sample_collection/VisitSampleContainers.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical, Printer, Hash } from 'lucide-react';
import { toast } from 'sonner';

import type { LabRequest } from '@/types/visits';
import apiClient from '@/services/api';
import { markPatientSampleCollectedForVisitApi } from '@/services/sampleCollectionService';

interface VisitSampleContainersProps {
  visitId: number;
  patientName: string;
  labRequests: LabRequest[];
  isLoading: boolean;
  patientAge?: string | number;
  doctorName?: string;
  visitDateTime?: string | Date; // ISO string or Date instance
  patientPhone?: string;
  onAfterPrint?: () => void;
}

const VisitSampleContainers: React.FC<VisitSampleContainersProps> = ({
  visitId,
  patientName,
  labRequests,
  isLoading,
  visitDateTime,
  onAfterPrint
}) => {
  const formatDate = (value?: string | Date) => {
    const d = value ? new Date(value) : new Date();
    return d.toLocaleDateString();
  };

  const formatTime = (value?: string | Date) => {
    const d = value ? new Date(value) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get unique containers from lab requests
  const getUniqueContainers = () => {
    const containerMap = new Map();
    console.log(labRequests,'labRequests');
    labRequests.forEach((lr) => {
      if (lr.main_test?.container_id) {
        const containerId = lr.main_test.container_id;
        const containerName = lr.main_test.container?.container_name || lr.main_test.container_name || `Container ${containerId}`;
        
        if (!containerMap.has(containerId)) {
          containerMap.set(containerId, {
            id: containerId,
            name: containerName,
            count: 1
          });
        } else {
          containerMap.get(containerId).count++;
        }
      }
    });
    
    return Array.from(containerMap.values());
  };

  const getContainerImageSrc = (containerId: number) => {
    // Use Vite's URL resolution so images work after build
    try {
      return new URL(`../../../assets/containers/${containerId}.png`, import.meta.url).href;
    } catch {
      return new URL(`../../../assets/containers/1.png`, import.meta.url).href;
    }
  };

  const getContainerWidth = (containerId: number) => {
    // Special width for containers 5 and 6 as per PHP code
    if (containerId === 5 || containerId === 6) {
      return 90;
    }
    return 55;
  };

  const handlePrintContainerBarcode = async (containerId: number, containerName: string) => {
    try {
      toast.info('جاري إنشاء الباركود...');
      
      // Call the backend API to generate the barcode PDF
      const response = await apiClient.get(`/visits/${visitId}/container-barcode/${containerId}`, { 
        responseType: 'blob' 
      });
      
      // Create and download the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(blob);
      const pdfWindow = window.open(fileURL, '_blank');
      
      if (pdfWindow) {
        pdfWindow.addEventListener('load', () => {
          URL.revokeObjectURL(fileURL);
        });
        toast.success(`تم إنشاء باركود ${containerName} بنجاح`);
      } else {
        toast.error('فشل في فتح نافذة الطباعة');
      }

      // After printing trigger mark patient sample collected
      try {
        await markPatientSampleCollectedForVisitApi(visitId);
        toast.success('تم تحديث حالة جمع العينة للمريض');
        if (onAfterPrint) onAfterPrint();
      } catch {
        // Silently ignore if it fails, printing succeeded
      }
    } catch (error) {
      console.error('Error printing container barcode:', error);
      toast.error('فشل في إنشاء باركود الحاوية');
    }
  };

  // Removed: handlePrintAllSamples (feature deprecated)

  if (isLoading) {
    return (
      <Card style={{ height: window.innerHeight - 200,overflowY: 'auto' }} className=" flex flex-col shadow-lg">
        <CardContent className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const uniqueContainers = getUniqueContainers();

  return (
    <Card style={{ height: window.innerHeight - 100,overflowY: 'auto' }} className=" flex flex-col shadow-sm">
      <div className="p-4 border-b bg-background/40 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-center gap-4">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{patientName}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="h-6 w-6" />
            <span className="text-3xl font-extrabold">{visitId}</span>
          </div>
        </div>
      </div>
      
      <CardContent className="flex-grow p-1">
        <div className="">
          {/* <div>
            <span className="font-medium">الهاتف:</span> <span>{patientPhone ?? '-'}</span>
          </div>
          <div>
            <span className="font-medium">العمر:</span> <span>{patientAge ?? '-'}</span>
          </div> */}
          {/* <div>
            <span className="font-medium">الطبيب:</span> <span>{doctorName ?? '-'}</span>
          </div> */}
          <div>
            <span className="font-medium">التاريخ:</span> <span>{formatDate(visitDateTime)} · {formatTime(visitDateTime)}</span>
          </div>
        </div>
        {uniqueContainers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              لا توجد حاويات مطلوبة لهذه الزيارة
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Removed: Print All Samples button */}
            
            {/* Container Grid */}
            <div className="grid grid-cols-4  gap-4">
            {uniqueContainers.map((container) => (
              <Card
                key={container.id}
                className="group cursor-pointer hover:shadow-md transition-all duration-200 border-muted/60"
                data-pid={visitId}
                data-pack={container.id}
              >
                <CardContent className="p-1">
                  <div className="flex flex-col items-center">
                    <div className="mb-2 relative">
                      <img
                        src={getContainerImageSrc(container.id)}
                        alt={`Container ${container.id}`}
                        width={getContainerWidth(container.id)}
                        height={130}
                        className="object-contain transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          // Fallback to default image if the specific one doesn't exist
                          (e.target as HTMLImageElement).src = new URL(`../../../assets/containers/1.png`, import.meta.url).href;
                        }}
                      />
                      {container.count > 1 && (
                        <span className="absolute -top-2 -left-2 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 shadow">
                          {container.count}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground">
                        {container.name}
                      </p>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 px-2 text-xs"
                          onClick={() => handlePrintContainerBarcode(container.id, container.name)}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          طباعة باركود
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisitSampleContainers;
