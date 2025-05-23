// src/types/labTests.ts
export interface Container {
    id: number;
    container_name: string;
  }
  
  export interface MainTest {
    id: number;
    main_test_name: string;
    pack_id?: number | null;
    // pack_name?: string; // If you have a Packs model
    pageBreak: boolean;
    container_id: number;
    container_name?: string;
    container?: Container;
    price?: number | string | null; // Can be string from form
    divided: boolean;
    available: boolean;
    child_tests?: ChildTest[];

    // created_at?: string; // If timestamps are enabled
    // updated_at?: string;
  }
  // src/types/labTests.ts
// ... (MainTest type remains mostly the same, ensure 'price' is string | number for form handling)
export interface MainTestPriceListItem extends Pick<MainTest, 'id' | 'main_test_name'> {
  price: string; // Store price as string in the form for controlled input
  // originalPrice?: number; // To detect changes
}
  export interface MainTestFormData {
    main_test_name: string;
    pack_id?: string; // Input as string
    pageBreak: boolean;
    container_id: string | undefined; // From select
    price?: string; // Input as string
    divided: boolean;
    available: boolean;
  }
  
  export interface Unit {
    id: number;
    name: string;
  }
  
  export interface ChildGroup {
    id: number;
    name: string;
  }
  
  export interface ChildTestOption { // For later when managing options
    id: number;
    name: string;
    child_test_id: number;
  }
  
// Form data for a single child test
export interface ChildTestFormData {
  child_test_name: string;
  low?: string;
  upper?: string;
  defval?: string;
  unit_id?: string | undefined;
  normalRange?: string;
  max?: string;
  lowest?: string;
  test_order?: string;
  child_group_id?: string | undefined;
}

  export interface ChildTest {
    id?: number; // Optional for new records in form state
    main_test_id: number;
    child_test_name: string;
    low?: number | string | null; // string from form, number from API
    upper?: number | string | null;
    defval?: string;
    unit_id?: number | null;
    unit_name?: string;
    unit?: Unit;
    normalRange?: string; // Textual normal range
    max?: number | string | null;
    lowest?: number | string | null;
    test_order?: number | string | null;
    child_group_id?: number | null;
    child_group_name?: string;
    child_group?: ChildGroup;
    options?: ChildTestOption[]; // For later
    // For local form state, might need a temp ID
    _localId?: string; // e.g., for new items not yet saved
    isEditing?: boolean;
  }