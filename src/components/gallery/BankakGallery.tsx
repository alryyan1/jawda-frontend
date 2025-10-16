import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Filter, Download, Eye, User, Phone, Clock } from 'lucide-react';
import { format } from 'date-fns';
import apiClient from '@/services/api';
import realtimeService from '@/services/realtimeService';
import { webUrl } from '@/pages/constants';

interface BankakImage {
  id: number;
  image_url: string;
  full_image_url: string;
  phone: string;
  doctorvisit_id: number | null;
  patient_name: string;
  created_at: string;
  created_at_human: string;
}


interface PaginationInfo {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  has_more_pages: boolean;
}

const BankakGallery: React.FC = () => {
  const [images, setImages] = useState<BankakImage[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [phoneFilter, setPhoneFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // UI State
  const [selectedImage, setSelectedImage] = useState<BankakImage | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const isListeningRef = useRef(false);
  
  // Refs to track current values for real-time handler
  const currentPageRef = useRef(currentPage);
  const selectedDateRef = useRef(selectedDate);
  const phoneFilterRef = useRef(phoneFilter);
  
  // Update refs when values change
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);
  
  useEffect(() => {
    phoneFilterRef.current = phoneFilter;
  }, [phoneFilter]);

  const fetchImages = useCallback(async (page = 1, date?: Date, phone?: string, updateCurrentPage = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
      });
      
      if (date) {
        params.append('date', format(date, 'yyyy-MM-dd'));
      }
      
      if (phone) {
        params.append('phone', phone);
      }
      
      const response = await apiClient.get(`/bankak-images?${params.toString()}`);
      
      if (response.data.success) {
        setImages(response.data.data);
        setPagination(response.data.pagination);
        if (updateCurrentPage) {
          setCurrentPage(page);
        }
      } else {
        setError('فشل في جلب الصور');
      }
    } catch (err) {
      setError('حدث خطأ في جلب الصور');
      console.error('Error fetching images:', err);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchImages(1, selectedDate, phoneFilter);
  }, [selectedDate, phoneFilter, fetchImages]);

  // Real-time listener for new bankak images
  useEffect(() => {
    // Prevent multiple listeners
    if (isListeningRef.current) {
      return;
    }

    const handleNewBankakImage = (data: BankakImage) => {
      console.log('New bankak image received:', data.id);
      
      // Replace full_image_url with webUrl + image_url
      const updatedData = {
        ...data,
        full_image_url: `${webUrl}/storage/${data.image_url}`
      };
      console.log(updatedData,'updatedData');
      
      // If we're on the first page and no filters are applied, add the new image to the top
      if (currentPageRef.current === 1 && !selectedDateRef.current && !phoneFilterRef.current) {
        setImages(prevImages => {
          // Check if image already exists to avoid duplicates
          const exists = prevImages.some(img => img.id === updatedData.id);
          if (!exists) {
            return [updatedData, ...prevImages];
          }
          return prevImages;
        });
        
      } else {
        // If we're on a different page or have filters, just refetch the current view
        fetchImages(currentPageRef.current, selectedDateRef.current, phoneFilterRef.current, false);
      }
    };

    // Check real-time connection status
    setIsRealtimeConnected(realtimeService.getConnectionStatus());

    // Subscribe to bankak image events
    realtimeService.onBankakImageInserted(handleNewBankakImage);
    isListeningRef.current = true;

    // Cleanup on unmount
    return () => {
      realtimeService.offBankakImageInserted(handleNewBankakImage);
      isListeningRef.current = false;
    };
  }, []); // Empty dependency array to run only once

  const handleDateSelect = (dateString: string) => {
    const date = dateString ? new Date(dateString) : undefined;
    setSelectedDate(date);
    setCurrentPage(1);
  };

  const handlePhoneFilter = (phone: string) => {
    setPhoneFilter(phone);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedDate(undefined);
    setPhoneFilter('');
    setCurrentPage(1);
  };

  const loadMore = () => {
    if (pagination?.has_more_pages) {
      fetchImages(currentPage + 1, selectedDate, phoneFilter);
    }
  };

  const downloadImage = (image: BankakImage) => {
    const link = document.createElement('a');
    link.href = image.full_image_url;
    link.download = `bankak_image_${image.id}_${image.created_at.split(' ')[0]}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="container mx-auto p-6 space-y-6">
     

      
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isRealtimeConnected ? 'متصل - التحديث المباشر نشط' : 'غير متصل - التحديث اليدوي فقط'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلاتر البحث
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Date Filter */}
            <div className="flex-1">
              <Label htmlFor="date-filter">التاريخ</Label>
              <Input
                id="date-filter"
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleDateSelect(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Phone Filter */}
            <div className="flex-1">
              <Label htmlFor="phone-filter">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone-filter"
                  placeholder="ابحث برقم الهاتف..."
                  value={phoneFilter}
                  onChange={(e) => handlePhoneFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Images Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد صور</h3>
            <p className="text-gray-600">لم يتم العثور على أي صور بالمعايير المحددة</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative group" style={{ width: '200px', height: '200px' }}>
                  <img
                    src={image.full_image_url}
                    // alt={`صورة ${image.id}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                    // onError={(e) => {
                    //   const target = e.target as HTMLImageElement;
                    //   target.src = '/placeholder-image.png';
                    // }}
                  />
                  {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center"> */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedImage(image)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadImage(image)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                {/* </div> */}
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{image.patient_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{image.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{image.created_at_human}</span>
                    </div>
                    {image.doctorvisit_id && (
                      <Badge variant="secondary" className="text-xs">
                        زيارة #{image.doctorvisit_id}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More Button */}
          {pagination?.has_more_pages && (
            <div className="text-center">
              <Button onClick={loadMore} disabled={loading}>
                {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">معاينة الصورة</h3>
              <Button variant="ghost" onClick={() => setSelectedImage(null)}>
                ✕
              </Button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.full_image_url}
                alt={`صورة ${selectedImage.id}`}
                className="max-w-full max-h-96 object-contain mx-auto"
              />
              <div className="mt-4 space-y-2">
                <p><strong>المريض:</strong> {selectedImage.patient_name}</p>
                <p><strong>رقم الهاتف:</strong> {selectedImage.phone}</p>
                <p><strong>تاريخ الإرسال:</strong> {selectedImage.created_at}</p>
                {selectedImage.doctorvisit_id && (
                  <p><strong>رقم الزيارة:</strong> {selectedImage.doctorvisit_id}</p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => downloadImage(selectedImage)}>
                  <Download className="h-4 w-4 mr-2" />
                  تحميل الصورة
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankakGallery;
