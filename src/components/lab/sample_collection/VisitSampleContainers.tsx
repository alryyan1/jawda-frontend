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

  const getContainerDimensions = (containerId: number) => {
    // Special dimensions for containers 5 and 6 as per PHP code
    if (containerId === 5 || containerId === 6) {
      return { width: 90, height: 130 };
    }
    return { width: 55, height: 130 };
  };

  const handlePrintContainerBarcode = async (containerId: number, containerName: string) => {
    try {
      toast.info('جاري إنشاء الباركود...');
      
      // Get dimensions from localStorage (same as BarcodePrintDialog)
      const BARCODE_LABEL_DIMENSIONS_KEY = "barcodeLabelDimensions";
      let dimensions = { width: 50, height: 25 };
      try {
        const stored = localStorage.getItem(BARCODE_LABEL_DIMENSIONS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.width && parsed.height) {
            dimensions = { width: Number(parsed.width), height: Number(parsed.height) };
          }
        }
      } catch (error) {
        console.error("Error reading stored dimensions:", error);
      }
      
      // Call the same backend API endpoint with container_id filter
      const response = await apiClient.get(`/visits/${visitId}/lab-barcode/pdf`, { 
        responseType: 'blob',
        params: {
          container_id: containerId,
          width: dimensions.width,
          height: dimensions.height,
        }
      });
      
      // Create blob URL and open in new window for printing
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(blob);
      
      // Create iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = fileURL;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        iframe.contentWindow?.print();
        // Cleanup after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(fileURL);
        }, 1000);
        toast.success(`تم إنشاء باركود ${containerName} بنجاح`);
      };

      // After printing trigger mark patient sample collected
      try {
        await markPatientSampleCollectedForVisitApi(visitId);
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

  // Calculate dynamic grid columns based on number of containers
  const getGridColsClass = (containerCount: number) => {
    if (containerCount === 1) {
      return 'grid-cols-1';
    } else if (containerCount === 2) {
      return 'grid-cols-2';
    } else if (containerCount === 3) {
      return 'grid-cols-3';
    } else if (containerCount === 4) {
      return 'grid-cols-2 sm:grid-cols-4';
    } else if (containerCount <= 6) {
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3';
    } else if (containerCount <= 9) {
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    } else if (containerCount <= 12) {
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4';
    } else {
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    }
  };

  // Calculate dynamic container size based on number of containers
  const getDynamicContainerSize = (containerCount: number, containerId: number) => {
    const baseDimensions = getContainerDimensions(containerId);
    let scaleFactor = 1;

    // Scale down containers when there are more of them
    if (containerCount === 1) {
      scaleFactor = 1.5; // Make single container larger
    } else if (containerCount === 2) {
      scaleFactor = 1.2; // Make 2 containers slightly larger
    } else if (containerCount === 3) {
      scaleFactor = 1.1;
    } else if (containerCount <= 6) {
      scaleFactor = 1.0; // Normal size
    } else if (containerCount <= 9) {
      scaleFactor = 0.9; // Slightly smaller
    } else if (containerCount <= 12) {
      scaleFactor = 0.85; // Smaller
    } else {
      scaleFactor = 0.8; // Smallest for many containers
    }

    return {
      width: Math.round(baseDimensions.width * scaleFactor),
      height: Math.round(baseDimensions.height * scaleFactor),
    };
  };

  return (
    <Card style={{ height: window.innerHeight - 100, overflowY: 'auto' }} className="flex flex-col shadow-sm">
      <div className="p-4 border-b bg-background/40 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-center gap-4">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{patientName}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="h-6 w-6" />
            <span className="text-3xl font-extrabold">{visitId}</span>
          </div>
        </div>
        <div className="mt-2 text-center text-sm text-muted-foreground">
          <span className="font-medium">التاريخ:</span> <span>{formatDate(visitDateTime)} · {formatTime(visitDateTime)}</span>
        </div>
      </div>
      
      <CardContent className="flex-grow p-4">
        {uniqueContainers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              لا توجد حاويات مطلوبة لهذه الزيارة
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Container Grid - Dynamic based on container count */}
            <div className={`grid ${getGridColsClass(uniqueContainers.length)} gap-4`}>
            {uniqueContainers.map((container) => {
              const dimensions = getDynamicContainerSize(uniqueContainers.length, container.id);
              return (
                <Card
                  key={container.id}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-muted/60 hover:border-primary/50"
                  data-pid={visitId}
                  data-pack={container.id}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center">
                      <div className="mb-3 relative w-full flex justify-center">
                        <div 
                          className="relative mx-auto"
                          style={{ 
                            width: `${dimensions.width}px`,
                            height: `${dimensions.height}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <img
                            src={getContainerImageSrc(container.id)}
                            alt={`Container ${container.id}`}
                            className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
                            style={{
                              width: 'auto',
                              height: 'auto',
                              maxWidth: '100%',
                              maxHeight: '100%'
                            }}
                            onError={(e) => {
                              // Fallback to default image if the specific one doesn't exist
                              (e.target as HTMLImageElement).src = new URL(`../../../assets/containers/1.png`, import.meta.url).href;
                            }}
                          />
                          {container.count > 1 && (
                            <span className="absolute -top-2 -right-2 rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-1 shadow-md min-w-[24px] text-center">
                              {container.count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center w-full">
                        <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">
                          {container.name}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs"
                          onClick={() => handlePrintContainerBarcode(container.id, container.name)}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          طباعة باركود
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisitSampleContainers;
