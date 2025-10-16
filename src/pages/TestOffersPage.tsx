import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  DollarSign,
  TestTube,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import apiClient from '@/services/api';

interface MainTest {
  id: number;
  main_test_name: string;
}

interface Offer {
  id: number;
  name: string;
  price: number;
  main_tests: (MainTest & { pivot?: { price?: number } })[];
  created_at: string;
  updated_at: string;
}

interface OfferFormData {
  name: string;
  price: string;
  main_test_ids: number[];
  offered_tests?: { main_test_id: number; price: number }[];
}

const TestOffersPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState<OfferFormData>({
    name: '',
    price: '',
    main_test_ids: [],
  });

  const queryClient = useQueryClient();

  // Fetch offers
  const { data: offers, isLoading: isLoadingOffers } = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const response = await apiClient.get('/offers');
      return response.data.data as Offer[];
    },
  });

  // Fetch main tests
  const { data: mainTests } = useQuery({
    queryKey: ['offers-main-tests'],
    queryFn: async () => {
      const response = await apiClient.get('/offers-main-tests');
      return response.data.data as MainTest[];
    },
  });

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (data: OfferFormData) => {
      const response = await apiClient.post('/offers', {
        name: data.name,
        price: parseFloat(data.price),
        main_test_ids: data.main_test_ids,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('تم إنشاء العرض بنجاح');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في إنشاء العرض');
    },
  });

  // Update offer mutation
  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: OfferFormData }) => {
      const response = await apiClient.put(`/offers/${id}`, {
        name: data.name,
        price: parseFloat(data.price),
        main_test_ids: data.main_test_ids,
        offered_tests: data.offered_tests,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('تم تحديث العرض بنجاح');
      setIsEditDialogOpen(false);
      setEditingOffer(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في تحديث العرض');
    },
  });

  // Delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/offers/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('تم حذف العرض بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في حذف العرض');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      main_test_ids: [],
    });
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      price: offer.price.toString(),
      main_test_ids: offer.main_tests.map(test => test.id),
      offered_tests: offer.main_tests.map(test => ({
        main_test_id: test.id,
        price: Number(test.pivot?.price ?? 0),
      })),
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingOffer) {
      updateOfferMutation.mutate({ id: editingOffer.id, data: formData });
    } else {
      createOfferMutation.mutate(formData);
    }
  };

  const handleTestToggle = (testId: number) => {
    setFormData(prev => ({
      ...prev,
      main_test_ids: prev.main_test_ids.includes(testId)
        ? prev.main_test_ids.filter(id => id !== testId)
        : [...prev.main_test_ids, testId],
      offered_tests: (prev.offered_tests || [])
        .filter(t => t.main_test_id !== testId)
    }));
  };

  const updateOfferedTestPrice = (main_test_id: number, value: string) => {
    const price = parseInt(value || '0', 10) || 0;
    setFormData(prev => {
      const current = prev.offered_tests || [];
      const exists = current.find(t => t.main_test_id === main_test_id);
      let next: { main_test_id: number; price: number }[];
      if (exists) {
        next = current.map(t => t.main_test_id === main_test_id ? { ...t, price } : t);
      } else {
        next = [...current, { main_test_id, price }];
      }
      return { ...prev, offered_tests: next };
    });
  };

  if (isLoadingOffers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة عروض التحاليل</h1>
          <p className="text-muted-foreground mt-2">
            إنشاء وإدارة عروض التحاليل الطبية
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة عرض جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة عرض جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">اسم العرض</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم العرض"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="price">السعر</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="أدخل السعر"
                  required
                />
              </div>

              <div>
                <Label>التحاليل المدرجة في العرض</Label>
                <div className="max-h-60 overflow-y-auto border rounded-md p-4 space-y-2">
                  {mainTests?.map((test) => (
                    <div key={test.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`test-${test.id}`}
                        checked={formData.main_test_ids.includes(test.id)}
                        onCheckedChange={() => handleTestToggle(test.id)}
                      />
                      <Label htmlFor={`test-${test.id}`} className="text-sm">
                        {test.main_test_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                >
                  {createOfferMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {offers?.map((offer) => (
          <Card key={offer.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{offer.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(offer)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف العرض "{offer.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteOfferMutation.mutate(offer.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-lg">
                  {offer.price.toLocaleString()} ريال
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <TestTube className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    التحاليل المدرجة ({offer.main_tests.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {offer.main_tests.slice(0, 3).map((test) => (
                    <Badge key={test.id} variant="secondary" className="text-xs">
                      {test.main_test_name}
                    </Badge>
                  ))}
                  {offer.main_tests.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{offer.main_tests.length - 3} أخرى
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {offers?.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد عروض</h3>
          <p className="text-muted-foreground mb-4">
            ابدأ بإنشاء عرض جديد للتحاليل الطبية
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة عرض جديد
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل العرض</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم العرض</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل اسم العرض"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-price">السعر</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="أدخل السعر"
                required
              />
            </div>

            <div>
              <Label>التحاليل وأسعارها داخل العرض</Label>
              <div className="max-h-72 overflow-y-auto border rounded-md p-4 space-y-3">
                {mainTests?.map((test) => {
                  const selected = formData.main_test_ids.includes(test.id);
                  const pivotPrice = (formData.offered_tests || []).find(t => t.main_test_id === test.id)?.price ?? 0;
                  return (
                    <div key={test.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`edit-test-${test.id}`}
                        checked={selected}
                        onCheckedChange={() => handleTestToggle(test.id)}
                      />
                      <Label htmlFor={`edit-test-${test.id}`} className="text-sm flex-1">
                        {test.main_test_name}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">السعر</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          className="w-28 h-8"
                          value={pivotPrice}
                          onChange={(e) => updateOfferedTestPrice(test.id, e.target.value)}
                          disabled={!selected}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={updateOfferMutation.isPending}
              >
                {updateOfferMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestOffersPage;
