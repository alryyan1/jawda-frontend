import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Settings as SettingsIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

interface LabDoc {
	 id: string;
	 name?: string;
	 isApproved?: boolean;
	 [key: string]: unknown;
	 createdAt?: unknown;
}

type EditableLabFields = {
	name: string;
	address: string;
	available: boolean;
	imageUrl: string;
	order: string;
	phone: string;
	whatsApp: string;
	isApproved: boolean;
};

const LabToLab: React.FC = () => {
	const [labs, setLabs] = useState<LabDoc[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState<boolean>(false);
	const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
	const [form, setForm] = useState<EditableLabFields>({
		name: '',
		address: '',
		available: true,
		imageUrl: '',
		order: '',
		phone: '',
		whatsApp: '',
		isApproved: false,
	});
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [isUploading, setIsUploading] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	// Create contract state
	const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
	const [createForm, setCreateForm] = useState<EditableLabFields>({
		name: '',
		address: '',
		available: true,
		imageUrl: '',
		order: '',
		phone: '',
		whatsApp: '',
		isApproved: false,
	});
	const [isCreating, setIsCreating] = useState<boolean>(false);
	const [isUploadingCreate, setIsUploadingCreate] = useState<boolean>(false);
	const createFileInputRef = useRef<HTMLInputElement | null>(null);
	const selectedLab = useMemo(() => labs.find(l => l.id === selectedLabId), [labs, selectedLabId]);
	const createdAtText = useMemo(() => {
		const value = selectedLab?.createdAt as unknown;
		return value != null ? String(value) : null;
	}, [selectedLab]);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const colRef = collection(db, 'labToLap');
				const snapshot = await getDocs(colRef);
				if (!mounted) return;
				const items: LabDoc[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
				setLabs(items);
			} catch (e: unknown) {
				const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to load';
				setError(message);
			} finally {
				setLoading(false);
			}
		})();
		return () => { mounted = false; };
	}, []);

	const openSettings = (lab: LabDoc) => {
		setSelectedLabId(lab.id);
		setForm({
			name: String(lab.name ?? ''),
			address: String(lab.address ?? ''),
			available: Boolean(lab.available ?? true),
			imageUrl: String(lab.imageUrl ?? ''),
			order: String(lab.order ?? ''),
			phone: String(lab.phone ?? ''),
			whatsApp: String(lab.whatsApp ?? ''),
			isApproved: Boolean(lab.isApproved ?? false),
		});
		setDialogOpen(true);
	};

	const handleFormChange = (field: keyof EditableLabFields, value: string | boolean) => {
		setForm(prev => ({ ...prev, [field]: value } as EditableLabFields));
	};

	const handleSave = async () => {
		if (!selectedLabId) return;
		setIsSaving(true);
		try {
			const ref = doc(db, 'labToLap', selectedLabId);
			await updateDoc(ref, {
				name: form.name,
				address: form.address,
				available: form.available,
				imageUrl: form.imageUrl,
				order: form.order,
				phone: form.phone,
				whatsApp: form.whatsApp,
				isApproved: form.isApproved,
			});
			// update local state
			setLabs(prev => prev.map(l => l.id === selectedLabId ? { ...l, ...form } : l));
			setDialogOpen(false);
		} catch (e: unknown) {
			const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to save';
			setError(message);
		} finally {
			setIsSaving(false);
		}
	};

	const handleChooseFile = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		setIsUploading(true);
		try {
			const path = `labs/${Date.now()}_${encodeURIComponent(file.name)}`;
			const fileRef = storageRef(storage, path);
			await uploadBytes(fileRef, file);
			const url = await getDownloadURL(fileRef);
			setForm(prev => ({ ...prev, imageUrl: url }));
		} catch (e: unknown) {
			const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Image upload failed';
			setError(message);
		} finally {
			setIsUploading(false);
		}
	};

	const openCreate = () => {
		setCreateForm({ name: '', address: '', available: true, imageUrl: '', order: '', phone: '', whatsApp: '', isApproved: false });
		setCreateDialogOpen(true);
	};

	const handleCreateChooseFile = () => {
		createFileInputRef.current?.click();
	};

	const handleCreateFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		setIsUploadingCreate(true);
		try {
			const path = `labs/${Date.now()}_${encodeURIComponent(file.name)}`;
			const fileRef = storageRef(storage, path);
			await uploadBytes(fileRef, file);
			const url = await getDownloadURL(fileRef);
			setCreateForm(prev => ({ ...prev, imageUrl: url }));
		} catch (e: unknown) {
			const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Image upload failed';
			setError(message);
		} finally {
			setIsUploadingCreate(false);
		}
	};

	const handleCreateChange = (field: keyof EditableLabFields, value: string | boolean) => {
		setCreateForm(prev => ({ ...prev, [field]: value } as EditableLabFields));
	};

	const handleCreateSave = async () => {
		setIsCreating(true);
		try {
			const colRef = collection(db, 'labToLap');
			const newDoc = {
				name: createForm.name,
				address: createForm.address,
				available: createForm.available,
				imageUrl: createForm.imageUrl,
				order: createForm.order,
				phone: createForm.phone,
				whatsApp: createForm.whatsApp,
				isApproved: createForm.isApproved,
				createdAt: serverTimestamp(),
			};
			const docRef = await addDoc(colRef, newDoc);
			setLabs(prev => [{ id: docRef.id, ...newDoc }, ...prev]);
			setCreateDialogOpen(false);
		} catch (e: unknown) {
			const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to create';
			setError(message);
		} finally {
			setIsCreating(false);
		}
	};

	if (loading) {
		return <div className="text-sm text-muted-foreground">جارِ التحميل...</div>;
	}

	if (error) {
		return <div className="text-sm text-destructive">حدث خطأ: {error}</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">المعامل المتعاقده</h1>
				<button
					type="button"
					onClick={openCreate}
					className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
				>
					إنشاء عقد جديد
				</button>
			</div>
			{labs.length === 0 ? (
				<div className="text-sm text-muted-foreground">لا توجد معامل</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
					{/* Approved Labs Section */}
					<div className="flex flex-col">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-lg font-semibold text-green-600">المعامل المعتمدة</h2>
							<span className="text-sm text-muted-foreground bg-green-100 text-green-800 px-2 py-1 rounded-full">
								{labs.filter(lab => lab.isApproved).length}
							</span>
						</div>
						<div className="flex-1 overflow-hidden">
							{labs.filter(lab => lab.isApproved).length === 0 ? (
								<div className="text-sm text-muted-foreground text-center py-8">لا توجد معامل معتمدة</div>
							) : (
								<div className="h-full overflow-y-auto border rounded-md">
									<ul className="divide-y">
										{labs.filter(lab => lab.isApproved).map((lab) => (
											<li key={lab.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
												<div className="flex items-center justify-between gap-3">
													<Link
														to={`/settings/lab-to-lab/${encodeURIComponent(lab.id)}`}
														className="flex items-center gap-3 hover:text-primary flex-1"
													>
														<span className="font-medium">{lab.name || lab.id}</span>
														<span className="text-xs text-muted-foreground">{lab.id}</span>
													</Link>
													<button
														type="button"
														onClick={() => openSettings(lab)}
														className="p-2 rounded-md hover:bg-muted text-muted-foreground"
														aria-label="Edit settings"
													>
														<SettingsIcon className="w-4 h-4" />
													</button>
												</div>
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</div>

					{/* Pending Labs Section */}
					<div className="flex flex-col">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-lg font-semibold text-orange-600">المعامل المعلقة</h2>
							<span className="text-sm text-muted-foreground bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
								{labs.filter(lab => !lab.isApproved).length}
							</span>
						</div>
						<div className="flex-1 overflow-hidden">
							{labs.filter(lab => !lab.isApproved).length === 0 ? (
								<div className="text-sm text-muted-foreground text-center py-8">لا توجد معامل معلقة</div>
							) : (
								<div className="h-full overflow-y-auto border rounded-md">
									<ul className="divide-y">
										{labs.filter(lab => !lab.isApproved).map((lab) => (
											<li key={lab.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
												<div className="flex items-center justify-between gap-3">
													<Link
														to={`/settings/lab-to-lab/${encodeURIComponent(lab.id)}`}
														className="flex items-center gap-3 hover:text-primary flex-1"
													>
														<span className="font-medium">{lab.name || lab.id}</span>
														<span className="text-xs text-muted-foreground">{lab.id}</span>
													</Link>
													<button
														type="button"
														onClick={() => openSettings(lab)}
														className="p-2 rounded-md hover:bg-muted text-muted-foreground"
														aria-label="Edit settings"
													>
														<SettingsIcon className="w-4 h-4" />
													</button>
												</div>
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{dialogOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40" onClick={() => setDialogOpen(false)}></div>
					<div className="relative z-10 w-full max-w-2xl rounded-lg border bg-card p-6 text-right shadow-lg">
						<h2 className="text-lg font-semibold mb-4">إعدادات المعمل</h2>
						<div className="grid grid-cols-1 gap-4">
							<div className="space-y-2">
								<span className="text-sm">الصورة</span>
								<div className="w-[150px] h-[150px] rounded-full border overflow-hidden bg-muted/20 flex items-center justify-center">
									{form.imageUrl ? (
										<img src={form.imageUrl} alt="lab" className="h-full w-full object-cover" />
									) : (
										<span className="text-xs text-muted-foreground">لا توجد صورة</span>
									)}
								</div>
								<div className="flex items-center gap-2">
									<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
									<button className="rounded-md border px-3 py-2" onClick={handleChooseFile} disabled={isUploading}>
										{isUploading ? 'جاري الرفع...' : 'رفع صورة'}
									</button>
								</div>
							</div>
							<label className="space-y-1">
								<span className="text-sm">الاسم</span>
								<input className="w-full rounded-md border px-3 py-2 bg-background" value={form.name} onChange={e => handleFormChange('name', e.target.value)} />
							</label>
							<label className="space-y-1">
								<span className="text-sm">العنوان</span>
								<input className="w-full rounded-md border px-3 py-2 bg-background" value={form.address} onChange={e => handleFormChange('address', e.target.value)} />
							</label>
							<label className="flex items-center justify-between gap-3">
								<span className="text-sm">متاح</span>
								<input type="checkbox" checked={form.available} onChange={e => handleFormChange('available', e.target.checked)} />
							</label>
							<label className="flex items-center justify-between gap-3">
								<span className="text-sm">معتمد</span>
								<input type="checkbox" checked={form.isApproved} onChange={e => handleFormChange('isApproved', e.target.checked)} />
							</label>

							<label className="space-y-1">
								<span className="text-sm">الهاتف</span>
								<input className="w-full rounded-md border px-3 py-2 bg-background" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} />
							</label>
							<label className="space-y-1">
								<span className="text-sm">واتس آب</span>
								<input className="w-full rounded-md border px-3 py-2 bg-background" value={form.whatsApp} onChange={e => handleFormChange('whatsApp', e.target.value)} />
							</label>
							{createdAtText && (
								<div className="text-xs text-muted-foreground">
									تاريخ الإنشاء: {createdAtText}
								</div>
							)}
						</div>
						<div className="mt-6 flex items-center justify-start gap-2">
							<button className="rounded-md border px-4 py-2" onClick={() => setDialogOpen(false)} disabled={isSaving || isUploading}>إلغاء</button>
							<button className="rounded-md bg-primary text-primary-foreground px-4 py-2 disabled:opacity-70" onClick={handleSave} disabled={isSaving || isUploading}>
								{isSaving ? 'جاري الحفظ...' : 'حفظ'}
							</button>
						</div>
					</div>
				</div>
			)}

			{createDialogOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40" onClick={() => setCreateDialogOpen(false)}></div>
					<div className="relative z-10 w-full max-w-2xl rounded-lg border bg-card p-6 text-right shadow-lg">
						<h2 className="text-lg font-semibold mb-4">إنشاء عقد مختبر جديد</h2>
						<div className="grid grid-cols-1 gap-4">
							<div className="space-y-2">
								<span className="text-sm">الصورة</span>
								<div className="w-[150px] h-[150px] rounded-full border overflow-hidden bg-muted/20 flex items-center justify-center">
									{createForm.imageUrl ? (
										<img src={createForm.imageUrl} alt="lab" className="h-full w-full object-cover" />
									) : (
										<span className="text-xs text-muted-foreground">لا توجد صورة</span>
									)}
								</div>
								<div className="flex items-center gap-2">
									<input ref={createFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCreateFileChange} />
									<button className="rounded-md border px-3 py-2" onClick={handleCreateChooseFile} disabled={isUploadingCreate}>
										{isUploadingCreate ? 'جاري الرفع...' : 'رفع صورة'}
									</button>
								</div>
							</div>
							<label className="space-y-1">
								<span className="text-sm">الاسم</span>
								<input className="w-full rounded-md border px-3 py-2 bg-background" value={createForm.name} onChange={e => handleCreateChange('name', e.target.value)} />
							</label>
							<label className="space-y-1">
								<span className="text-sm">العنوان</span>
								<input className="w-full rounded-md border px-3 py-2 bg-background" value={createForm.address} onChange={e => handleCreateChange('address', e.target.value)} />
							</label>
							<label className="space-y-1">
								<span className="text-sm">الهاتف</span>
								<input className="w-full rounded-md border px-3 py-2 bg-background" value={createForm.phone} onChange={e => handleCreateChange('phone', e.target.value)} />
							</label>
							<label className="space-y-1">
								<span className="text-sm">واتس آب</span>
								<input className="w-full rounded-md border px-3 py-2 bg-background" value={createForm.whatsApp} onChange={e => handleCreateChange('whatsApp', e.target.value)} />
							</label>
							<label className="flex items-center justify-between gap-3">
								<span className="text-sm">متاح</span>
								<input type="checkbox" checked={createForm.available} onChange={e => handleCreateChange('available', e.target.checked)} />
							</label>
							<label className="flex items-center justify-between gap-3">
								<span className="text-sm">معتمد</span>
								<input type="checkbox" checked={createForm.isApproved} onChange={e => handleCreateChange('isApproved', e.target.checked)} />
							</label>
						</div>
						<div className="mt-6 flex items-center justify-start gap-2">
							<button className="rounded-md border px-4 py-2" onClick={() => setCreateDialogOpen(false)} disabled={isCreating || isUploadingCreate}>إلغاء</button>
							<button className="rounded-md bg-primary text-primary-foreground px-4 py-2 disabled:opacity-70" onClick={handleCreateSave} disabled={isCreating || isUploadingCreate}>
								{isCreating ? 'جاري الحفظ...' : 'حفظ'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default LabToLab;


