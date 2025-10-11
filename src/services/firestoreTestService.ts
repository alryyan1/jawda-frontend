import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

/**
 * Update test availability across all labs in Firestore
 * @param testId - The ID of the test to update
 * @param isAvailable - The new availability status
 * @param testName - The name of the test (for logging)
 */
export const updateTestAvailabilityAcrossAllLabs = async (
  testId: number,
  isAvailable: boolean,
  testName: string
): Promise<{ success: boolean; message: string; updatedLabs: number; error?: string }> => {
  try {
    console.log(`Updating test availability for test ${testId} (${testName}) to ${isAvailable} across all labs`);

    // Get all labs from the labToLap collection
    const labsCollection = collection(db, 'labToLap');
    const labsSnapshot = await getDocs(labsCollection);
    
    if (labsSnapshot.empty) {
      return {
        success: false,
        message: 'No labs found in Firestore',
        updatedLabs: 0,
        error: 'No labs found'
      };
    }

    const batch = writeBatch(db);
    let updatedLabs = 0;

    // Iterate through each lab
    for (const labDoc of labsSnapshot.docs) {
      const labId = labDoc.id;
      
      // Skip the 'global' document as it's not a lab
      if (labId === 'global') {
        continue;
      }

      try {
        // Get the pricelist collection for this lab
        const priceListCollection = collection(db, 'labToLap', labId, 'pricelist');
        const priceListSnapshot = await getDocs(priceListCollection);
        
        // Find the test in this lab's pricelist
        for (const testDoc of priceListSnapshot.docs) {
          const testData = testDoc.data();
          
          // Check if this is the test we want to update
          if (testData.id === testId) {
            const testRef = doc(db, 'labToLap', labId, 'pricelist', testDoc.id);
            batch.update(testRef, {
              is_available: isAvailable,
              updated_at: new Date().toISOString()
            });
            updatedLabs++;
            console.log(`Updated test ${testId} in lab ${labId}`);
            break; // Found the test in this lab, move to next lab
          }
        }
      } catch (labError) {
        console.warn(`Error processing lab ${labId}:`, labError);
        // Continue with other labs even if one fails
      }
    }

    if (updatedLabs === 0) {
      return {
        success: false,
        message: `Test ${testId} (${testName}) not found in any lab's pricelist`,
        updatedLabs: 0,
        error: 'Test not found in any lab'
      };
    }

    // Commit all updates
    await batch.commit();

    return {
      success: true,
      message: `Successfully updated test ${testId} (${testName}) availability to ${isAvailable} in ${updatedLabs} labs`,
      updatedLabs
    };

  } catch (error) {
    console.error('Error updating test availability across labs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      message: 'Failed to update test availability across labs',
      updatedLabs: 0,
      error: errorMessage
    };
  }
};

/**
 * Update test conditions and timer across all labs in Firestore
 * @param testId - The ID of the test to update
 * @param conditions - The conditions text (optional)
 * @param timer - The timer value in minutes (optional)
 * @param testName - The name of the test (for logging)
 */
export const updateTestConditionsAndTimerAcrossAllLabs = async (
  testId: number,
  conditions?: string,
  timer?: number,
  testName?: string
): Promise<{ success: boolean; message: string; updatedLabs: number; error?: string }> => {
  try {
    console.log(`Updating test conditions and timer for test ${testId} (${testName}) across all labs`, {
      conditions,
      timer
    });

    // Get all labs from the labToLap collection
    const labsCollection = collection(db, 'labToLap');
    const labsSnapshot = await getDocs(labsCollection);
    
    if (labsSnapshot.empty) {
      return {
        success: false,
        message: 'No labs found in Firestore',
        updatedLabs: 0,
        error: 'No labs found'
      };
    }

    const batch = writeBatch(db);
    let updatedLabs = 0;

    // Prepare update data
    const updateData: Record<string, string | number> = {
      updated_at: new Date().toISOString()
    };

    // Only add fields that have values
    if (conditions && conditions.trim() !== '') {
      updateData.conditions = conditions.trim();
    }
    
    if (timer && timer > 0) {
      updateData.timer = timer;
    }

    // If no valid data to update, return early
    if (Object.keys(updateData).length === 1) { // Only has updated_at
      return {
        success: true,
        message: 'No valid conditions or timer data to update',
        updatedLabs: 0
      };
    }

    // Iterate through each lab
    for (const labDoc of labsSnapshot.docs) {
      const labId = labDoc.id;
      
      // Skip the 'global' document as it's not a lab
      if (labId === 'global') {
        continue;
      }

      try {
        // Get the pricelist collection for this lab
        const priceListCollection = collection(db, 'labToLap', labId, 'pricelist');
        const priceListSnapshot = await getDocs(priceListCollection);
        
        // Find the test in this lab's pricelist
        for (const testDoc of priceListSnapshot.docs) {
          const testData = testDoc.data();
          
          // Check if this is the test we want to update
          if (testData.id === testId) {
            const testRef = doc(db, 'labToLap', labId, 'pricelist', testDoc.id);
            batch.update(testRef, updateData);
            updatedLabs++;
            console.log(`Updated test ${testId} conditions/timer in lab ${labId}`);
            break; // Found the test in this lab, move to next lab
          }
        }
      } catch (labError) {
        console.warn(`Error processing lab ${labId}:`, labError);
        // Continue with other labs even if one fails
      }
    }

    if (updatedLabs === 0) {
      return {
        success: false,
        message: `Test ${testId} (${testName}) not found in any lab's pricelist`,
        updatedLabs: 0,
        error: 'Test not found in any lab'
      };
    }

    // Commit all updates
    await batch.commit();

    return {
      success: true,
      message: `Successfully updated test ${testId} (${testName}) conditions/timer in ${updatedLabs} labs`,
      updatedLabs
    };

  } catch (error) {
    console.error('Error updating test conditions and timer across labs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      message: 'Failed to update test conditions and timer across labs',
      updatedLabs: 0,
      error: errorMessage
    };
  }
};

/**
 * Get all labs from Firestore
 */
export const getAllLabs = async (): Promise<{ success: boolean; labs: string[]; error?: string }> => {
  try {
    const labsCollection = collection(db, 'labToLap');
    const labsSnapshot = await getDocs(labsCollection);
    
    const labs = labsSnapshot.docs
      .map(doc => doc.id)
      .filter(id => id !== 'global'); // Exclude global document
    
    return {
      success: true,
      labs
    };
  } catch (error) {
    console.error('Error getting labs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      labs: [],
      error: errorMessage
    };
  }
};
