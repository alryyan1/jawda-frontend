// src/components/lab/workstation/ReusableCodeEditor.tsx
import { useState, useCallback, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import { basicSetup } from "codemirror";
import apiClient from "@/services/api";

interface ReusableCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  width?: string;
  table?: string; // New prop to determine which table to fetch suggestions from
}

function ReusableCodeEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  height = "80px",
  width = "100%",
  table = 'suggested_organisms'
}: ReusableCodeEditorProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load suggestions on component mount
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await apiClient.get(`/lab/suggestions?table=${table}`);
        if (response.data?.data) {
          const data = response.data.data;
          setSuggestions(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error(`Failed to load suggestions for table ${table}:`, error);
        // Set empty array on error to prevent crashes
        setSuggestions([]);
      }
    };
    
    loadSuggestions();
  }, [table]);

  // Create autocompletion function
  const completions = useCallback((context: any) => {
    const word = context.matchBefore(/\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    
    const suggestionsToUse = Array.isArray(suggestions) 
      ? suggestions.filter(Boolean)
      : [];
    
    return {
      from: word.from,
      options: suggestionsToUse.map(opt => ({ label: opt, type: 'text' })),
    };
  }, [suggestions]);

  return (
    <div 
      className="organism-editor-ltr"
      style={{ 
        direction: 'ltr', 
        textAlign: 'left'
      }}
    >
      <CodeMirror
        height={height}
        width={width}
        dir="ltr"
        value={value}
        extensions={[basicSetup, autocompletion({ override: [completions] })]}
        onChange={onChange}
        placeholder={placeholder}
        style={{ 
          fontSize: "16px",
          direction: "ltr",
          textAlign: "left"
        }}
      />
    </div>
  );
}

export default ReusableCodeEditor;
