// src/components/clinic/PatientRegistrationForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';

import type { Patient, PatientSearchResult } from '@/types/patients';
import type { Company, CompanyRelation, Subcompany } from '@/types/companies';
import type { DoctorShift } from '@/types/doctors';
import apiClient from '@/services/api';

interface PatientRegistrationFormProps {
  onPatientRegistered: (patient: Patient) => void;
  activeDoctorShift: DoctorShift | null;
  isVisible?: boolean;
}

interface FormData {
  name: string;
  phone: string;
  gender: 'male' | 'female';
  age_year: string;
  age_month: string;
  age_day: string;
  address: string;
  company_id: string;
  insurance_no: string;
  guarantor: string;
  subcompany_id: string;
  company_relation_id: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  gender?: string;
  age_year?: string;
  age_month?: string;
  age_day?: string;
  address?: string;
  company_id?: string;
  insurance_no?: string;
  guarantor?: string;
  subcompany_id?: string;
  company_relation_id?: string;
}

const PatientRegistrationForm: React.FC<PatientRegistrationFormProps> = ({ 
  onPatientRegistered, 
  activeDoctorShift,
  isVisible 
}) => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
      name: '',
      phone: '',
      gender: 'female',
      age_year: '',
      age_month: '',
      age_day: '',
      address: '',
      company_id: '',
      insurance_no: '',
      guarantor: '',
      subcompany_id: '',
      company_relation_id: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompanySelected, setIsCompanySelected] = useState(false);

  // Data state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([]);
  const [companyRelations, setCompanyRelations] = useState<CompanyRelation[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingSubcompanies, setIsLoadingSubcompanies] = useState(false);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Dialog state
  const [showSubcompanyDialog, setShowSubcompanyDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);

  // Alert state
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Update isCompanySelected when company_id changes
  useEffect(() => {
    setIsCompanySelected(!!formData.company_id && formData.company_id !== '');
  }, [formData.company_id]);

  // Autofocus on name field when the form becomes visible
  useEffect(() => {
    if (isVisible && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  // Load companies on component mount
  useEffect(() => {
    loadCompanies();
    loadCompanyRelations();
  }, []);

  // Load subcompanies when company is selected
  useEffect(() => {
    if (formData.company_id) {
      loadSubcompanies(Number(formData.company_id));
    } else {
      setSubcompanies([]);
    }
  }, [formData.company_id]);

  // Search patients when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPatients(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadCompanies = async () => {
    try {
      setIsLoadingCompanies(true);
      const response = await axios.get('/api/companies');
      setCompanies(response.data.data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      setAlert({ type: 'error', message: 'فشل في تحميل الشركات' });
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const loadSubcompanies = async (companyId: number) => {
    try {
      setIsLoadingSubcompanies(true);
      const response = await axios.get(`/api/companies/${companyId}/subcompanies`);
      setSubcompanies(response.data.data || []);
    } catch (error) {
      console.error('Error loading subcompanies:', error);
      setAlert({ type: 'error', message: 'حدث خطأ' });
    } finally {
      setIsLoadingSubcompanies(false);
    }
  };

  const loadCompanyRelations = async () => {
    try {
      setIsLoadingRelations(true);
      const response = await axios.get('/api/company-relations');
      setCompanyRelations(response.data.data || []);
    } catch (error) {
      console.error('Error loading company relations:', error);
      setAlert({ type: 'error', message: 'حدث خطأ' });
    } finally {
      setIsLoadingRelations(false);
    }
  };

  const searchPatients = async (query: string) => {
    try {
      setIsSearching(true);
      const response = await axios.get(`/api/patients/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Handle search for name and phone fields
    if (field === 'name' || field === 'phone') {
      setSearchQuery(value);
      if (value.length >= 2) {
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
      }
    }
  };

  const handleSelectChange = (field: keyof FormData) => (event: any) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user makes selection
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'اسم المريض مطلوب';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    }

    if (!formData.gender) {
      newErrors.gender = 'الجنس مطلوب';
    }

    if (isCompanySelected && !formData.insurance_no.trim()) {
      newErrors.insurance_no = 'رقم التأمين مطلوب عند اختيار شركة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!activeDoctorShift?.doctor_id) {
      setAlert({ type: 'error', message: 'حدث خطأ' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setAlert({ type: 'error', message: 'حدث خطأ' });

    try {
      const submissionData = {
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender,
        age_year: formData.age_year ? parseInt(formData.age_year) : undefined,
        age_month: formData.age_month ? parseInt(formData.age_month) : undefined,
        age_day: formData.age_day ? parseInt(formData.age_day) : undefined,
        company_id: formData.company_id ? parseInt(formData.company_id) : undefined,
        doctor_id: activeDoctorShift.doctor_id,
        doctor_shift_id: activeDoctorShift.id,
        insurance_no: isCompanySelected ? formData.insurance_no || undefined : undefined,
        guarantor: isCompanySelected ? formData.guarantor || undefined : undefined,
        subcompany_id: isCompanySelected && formData.subcompany_id ? parseInt(formData.subcompany_id) : undefined,
        company_relation_id: isCompanySelected && formData.company_relation_id ? parseInt(formData.company_relation_id) : undefined,
      };

      const response = await apiClient.post('/api/patients', submissionData);
      const newPatient = response.data.data;

      setAlert({ type: 'error', message: 'حدث خطأ' });
      onPatientRegistered(newPatient);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        gender: 'female',
        age_year: '',
        age_month: '',
        age_day: '',
        address: '',
        company_id: '',
        insurance_no: '',
        guarantor: '',
        subcompany_id: '',
        company_relation_id: '',
      });
      
      if (nameInputRef.current) nameInputRef.current.focus();
      
    } catch (error: unknown) {
      console.error('Patient registration failed:', error);
      
      let errorMessage = 'فشل في تسجيل المريض';
      const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string; } } };
      if (axiosError.response?.data?.errors) {
        const fieldErrors = Object.values(axiosError.response.data.errors).flat().join(' ');
        errorMessage = `${errorMessage}: ${fieldErrors}`;
      } else if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      }
      
      setAlert({ type: 'error', message: 'حدث خطأ' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPatientFromSearch = async (patientId: number, previousVisitId?: number | null) => {
    if (!activeDoctorShift?.doctor_id) {
      setAlert({ type: 'error', message: 'حدث خطأ' });
      return;
    }

    try {
      const response = await axios.post('/api/visits', { patient_id: patientId, doctor_shift_id: activeDoctorShift.id });

      const newDoctorVisit = response.data.data;
      setAlert({ type: 'error', message: 'حدث خطأ' });
      onPatientRegistered(newDoctorVisit.patient as Patient);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        gender: 'female',
        age_year: '',
        age_month: '',
        age_day: '',
        address: '',
        company_id: '',
        insurance_no: '',
        guarantor: '',
        subcompany_id: '',
        company_relation_id: '',
      });
      setShowSearchResults(false);
      setSearchQuery('');
      
    } catch (error: unknown) {
      console.error('Failed to create visit:', error);
      
      let errorMessage = 'فشل في إنشاء زيارة';
      const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string; } } };
      if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      } else if (axiosError.response?.data?.errors) {
        const errors = Object.values(axiosError.response.data.errors).flat().join(', ');
        errorMessage = `${errorMessage}: ${errors}`;
      }
      
      setAlert({ type: 'error', message: 'حدث خطأ' });
    }
  };

  // These functions are kept for future implementation of add dialogs
  // const handleSubcompanyAdded = (newSubcompany: Subcompany) => {
  //   setSubcompanies(prev => [...prev, newSubcompany]);
  //   setFormData(prev => ({ ...prev, subcompany_id: String(newSubcompany.id) }));
  //   setAlert({ type: 'error', message: 'حدث خطأ' });
  //   setShowSubcompanyDialog(false);
  // };

  // const handleRelationAdded = (newRelation: CompanyRelation) => {
  //   setCompanyRelations(prev => [...prev, newRelation]);
  //   setFormData(prev => ({ ...prev, company_relation_id: String(newRelation.id) }));
  //   setAlert({ type: 'error', message: 'حدث خطأ' });
  //   setShowRelationDialog(false);
  // };

  return (
    <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto' }}>
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert({ type: 'error', message: 'حدث خطأ' })}
          sx={{ mb: 2 }}
        >
          {alert.message}
        </Alert>
      )}

      <Card>
        <CardContent>
       
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Phone Number Field */}
              <TextField
                fullWidth
                label="رقم الهاتف"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                error={!!errors.phone}
                helperText={errors.phone}
                inputRef={phoneInputRef}
                disabled={isSubmitting}
                inputProps={{ maxLength: 10 }}
              />

              {/* Name Field */}
              <TextField
                fullWidth
                label="اسم المريض"
                value={formData.name}
                onChange={handleInputChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                inputRef={nameInputRef}
                disabled={isSubmitting}
              />

              {/* Gender Field */}
              <FormControl fullWidth error={!!errors.gender}>
                <InputLabel>الجنس</InputLabel>
                <Select
                  value={formData.gender}
                  onChange={handleSelectChange('gender')}
                  label="الجنس"
                  disabled={isSubmitting}
                >
                  <MenuItem value="female">أنثى</MenuItem>
                  <MenuItem value="male">ذكر</MenuItem>
                </Select>
                {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
              </FormControl>

              {/* Age Fields */}
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  العمر
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="سنوات"
                    type="number"
                    value={formData.age_year}
                    onChange={handleInputChange('age_year')}
                    error={!!errors.age_year}
                    helperText={errors.age_year}
                    disabled={isSubmitting}
                  />
                  <TextField
                    fullWidth
                    label="أشهر"
                    type="number"
                    value={formData.age_month}
                    onChange={handleInputChange('age_month')}
                    error={!!errors.age_month}
                    helperText={errors.age_month}
                    disabled={isSubmitting}
                  />
                  <TextField
                    fullWidth
                    label="أيام"
                    type="number"
                    value={formData.age_day}
                    onChange={handleInputChange('age_day')}
                    error={!!errors.age_day}
                    helperText={errors.age_day}
                    disabled={isSubmitting}
                  />
                </Box>
              </Box>

              {/* Company Field */}
              <FormControl fullWidth error={!!errors.company_id}>
                <InputLabel>الشركة</InputLabel>
                <Select
                  value={formData.company_id}
                  onChange={handleSelectChange('company_id')}
                  label="الشركة"
                  disabled={isLoadingCompanies || isSubmitting}
                >
                  <MenuItem value="">لا يوجد</MenuItem>
                  {isLoadingCompanies ? (
                    <MenuItem disabled>جاري التحميل...</MenuItem>
                  ) : (
                    companies.map(comp => (
                      <MenuItem key={comp.id} value={String(comp.id)}>
                        {comp.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {errors.company_id && <FormHelperText>{errors.company_id}</FormHelperText>}
              </FormControl>

              {/* Insurance Details Section */}
              {isCompanySelected && (
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'primary.50' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.main' }}>
                    تفاصيل التأمين
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="رقم التأمين"
                      value={formData.insurance_no}
                      onChange={handleInputChange('insurance_no')}
                      error={!!errors.insurance_no}
                      helperText={errors.insurance_no}
                      disabled={isSubmitting}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="الضامن"
                      value={formData.guarantor}
                      onChange={handleInputChange('guarantor')}
                      error={!!errors.guarantor}
                      helperText={errors.guarantor}
                      disabled={isSubmitting}
                      size="small"
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControl fullWidth error={!!errors.subcompany_id}>
                        <InputLabel>الشركة الفرعية</InputLabel>
                        <Select
                          value={formData.subcompany_id}
                          onChange={handleSelectChange('subcompany_id')}
                          label="الشركة الفرعية"
                          disabled={isLoadingSubcompanies || isSubmitting}
                          size="small"
                        >
                          <MenuItem value="">لا يوجد</MenuItem>
                          {subcompanies.map(sub => (
                            <MenuItem key={sub.id} value={String(sub.id)}>
                              {sub.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.subcompany_id && <FormHelperText>{errors.subcompany_id}</FormHelperText>}
                      </FormControl>
                      <IconButton
                        onClick={() => setShowSubcompanyDialog(true)}
                        disabled={isSubmitting}
                        size="small"
                      >
                        <AddIcon />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControl fullWidth error={!!errors.company_relation_id}>
                        <InputLabel>العلاقة</InputLabel>
                        <Select
                          value={formData.company_relation_id}
                          onChange={handleSelectChange('company_relation_id')}
                          label="العلاقة"
                          disabled={isLoadingRelations || isSubmitting}
                          size="small"
                        >
                          <MenuItem value="">لا يوجد</MenuItem>
                          {companyRelations.map(relation => (
                            <MenuItem key={relation.id} value={String(relation.id)}>
                              {relation.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.company_relation_id && <FormHelperText>{errors.company_relation_id}</FormHelperText>}
                      </FormControl>
                      <IconButton
                        onClick={() => setShowRelationDialog(true)}
                        disabled={isSubmitting}
                        size="small"
                      >
                        <AddIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Card>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'جاري التسجيل...' : 'تسجيل المريض'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Search Results Dialog */}
      <Dialog 
        open={showSearchResults && searchResults.length > 0} 
        onClose={() => setShowSearchResults(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>نتائج البحث</DialogTitle>
        <DialogContent>
          {isSearching ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              {searchResults.map((result) => (
                <Card key={result.id} sx={{ mb: 1, cursor: 'pointer' }} 
                      onClick={() => handleSelectPatientFromSearch(result.id, result.last_visit_id)}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle1">{result.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      الهاتف: {result.phone}
                    </Typography>
                    {result.last_visit_date && (
                      <Typography variant="body2" color="text.secondary">
                        آخر زيارة: {new Date(result.last_visit_date).toLocaleDateString('ar-SA')}
                      </Typography>
                    )}
                  </CardContent>
            </Card>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Subcompany Dialog */}
      <Dialog open={showSubcompanyDialog} onClose={() => setShowSubcompanyDialog(false)}>
        <DialogTitle>إضافة شركة فرعية</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="اسم الشركة الفرعية"
            fullWidth
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubcompanyDialog(false)}>إلغاء</Button>
          <Button variant="contained">إضافة</Button>
        </DialogActions>
      </Dialog>

      {/* Add Company Relation Dialog */}
      <Dialog open={showRelationDialog} onClose={() => setShowRelationDialog(false)}>
        <DialogTitle>إضافة علاقة</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="اسم العلاقة"
            fullWidth
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRelationDialog(false)}>إلغاء</Button>
          <Button variant="contained">إضافة</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientRegistrationForm;