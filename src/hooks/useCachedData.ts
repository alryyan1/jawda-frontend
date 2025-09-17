import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getDoctorsList } from '@/services/doctorService';
import { getCompaniesList } from '@/services/companyService';
import { getCompanyRelationsList } from '@/services/companyService';
import { getMainTestsListForSelection } from '@/services/mainTestService';
import type { DoctorStripped } from '@/types/doctors';
import type { Company, CompanyRelation } from '@/types/companies';
import type { MainTestStripped } from '@/types/labTests';

// Cache keys for localStorage
const CACHE_KEYS = {
  DOCTORS: 'cached_doctors_list',
  COMPANIES: 'cached_companies_list',
  COMPANY_RELATIONS: 'cached_company_relations_list',
  MAIN_TESTS: 'cached_main_tests_list',
} as const;

// Cache expiration time (24 hours)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Helper functions for localStorage operations
const getCachedData = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    localStorage.removeItem(key);
    return null;
  }
};

const setCachedData = <T>(key: string, data: T): void => {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error(`Error setting cache for ${key}:`, error);
  }
};

const clearAllCaches = (): void => {
  Object.values(CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// Custom hook for cached doctors list
export const useCachedDoctorsList = () => {
  const { user } = useAuth();
  
  return useQuery<DoctorStripped[], Error>({
    queryKey: ['cachedDoctorsList'],
    queryFn: async () => {
      // Try to get from cache first
      const cached = getCachedData<DoctorStripped[]>(CACHE_KEYS.DOCTORS);
      if (cached) {
        return cached;
      }
      
      // Fetch from API if not cached
      const data = await getDoctorsList({ active: true });
      setCachedData(CACHE_KEYS.DOCTORS, data);
      return data;
    },
    staleTime: Infinity, // Never consider stale since we're using localStorage
    gcTime: Infinity, // Never garbage collect
    enabled: !!user, // Only fetch when user is logged in
  });
};

// Custom hook for cached companies list
export const useCachedCompaniesList = () => {
  const { user } = useAuth();
  
  return useQuery<Company[], Error>({
    queryKey: ['cachedCompaniesList'],
    queryFn: async () => {
      // Try to get from cache first
      const cached = getCachedData<Company[]>(CACHE_KEYS.COMPANIES);
      if (cached) {
        return cached;
      }
      
      // Fetch from API if not cached
      const data = await getCompaniesList({ status: true });
      setCachedData(CACHE_KEYS.COMPANIES, data);
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!user,
  });
};

// Custom hook for cached company relations list
export const useCachedCompanyRelationsList = () => {
  const { user } = useAuth();
  
  return useQuery<CompanyRelation[], Error>({
    queryKey: ['cachedCompanyRelationsList'],
    queryFn: async () => {
      // Try to get from cache first
      const cached = getCachedData<CompanyRelation[]>(CACHE_KEYS.COMPANY_RELATIONS);
      if (cached) {
        return cached;
      }
      
      // Fetch from API if not cached
      const data = await getCompanyRelationsList();
      setCachedData(CACHE_KEYS.COMPANY_RELATIONS, data);
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!user,
  });
};

// Custom hook for cached main tests list
export const useCachedMainTestsList = (activeVisitId?: number | null) => {
  const { user } = useAuth();
  
  return useQuery<MainTestStripped[], Error>({
    queryKey: ['cachedMainTestsList', activeVisitId],
    queryFn: async () => {
      // Try to get from cache first
      const cached = getCachedData<MainTestStripped[]>(CACHE_KEYS.MAIN_TESTS);
      if (cached) {
        return cached;
      }
      
      // Fetch from API if not cached
      const data = await getMainTestsListForSelection({
        visit_id_to_exclude_requests: activeVisitId || undefined,
        pack_id: "all",
      });
      setCachedData(CACHE_KEYS.MAIN_TESTS, data);
      return data;
    },
    staleTime: Infinity, // Never consider stale since we're using localStorage
    gcTime: Infinity, // Never garbage collect
    enabled: !!user, // Only fetch when user is logged in
  });
};

// Export the clear function for use in logout
export { clearAllCaches };
