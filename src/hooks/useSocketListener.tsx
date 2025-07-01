// src/hooks/useSocketListener.ts (New File)
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/services/socketService';
import { toast } from 'sonner';

// import type { PaginatedPatientLabQueueResponse, PatientLabQueueItem } from '@/types/labWorkflow';

interface LabPaymentUpdatePayload {
  visitId: number;
  allRequestsPaid: boolean;
  isLastResultPending: boolean;
  isReadyForPrint: boolean;
}

export const useLabUpdates = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if socket service is properly configured
    if (!socketService.isConfigured) {
      console.warn('Socket service not configured. Real-time updates will be disabled.');
      return;
    }

    // Join the lab-updates room
    const roomJoined = socketService.joinRoom('lab-updates');
    
    if (!roomJoined) {
      console.warn('Failed to join lab-updates room. Real-time updates will be disabled.');
      return;
    }

    // Listen for lab payment update events
    const handleLabPaymentUpdate = (...args: unknown[]) => {
      const data = args[0] as LabPaymentUpdatePayload;
      console.log('Received lab.payment.updated event:', data);
      toast.info(`Update received for visit #${data.visitId}`);

      // Invalidate queries related to the visit to force a refetch with new data
      // This is simpler and more robust than trying to manually update the cache
      queryClient.invalidateQueries({ queryKey: ['labReceptionQueue'] });
      queryClient.invalidateQueries({ queryKey: ['labPendingQueue'] }); // The workstation queue
      queryClient.invalidateQueries({ queryKey: ['labRequestsForVisit', data.visitId] });
      queryClient.invalidateQueries({ queryKey: ['activeVisitDetailsForInfoPanel', data.visitId] });

      // --- OPTIONAL: More granular cache update ---
      // This avoids a network request but is more complex to maintain.
      // queryClient.setQueriesData({ queryKey: ['labReceptionQueue'] }, (oldData: PaginatedPatientLabQueueResponse | undefined) => {
      //   if (!oldData) return oldData;
      //   const newPages = oldData.pages.map(page => ({
      //     ...page,
      //     data: page.data.map((item: PatientLabQueueItem) => {
      //       if (item.visit_id === data.visitId) {
      //         return {
      //           ...item,
      //           all_requests_paid: data.allRequestsPaid,
      //           is_last_result_pending: data.isLastResultPending,
      //           is_ready_for_print: data.isReadyForPrint,
      //         };
      //       }
      //       return item;
      //     })
      //   }));
      //   return { ...oldData, pages: newPages };
      // });
    };
    
    socketService.on('lab.payment.updated', handleLabPaymentUpdate);

    // Clean up listener when component unmounts
    return () => {
      try {
        socketService.off('lab.payment.updated', handleLabPaymentUpdate);
        socketService.leaveRoom('lab-updates');
        console.log('Stopped listening for lab.payment.updated and left room');
      } catch (error) {
        console.warn('Error cleaning up socket listeners:', error);
      }
    };
  }, [queryClient]);
};