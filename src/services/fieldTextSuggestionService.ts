import apiClient from './api';

export const getFieldTextSuggestions = async (fieldKey: string): Promise<string[]> => {
  const res = await apiClient.get<{ data: string[] }>(
    `/field-text-suggestions/${encodeURIComponent(fieldKey)}`
  );
  return res.data.data;
};

export const registerFieldTextSuggestions = async (
  fieldKey: string,
  text: string
): Promise<string[]> => {
  const res = await apiClient.post<{ data: string[] }>('/field-text-suggestions', {
    field_key: fieldKey,
    text,
  });
  return res.data.data;
};

/**
 * Fire-and-forget registration for every non-empty field in a just-saved
 * form, so newly-typed words show up as autocomplete suggestions next time —
 * for each of the given fields, not just one.
 */
export const registerManyFieldTextSuggestions = async (
  entries: Array<{ fieldKey: string; text: string | null | undefined }>
): Promise<string[]> => {
  const fieldKeys = await Promise.all(
    entries
      .filter((entry): entry is { fieldKey: string; text: string } => !!entry.text?.trim())
      .map(async entry => {
        await registerFieldTextSuggestions(entry.fieldKey, entry.text);
        return entry.fieldKey;
      })
  );
  return fieldKeys;
};
