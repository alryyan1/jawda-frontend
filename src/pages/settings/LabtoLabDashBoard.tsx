import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LabDocument {
	id: string;
	name: string;
	address: string;
	available: boolean;
	isApproved: boolean;
	phone: string;
	whatsApp: string;
	ownerUserName: string;
	password: string;
	order: number;
	location: {
		lat: number;
		lng: number;
	};
	lab_order_received_subscribed: boolean;
	createdAt: unknown;
}

const Card: React.FC<{ title: string; onClick?: () => void }> = ({ title, onClick }) => (
	<button
		onClick={onClick}
		className="w-full rounded-lg border p-6 text-right hover:shadow-md transition-shadow bg-card"
	>
		<div className="text-lg font-semibold">{title}</div>
	</button>
);

const LabtoLabDashBoard: React.FC = () => {
	const { labId } = useParams();
	const navigate = useNavigate();
	const [labData, setLabData] = useState<LabDocument | null>(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);

	// Fetch lab data from Firestore
	useEffect(() => {
		const fetchLabData = async () => {
			if (!labId) return;
			
			try {
				setLoading(true);
				const labDocRef = doc(db, 'labToLap', labId);
				const labDocSnap = await getDoc(labDocRef);
				
				if (labDocSnap.exists()) {
					const data = labDocSnap.data() as LabDocument;
					setLabData({ ...data, id: labDocSnap.id });
				} else {
					toast.error('المعمل غير موجود');
				}
			} catch (error) {
				console.error('Error fetching lab data:', error);
				toast.error('حدث خطأ في جلب بيانات المعمل');
			} finally {
				setLoading(false);
			}
		};

		fetchLabData();
	}, [labId]);

	// Toggle approval status
	const toggleApproval = async () => {
		if (!labData || !labId) return;

		try {
			setUpdating(true);
			const labDocRef = doc(db, 'labToLap', labId);
			const newApprovalStatus = !labData.isApproved;
			
			await updateDoc(labDocRef, {
				isApproved: newApprovalStatus
			});

			setLabData(prev => prev ? { ...prev, isApproved: newApprovalStatus } : null);
			
			toast.success(
				newApprovalStatus 
					? 'تم تفعيل المعمل بنجاح' 
					: 'تم إلغاء تفعيل المعمل بنجاح'
			);
		} catch (error) {
			console.error('Error updating approval status:', error);
			toast.error('حدث خطأ في تحديث حالة التفعيل');
		} finally {
			setUpdating(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin" />
				<span className="mr-2">جاري التحميل...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<h1 className="text-xl font-semibold">لوحة المعامل المتعاقده</h1>
			{labId && labData && (
				<div className="space-y-4">
					<div className="text-sm text-muted-foreground">
						المعمل: {labData.name} - {labData.address}
					</div>
					
					{/* Big Approval Toggle Button */}
					<div className="flex justify-center">
						<Button
							onClick={toggleApproval}
							disabled={updating}
							size="lg"
							className={`h-20 px-12 text-lg font-bold transition-all duration-300 ${
								labData.isApproved
									? 'bg-green-600 hover:bg-green-700 text-white'
									: 'bg-red-600 hover:bg-red-700 text-white'
							}`}
						>
							{updating ? (
								<>
									<Loader2 className="h-6 w-6 animate-spin ml-2" />
									جاري التحديث...
								</>
							) : labData.isApproved ? (
								<>
									<CheckCircle className="h-6 w-6 ml-2" />
									المعمل مفعل
								</>
							) : (
								<>
									<XCircle className="h-6 w-6 ml-2" />
									المعمل غير مفعل
								</>
							)}
						</Button>
					</div>
					
					{/* Lab Status Info */}
					<div className="text-center text-sm text-muted-foreground">
						{labData.isApproved ? (
							<span className="text-green-600 font-medium">✓ المعمل نشط ومتاح للاستخدام</span>
						) : (
							<span className="text-red-600 font-medium">✗ المعمل غير نشط وغير متاح للاستخدام</span>
						)}
					</div>
				</div>
			)}
			
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card title="النتائج" />
				<Card title="عينه جديد (تحليل جديد)" />
				<Card title="قائمه الاسعار" onClick={() => navigate(`/settings/lab-to-lab/${encodeURIComponent(String(labId))}/price-list`)} />
				<Card title="المتسخدمين" />
			</div>
		</div>
	);
};

export default LabtoLabDashBoard;


