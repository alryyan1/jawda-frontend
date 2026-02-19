// src/services/favoriteDoctorsService.ts

import apiClient from "./api";

export interface Doctor {
  id: number;
  name: string;
  specialist_name?: string;
  is_favorite?: boolean;
  fav_service_id?: number;
}

export interface FavoriteDoctor {
  id: number;
  name: string;
  specialist_name?: string;
}

export interface ToggleFavoriteRequest {
  doc_id: number;
  fav_service?: number;
}

export interface Service {
  id: number;
  name: string;
  service_group_id?: number;
  price?: number;
}

export interface AddFavoriteRequest {
  doc_id: number;
  fav_service?: number;
}

/**
 * Get all favorite doctors for the current user
 */
export const getFavoriteDoctors = async (): Promise<FavoriteDoctor[]> => {
  try {
    const response = await apiClient.get("/favorite-doctors");
    if (Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return Object.values(response.data.data);
  } catch (error: unknown) {
    console.error("Error fetching favorite doctors:", error);
    // Error toast will be shown by the global API interceptor
    throw error;
  }
};

/**
 * Get all doctors with their favorite status for the current user
 */
export const getDoctorsWithFavorites = async (
  search: string = "",
): Promise<Doctor[]> => {
  try {
    const response = await apiClient.get("/doctors-with-favorites", {
      params: { search },
    });
    return response.data.data;
  } catch (error: unknown) {
    console.error("Error fetching doctors with favorites:", error);
    // Error toast will be shown by the global API interceptor
    throw error;
  }
};

/**
 * Add a doctor to favorites
 */
export const addFavoriteDoctor = async (
  data: AddFavoriteRequest,
): Promise<void> => {
  try {
    await apiClient.post("/favorite-doctors", data);
  } catch (error: unknown) {
    console.error("Error adding favorite doctor:", error);
    // Error toast will be shown by the global API interceptor
    throw error;
  }
};

/**
 * Remove a doctor from favorites
 */
export const removeFavoriteDoctor = async (docId: number): Promise<void> => {
  try {
    await apiClient.delete(`/favorite-doctors/${docId}`);
  } catch (error: unknown) {
    console.error("Error removing favorite doctor:", error);
    // Error toast will be shown by the global API interceptor
    throw error;
  }
};

/**
 * Toggle favorite status for a doctor
 */
export const toggleFavoriteDoctor = async (
  data: ToggleFavoriteRequest,
): Promise<void> => {
  try {
    await apiClient.post("/favorite-doctors/toggle", data);
  } catch (error: unknown) {
    console.error("Error toggling favorite doctor:", error);
    // Error toast will be shown by the global API interceptor
    throw error;
  }
};

/**
 * Get favorite doctor IDs for the current user
 */
export const getFavoriteDoctorIds = async (): Promise<number[]> => {
  const favorites = await getFavoriteDoctors();
  return favorites.map((doctor) => doctor.id);
};

/**
 * Get all services for autocomplete
 */
export const getServices = async (search: string = ""): Promise<Service[]> => {
  try {
    const response = await apiClient.get("/services", {
      params: {
        search,
        per_page: 1000, // Limit results for autocomplete
      },
    });
    return response.data.data || response.data;
  } catch (error: unknown) {
    console.error("Error fetching services:", error);
    // Error toast will be shown by the global API interceptor
    throw error;
  }
};
