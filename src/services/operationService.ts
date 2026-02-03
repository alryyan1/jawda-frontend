import api from "./api";
import type {
  Operation,
  CreateOperationData,
  UpdateOperationData,
  OperationFilters,
  FinancialReport,
  OperationItem,
} from "../types/operations";

export const operationService = {
  /**
   * Get list of operations with optional filters
   */
  async getOperations(filters?: OperationFilters) {
    const response = await api.get<{ data: Operation[] }>("/operations", {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get operation templates (admission_id = null)
   */
  async getOperationTemplates() {
    // We reuse getOperations with filter or dedicated param if backend supports
    // Backend controller checks 'is_template' param
    const response = await api.get<{ data: Operation[] }>("/operations", {
      params: { is_template: true },
    });
    return response.data;
  },

  /**
   * Get a single operation by ID
   */
  async getOperation(id: number) {
    const response = await api.get<{ data: Operation }>(`/operations/${id}`);
    return response.data;
  },

  /**
   * Create a new operation
   */
  async createOperation(data: CreateOperationData) {
    const formData = new FormData();

    // Add basic fields
    if (data.admission_id)
      formData.append("admission_id", data.admission_id.toString());
    formData.append("operation_date", data.operation_date);
    if (data.operation_time)
      formData.append("operation_time", data.operation_time);
    formData.append("operation_type", data.operation_type);
    if (data.description) formData.append("description", data.description);
    formData.append("surgeon_fee", data.surgeon_fee.toString());

    // Add payment fields
    if (data.cash_paid !== undefined)
      formData.append("cash_paid", data.cash_paid.toString());
    if (data.bank_paid !== undefined)
      formData.append("bank_paid", data.bank_paid.toString());
    if (data.bank_receipt_image)
      formData.append("bank_receipt_image", data.bank_receipt_image);
    if (data.notes) formData.append("notes", data.notes);

    // Add manual items
    if (data.manual_items && data.manual_items.length > 0) {
      data.manual_items.forEach((item, index) => {
        formData.append(
          `manual_items[${index}][item_type]`,
          item.item_type || "custom",
        );
        formData.append(
          `manual_items[${index}][category]`,
          item.category || "center",
        );
        if (item.description)
          formData.append(
            `manual_items[${index}][description]`,
            item.description,
          );
        formData.append(
          `manual_items[${index}][amount]`,
          item.amount.toString(),
        );
      });
    }

    const response = await api.post<{ data: Operation }>(
      "/operations",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  /**
   * Update an existing operation
   */
  async updateOperation(id: number, data: UpdateOperationData) {
    const formData = new FormData();
    formData.append("_method", "PUT");

    // Add fields that are being updated
    if (data.operation_date)
      formData.append("operation_date", data.operation_date);
    if (data.operation_time !== undefined)
      formData.append("operation_time", data.operation_time || "");
    if (data.operation_type)
      formData.append("operation_type", data.operation_type);
    if (data.description !== undefined)
      formData.append("description", data.description || "");
    if (data.surgeon_fee !== undefined)
      formData.append("surgeon_fee", data.surgeon_fee.toString());
    if (data.cash_paid !== undefined)
      formData.append("cash_paid", data.cash_paid.toString());
    if (data.bank_paid !== undefined)
      formData.append("bank_paid", data.bank_paid.toString());
    if (data.bank_receipt_image)
      formData.append("bank_receipt_image", data.bank_receipt_image);
    if (data.notes !== undefined) formData.append("notes", data.notes || "");
    if (data.status) formData.append("status", data.status);

    if (data.skip_auto_calculations) {
      formData.append("skip_auto_calculations", "1");
    }

    // Add manual items if provided
    if (data.manual_items && data.manual_items.length > 0) {
      data.manual_items.forEach((item, index) => {
        if (item.operation_item_id) {
          formData.append(
            `manual_items[${index}][operation_item_id]`,
            item.operation_item_id.toString(),
          );
        }
        // Removed item_type and category, but we can verify if backend needs them?
        // Backend now uses operation_item_id primarily.
        // We still might need to support custom items with description but null ID.
        // But backend expects 'manual_items' array.

        if (item.description)
          formData.append(
            `manual_items[${index}][description]`,
            item.description,
          );
        formData.append(
          `manual_items[${index}][amount]`,
          item.amount.toString(),
        );
      });
    }

    const response = await api.post<{ data: Operation }>(
      `/operations/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  /**
   * Delete an operation
   */
  async deleteOperation(id: number) {
    const response = await api.delete(`/operations/${id}`);
    return response.data;
  },

  /**
   * Get financial report
   */
  async getFinancialReport(filters?: Omit<OperationFilters, "per_page">) {
    const response = await api.get<FinancialReport>(
      "/operations/financial-report",
      {
        params: filters,
      },
    );
    return response.data;
  },

  /**
   * Get list of operation items (catalogue)
   */
  async getItems() {
    const response = await api.get<OperationItem[]>("/operations/items");
    return response.data;
  },
};
