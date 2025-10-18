// src/components/lab/workstation/CodeEditor.tsx
import { useState, useCallback, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import { basicSetup } from "codemirror";
import { LoadingButton } from "@mui/lab";
import { toast } from "sonner";
import apiClient from "@/services/api";

interface CodeEditorProps {
  options: string[];
  setOptions: (options: string[]) => void;
  init: string;
  colName: string;
  patient: Record<string, unknown>; // Replace with proper Patient type
  setActivePatient: (patient: Record<string, unknown>) => void;
  width?: string;
  onSave?: (value: string) => void;
  labRequestId?: number; // For saving comments to specific lab request
}

function CodeEditor({
  setOptions,
  init,
  colName,
  patient,
  setActivePatient,
  width = '100%',
  onSave,
  labRequestId
}: CodeEditorProps) {
  const [value, setValue] = useState(init);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load suggestions on component mount
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await apiClient.get('/lab/comment-suggestions');
        if (response.data?.data) {
          setSuggestions(response.data.data);
          setOptions(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      }
    };
    
    loadSuggestions();
  }, [setOptions]);

  // Update internal value when init prop changes
  useEffect(() => {
    setValue(init);
  }, [init]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function myCompletions(context: any) {
    const word = context.matchBefore(/\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: suggestions.map(opt => ({ label: opt, type: opt })),
    };
  }

  const onChange = useCallback((val: string) => {
    console.log("val:", val);
    setValue(val);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save comment to lab request if labRequestId is provided
      if (labRequestId && colName === 'comment') {
        await apiClient.patch(`/labrequests/${labRequestId}/comment`, {
          comment: value
        });
      }

      // Add suggestions to database for future autocomplete (explodes into words)
      if (value.trim()) {
        try {
          const response = await apiClient.post('/lab/comment-suggestions', {
            suggestion: value.trim()
          });
          console.log('Added suggestions:', response.data);
        } catch (suggestionError) {
          // Don't fail the main save if suggestion save fails
          console.warn('Failed to save suggestions:', suggestionError);
        }
      }

      // Update patient data
      if (onSave) {
        onSave(value);
      } else {
        // Default update handler
        const updatedPatient = { ...patient, [colName]: value };
        setActivePatient(updatedPatient);
      }

      toast.success("تم الحفظ بنجاح");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CodeMirror
        height="200px"
        width={width}
        dir="ltr"
        value={value}
        extensions={[basicSetup, autocompletion({ override: [myCompletions] })]}
        onChange={onChange}
      />

      <LoadingButton
        sx={{ mt: 1 }}
        loading={loading}
        fullWidth
        variant="contained"
        onClick={handleSave}
      >
        حفظ
      </LoadingButton>
    </>
  );
}

export default CodeEditor;
