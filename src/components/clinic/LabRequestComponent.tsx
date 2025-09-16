// src/components/clinic/LabRequestComponent.tsx
import React, { useState, useCallback } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

// MUI Imports for Autocomplete
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress"; // MUI Loader
import Paper from "@mui/material/Paper"; // For Autocomplete dropdown style

import { Button } from "@/components/ui/button"; // shadcn/ui button
import { Card } from "@/components/ui/card"; // Added missing Card import
import {
	Loader2,
	PlusCircle,
	Save,
	LayoutGrid,
	Trash,
} from "lucide-react"; // Icons

import type { DoctorVisit, LabRequest } from "@/types/visits";
import type { Patient } from "@/types/patients";
import type { MainTestStripped } from "@/types/labTests"; // For Autocomplete
import {
	addLabTestsToVisit,
	getLabRequestsForVisit,
	clearPendingLabRequestsForVisit,
	recordDirectLabRequestPayment,
	cancelLabRequest,
	unpayLabRequest,
} from "@/services/labRequestService";
import { getMainTestsListForSelection } from "@/services/mainTestService"; // More generic for fetching all tests for Autocomplete
import { getPatientById } from "@/services/patientService";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import LabTestSelectionArea from "./lab_requests/LabTestSelectionArea";
import LabRequestDisplayArea from "./lab_requests/LabRequestDisplayArea";
import BatchLabPaymentDialog from "./BatchLabPaymentDialog";
import LabFinancialSummary from "./lab_requests/LabFinancialSummary"; // New Summary Component
import { IconButton } from "@mui/material";

interface ApiError {
	response?: {
		data?: {
			message?: string;
		};
	};
}

interface LabRequestComponentProps {
	patientId: number;
	visitId: number;
	selectedPatientVisit: DoctorVisit;
}

const LabRequestComponent: React.FC<LabRequestComponentProps> = ({
	patientId,
	visitId,
	selectedPatientVisit,
}) => {
	const queryClient = useQueryClient();
	const { currentClinicShift } = useAuth();

	// UI State
	const [showGridSelection, setShowGridSelection] = useState(false);
	const [showBatchPaymentDialog, setShowBatchPaymentDialog] = useState(false);
	// State for PDF Preview

	// State for Autocomplete selections
	const [autocompleteSelectedTests, setAutocompleteSelectedTests] = useState<
		MainTestStripped[]
	>([]);

	// State for Grid selections (if grid is shown)
	const [gridSelectedTestIds, setGridSelectedTestIds] = useState<Set<number>>(
		new Set()
	);
	const [commentForGrid, setCommentForGrid] = useState(""); // Comment specifically for grid submission

	// --- Query Keys ---
	const requestedTestsQueryKey = ["labRequestsForVisit", visitId] as const;
	const patientDetailsQueryKey = [
		"patientDetailsForLabDisplay",
		patientId,
	] as const;
	const allMainTestsForAutocompleteKey = [
		"allMainTestsStrippedForAutocomplete",
		visitId,
	] as const;
	//  console.log(selectedPatientVisit,'selectedPatientVisit')
	// --- Data Fetching ---
	const { data: currentPatient, isLoading: isLoadingPatient } = useQuery<
		Patient | null,
		Error
	>({
		queryKey: patientDetailsQueryKey,
		queryFn: () => getPatientById(patientId).catch(() => null),
		enabled: !!patientId,
	});

	//    console.log('visitId',visitId)
	const {
		data: requestedTests = [],
		isLoading: isLoadingRequestedTestsInitial,
		isFetching: isFetchingRequestedTests,
		error: requestedTestsError,
	} = useQuery<LabRequest[], Error>({
		queryKey: requestedTestsQueryKey,
		queryFn: () => getLabRequestsForVisit(visitId),
		enabled: !!visitId,
	});
	//   console.log('requestedTests',requestedTests,'requestedError',requestedTestsError)
	// Fetch ALL main tests for the Autocomplete
	// We use getMainTestsListForSelection with specific params to get *all available* tests,
	// excluding those already requested for this visit.
	const {
		data: allAvailableTestsForAutocomplete,
		isLoading: isLoadingAllTests,
	} = useQuery<MainTestStripped[], Error>({
		queryKey: allMainTestsForAutocompleteKey,
		queryFn: () =>
			getMainTestsListForSelection({
				visit_id_to_exclude_requests: visitId,
				pack_id: "all",
			}),
		enabled: !!visitId, // Fetch when visitId is available
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	});

	const isCompanyPatient = !!currentPatient?.company_id;

	// --- Mutations ---
	const addTestsMutation = useMutation({
		mutationFn: (payload: { main_test_ids: number[]; comment?: string }) =>
			addLabTestsToVisit({ visitId, ...payload }),
		onSuccess: (newlyAddedLabRequests) => {
			toast.success(
				`تم إضافة ${newlyAddedLabRequests.length} فحص بنجاح`
			);
			queryClient.invalidateQueries({ queryKey: requestedTestsQueryKey });
			queryClient.invalidateQueries({
				queryKey: allMainTestsForAutocompleteKey,
			}); // Re-fetch autocomplete options
			// Clear selections
			setAutocompleteSelectedTests([]);
			setGridSelectedTestIds(new Set());
			setCommentForGrid("");
			if (showGridSelection && newlyAddedLabRequests.length > 0) {
				setShowGridSelection(false); // Switch back to display mode if adding from grid
			}
		},
		onError: (error: ApiError) => {
			let errorMessage = "فشل في الطلب";
			if (error.response?.data?.message)
				errorMessage = error.response.data.message;
			toast.error(errorMessage);
		},
	});

	const removeAllPendingMutation = useMutation({
		mutationFn: () => clearPendingLabRequestsForVisit(visitId),
		onSuccess: (result) => {
			toast.success(
				`تم حذف ${result.deleted_count} فحص بنجاح`
			);
			queryClient.invalidateQueries({ queryKey: requestedTestsQueryKey });
			queryClient.invalidateQueries({
				queryKey: allMainTestsForAutocompleteKey,
			});
		},
		onError: (error: ApiError) => {
			toast.error(
				error.response?.data?.message || "فشل في الطلب"
			);
		},
	});

	const directPayItemMutation = useMutation({
		mutationFn: (params: {
			labRequestId: number;
			is_bankak: boolean;
			shift_id: number;
		}) =>
			recordDirectLabRequestPayment(params.labRequestId, { is_bankak: params.is_bankak }),
		onSuccess: (updatedLabRequest) => {
			toast.success("تم تسجيل الدفع بنجاح");
			queryClient.setQueryData(
				requestedTestsQueryKey,
				(oldData: LabRequest[] | undefined) =>
					oldData?.map((lr) =>
						lr.id === updatedLabRequest.id ? updatedLabRequest : lr
					) || []
			);
			queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
		},
		onError: (error: ApiError) => {
			toast.error(
				error.response?.data?.message || "فشل في الدفع"
			);
		},
	});
	 
	const cancelLabRequestMutation = useMutation({
		mutationFn: (labRequestId: number) => cancelLabRequest(labRequestId),
		onSuccess: () => {
			toast.success("تم إلغاء الفحص بنجاح");
			queryClient.invalidateQueries({ queryKey: requestedTestsQueryKey });
		},
	});

	const unpayLabRequestMutation = useMutation({
		mutationFn: (labRequestId: number) => unpayLabRequest(labRequestId),
		onSuccess: () => {
			toast.success("تم إلغاء الدفع بنجاح");
			queryClient.invalidateQueries({ queryKey: requestedTestsQueryKey });
		},
	});
	// --- Event Handlers ---
	const handleAddFromAutocomplete = () => {
		if (autocompleteSelectedTests.length > 0) {
			addTestsMutation.mutate({
				main_test_ids: autocompleteSelectedTests.map((test) => test.id),
				// comment: commentFromAutocompleteIfAny // If you add a comment field for autocomplete
			});
		} else {
			toast.info("لم يتم اختيار أي فحوصات للطلب");
		}
	};

	const handleAddFromGrid = useCallback(() => {
		if (gridSelectedTestIds.size > 0) {
			addTestsMutation.mutate({
				main_test_ids: Array.from(gridSelectedTestIds),
				comment: commentForGrid.trim() || undefined,
			});
		} else {
			toast.info("لم يتم اختيار أي فحوصات للطلب");
		}
	}, [gridSelectedTestIds, commentForGrid, addTestsMutation]);

	// Initial Loading / Error States
	if (
		(isLoadingRequestedTestsInitial && requestedTests.length === 0) ||
		(patientId && isLoadingPatient && !selectedPatientVisit)
	) {
		return (
			<div className="flex justify-center items-center h-full py-10">
				<Loader2 className="h-10 w-10 animate-spin text-primary" />
			</div>
		);
	}
	if (
		requestedTestsError ||
		(patientId && !selectedPatientVisit && !isLoadingPatient)
	) {
		return (
			<div className="p-6 text-center text-lg text-destructive">
				فشل في التحميل 
				{requestedTestsError?.message || "Patient data unavailable"}
			</div>
		);
	}

	return (
		<div
			className="flex flex-col lg:flex-row gap-4 h-full p-1"
			style={{ direction: 'rtl' }}
		>
			{/* Left Column: Financial Summary */}
			<div className="lg:w-[320px] xl:w-[360px] flex-shrink-0 space-y-3">
				<LabFinancialSummary
					requestedTests={requestedTests}
					currentPatient={currentPatient || null}
					currentClinicShift={currentClinicShift}
					onOpenBatchPaymentDialog={() =>{
						//  aler"open batch payment dialog";
						setShowBatchPaymentDialog(true);
					}}
					isCompanyPatient={isCompanyPatient}
				/>
			</div>

			{/* Right Column: Test Selection & Display */}
			<div className="flex-grow flex flex-col space-y-3 min-w-0">
				{" "}
				{/* min-w-0 for flex item shrink */}
				{/* Top selection area: Autocomplete + Grid Toggle */}
				<Card className="p-3 shadow-sm flex-shrink-0">
					<div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
						<Box sx={{ flexGrow: 1, minWidth: { xs: "100%", sm: 300 } }}>
							{" "}
							{/* MUI Box for Autocomplete sizing */}
							<Autocomplete
								multiple
								id="lab-test-autocomplete"
								size="small"
								options={allAvailableTestsForAutocomplete || []}
								getOptionLabel={(option) => option.main_test_name}
								value={autocompleteSelectedTests}
								onChange={(_event, newValue) => {
									setAutocompleteSelectedTests(newValue);
								}}
								isOptionEqualToValue={(option, value) => option.id === value.id}
								loading={isLoadingAllTests}
								renderInput={(params) => (
									<TextField
										{...params}
										variant="outlined"
										label="البحث أو اختيار الفحوصات"
										placeholder="أضف فحوصات..."
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												//get test from tests using find
												const inputVal = (e.target as HTMLInputElement).value.trim();
												const parsedId = parseInt(inputVal, 10);
												const foundedTest = isNaN(parsedId) ? undefined : allAvailableTestsForAutocomplete?.find(
													(test) => test.id === parsedId
												);

												if (foundedTest) {
													setAutocompleteSelectedTests((prev) => {
														return [...prev, foundedTest];
													});
												}
											}
										}}
										InputProps={{
											...params.InputProps,
											endAdornment: (
												<>
													{isLoadingAllTests ? (
														<CircularProgress color="inherit" size={20} />
													) : null}
													{params.InputProps.endAdornment}
												</>
											),
										}}
										sx={{
											"& .MuiInputLabel-root": { fontSize: "0.875rem" },
											"& .MuiOutlinedInput-root": {
												backgroundColor: "background.paper",
												fontSize: "0.875rem",
											},
										}}
									/>
								)}
								PaperComponent={(props) => (
									<Paper
										{...props}
									/>
								)}
							/>
						</Box>
						<div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
							<Button
								onClick={handleAddFromAutocomplete}
								disabled={
									autocompleteSelectedTests.length === 0 ||
									addTestsMutation.isPending
								}
								size="sm"
								className="h-9 flex-grow sm:flex-grow-0"
							>
								{addTestsMutation.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
								) : (
									<PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
								)}
								إضافة المحدد ({autocompleteSelectedTests.length})
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowGridSelection(!showGridSelection)}
								className="h-9 flex-grow sm:flex-grow-0"
								aria-pressed={showGridSelection}
							>
								<LayoutGrid className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
								{showGridSelection
									? "إخفاء الشبكة"
									: "إظهار الشبكة"}
							</Button>
						</div>
					</div>
				</Card>
				{/* Button to add from grid selection */}
				<div className="mt-2 flex justify-end">
						<Button
							onClick={handleAddFromGrid}
							disabled={
								gridSelectedTestIds.size === 0 || addTestsMutation.isPending
							}
							size="sm"
							className="h-9"
						>
							{addTestsMutation.isPending && (
								<Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
							)}
							<Save className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
							طلب المحدد ({gridSelectedTestIds.size})
						</Button>
						<IconButton onClick={() =>{
							removeAllPendingMutation.mutate();
						}} disabled={removeAllPendingMutation.isPending}><Trash className="" /></IconButton>
					</div>
				{/* Conditional Grid Selection Area */}
				{showGridSelection && (
					<div className="flex-shrink-0">
						{" "}
						{/* Prevents grid from over-expanding layout */}
						<LabTestSelectionArea
							visitId={visitId}
							onSwitchToDisplayMode={() => setShowGridSelection(false)}
							selectedTestIds={gridSelectedTestIds}
							onTestSelectionChange={(testId, isSelected) => {
								setGridSelectedTestIds((prev) => {
									const newSet = new Set(prev);
									if (isSelected) newSet.add(testId);
									else newSet.delete(testId);
									return newSet;
								});
							}}
							comment={commentForGrid}
							onCommentChange={setCommentForGrid}
							onAddById={(test) => {
								// For the "Add by ID" within the grid itself
								if (!gridSelectedTestIds.has(test.id)) {
									setGridSelectedTestIds((prev) => new Set(prev).add(test.id));
									toast.success(
										`تم إضافة ${test.main_test_name} إلى الاختيار`
									);
								} else {
									toast.info(
										`${test.main_test_name} محدد مسبقاً`
									);
								}
							}}
						/>
						
					</div>
				)}
				{/* Requested Tests Table - takes remaining space */}
				<div
					className={cn(
						"flex-grow overflow-hidden",
						showGridSelection ? "hidden" : "block"
					)}
				>
					{/* The max-w-[700px] will be applied to the table's direct parent by LabRequestDisplayArea */}
					<LabRequestDisplayArea
						visitId={visitId}
						patientId={patientId}
						currentPatient={currentPatient || null}
						requestedTests={requestedTests}
						isLoadingRequestedTests={isLoadingRequestedTestsInitial}
						isFetchingRequestedTests={isFetchingRequestedTests}
						currentClinicShift={currentClinicShift}
						onAddMoreTests={() => setShowGridSelection(true)} // This button is now for showing the grid
						directPayItemMutation={
							directPayItemMutation as UseMutationResult<
								LabRequest,
								Error,
								{ labRequestId: number; is_bankak: boolean; shift_id: number },
								unknown
							>
						}
						removeAllPendingMutation={
							removeAllPendingMutation as UseMutationResult<
								{ message: string; deleted_count: number },
								Error,
								void,
								unknown
							>
						}
						onOpenBatchPaymentDialog={() => setShowBatchPaymentDialog(true)}
						cancelLabRequestMutation={cancelLabRequestMutation}
						unpayLabRequestMutation={unpayLabRequestMutation}
					/>
				</div>
			</div>
			{/* {console.log(showBatchPaymentDialog, "showBatchPaymentDialog",requestedTests,'requestedTests',selectedPatientVisit.patient,'selectedPatientVisit.patient',currentClinicShift,'currentClinicShift')} */}
			{/* Batch Payment Dialog */}
			{currentClinicShift && requestedTests && selectedPatientVisit.patient && (
				<BatchLabPaymentDialog
					isOpen={showBatchPaymentDialog}
					onOpenChange={setShowBatchPaymentDialog}
					visitId={visitId}
					requestedTests={requestedTests}
					currentPatient={selectedPatientVisit.patient}
					currentClinicShift={currentClinicShift}
					onBatchPaymentSuccess={() => {
						queryClient.invalidateQueries({ queryKey: requestedTestsQueryKey });
						// queryClient.setQueryData(
						//   requestedTestsQueryKey,
						//   updatedVisitData.lab_requests || []
						// );
						queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
						setShowBatchPaymentDialog(false);
					}}
				/>
			)}
			
		</div>
	);
};

export default LabRequestComponent;
