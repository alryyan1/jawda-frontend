// src/components/clinic/PatientRegistrationForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Autocomplete,
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
  FormHelperText
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { Add as AddIcon } from '@mui/icons-material';

import type { Patient, PatientSearchResult } from '@/types/patients';
import type { Company, CompanyRelation, Subcompany } from '@/types/companies';
import type { DoctorShift } from '@/types/doctors';
import apiClient from '@/services/api';
import PatientistorytableClinc from '@/components/clinic/PatientistorytableClinc';
import AddSubcompanyDialog from '@/components/companies/AddSubcompanyDialog';
import AddCompanyRelationDialog from '@/components/companies/AddCompanyRelationDialog';
import { useAuthorization } from '@/hooks/useAuthorization';

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
      phone: '0',
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
  const [showPatientHistory, setShowPatientHistory] = useState(false);

  // Dialog state
  const [showSubcompanyDialog, setShowSubcompanyDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);
  const { can } = useAuthorization();
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
      const response = await apiClient.get('/companies', { params: { per_page: 10000 } });
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
      const response = await apiClient.get(`/companies/${companyId}/subcompanies`);
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
      const response = await apiClient.get('/company-relations');
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
      const response = await apiClient.get(`/patients/search-existing?term=${encodeURIComponent(query)}`);
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
        // Show patient history table when typing in phone field
        if (field === 'phone') {
          setShowPatientHistory(true);
        }
      } else {
        setShowPatientHistory(false);
      }
    }
  };

  const handleSelectChange = (field: keyof FormData) => (event: SelectChangeEvent) => {
    setOverflow(true);
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
    // setAlert({ type: 'error', message: 'حدث خطأ' });

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

      const response = await apiClient.post('/patients', submissionData);
      const newPatient = response.data.data;

      // setAlert({ type: 'error', message: 'حدث خطأ' });
      onPatientRegistered(newPatient);
      
      // Reset form
      setFormData({
        name: '',
        phone: '0',
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
      //  setAlert({ type: 'error', message: 'حدث خطأ' });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleSelectPatientFromHistory = async (patientId: number, _doctorId: number, companyId?: number) => {
    if (!activeDoctorShift?.doctor_id) {
      setAlert({ type: 'error', message: 'حدث خطأ' });
      return;
    }

    try {
      // First, we need to get the doctor visit ID from the search results
      const patientSearchResult = searchResults.find(p => p.id === patientId);
      if (!patientSearchResult?.last_visit_id) {
        setAlert({ type: 'error', message: 'لم يتم العثور على زيارة سابقة للمريض' });
        return;
      }

      const response = await apiClient.post(`/doctor-visits/${patientSearchResult.last_visit_id}/create-clinic-visit-from-history`, { 
        doctor_id: activeDoctorShift.doctor_id,
        doctor_shift_id: activeDoctorShift.id,
        company_id: companyId,
        reason_for_visit: 'متابعة'
      });

      const newPatient = response.data.data;
      setOverflow(false);
      onPatientRegistered(newPatient as Patient);
      
      // Reset form
      setFormData({
        name: '',
        phone: '0',
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
      setShowPatientHistory(false);
      setSearchQuery('');
      
    } catch (error: unknown) {
      console.error('Failed to create visit:', error);
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

  const [overflow, setOverflow] = useState(false);
  return (
    <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto', position: 'relative',overflowY: overflow ? 'auto' : 'unset'}}>
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert({ type: 'error', message: 'حدث خطأ' })}
          sx={{ mb: 2 }}
        >
          {alert.message}
        </Alert>
      )}

      <Card >
        <CardContent >
       
          <Box component="form" onSubmit={handleSubmit}  sx={{ mt: 2 }}>
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
                <Autocomplete
                  options={companies}
                  value={companies.find(c => String(c.id) === formData.company_id) || null}
                  onChange={(_e, newValue) => {
                    setFormData(prev => ({
                      ...prev,
                      company_id: newValue ? String(newValue.id) : '',
                      subcompany_id: '',
                      company_relation_id: ''
                    }));
                    if (errors.company_id) {
                      setErrors(prev => ({ ...prev, company_id: undefined }));
                    }
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  loading={isLoadingCompanies}
                  disabled={isLoadingCompanies || isSubmitting || !can('تسجيل مريض تامين')}
                  clearOnEscape
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="الشركة"
                      error={!!errors.company_id}
                      helperText={errors.company_id}
                    />
                  )}
                  noOptionsText="لا توجد نتائج"
                  loadingText="جاري التحميل..."
                />
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
                disabled={isSubmitting || !activeDoctorShift?.doctor_id}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'جاري التسجيل...' : 'تسجيل المريض'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Patient History Table - positioned opposite to the form */}
      {showPatientHistory && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: '100%',
            transform: 'translateX(16px)',
            width: 850,
            zIndex: 10,
          }}
        >
          <PatientistorytableClinc
            searchResults={searchResults}
            isLoading={isSearching}
            onSelectPatient={handleSelectPatientFromHistory}
            referringDoctor={activeDoctorShift ? { id: activeDoctorShift.doctor_id || 0, name: activeDoctorShift.doctor_name || '' } : null}
          />
        </Box>
      )}


      {/* Add Subcompany Dialog */}
      <AddSubcompanyDialog 
        open={showSubcompanyDialog}
        companyId={formData.company_id ? Number(formData.company_id) : undefined}
        onClose={() => setShowSubcompanyDialog(false)}
        onCreated={() => {
          if (formData.company_id) {
            loadSubcompanies(Number(formData.company_id));
          }
        }}
      />

      {/* Add Company Relation Dialog */}
      <AddCompanyRelationDialog 
        open={showRelationDialog}
        companyId={formData.company_id ? Number(formData.company_id) : undefined}
        onClose={() => setShowRelationDialog(false)}
        onCreated={() => {
          loadCompanyRelations();
        }}
      />
    </Box>
  );
};

export default PatientRegistrationForm;