import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
	return (
		<div className="space-y-6">
			<h1 className="text-xl font-semibold">لوحة المعامل المتعاقده</h1>
			{labId && (
				<div className="text-sm text-muted-foreground">المعمل: {labId}</div>
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


