// src/components/lab/workstation/OrganismCodeEditor.tsx
import { useState, useCallback, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import { basicSetup } from "codemirror";
import apiClient from "@/services/api";

interface OrganismCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  width?: string;
}

interface OrganismSuggestion {
  organism_name: string;
  sensitive_antibiotics?: string;
  resistant_antibiotics?: string;
}

interface OrganismSuggestionsResponse {
  organisms: OrganismSuggestion[];
  antibiotics: string[];
}

function OrganismCodeEditor({
  value,
  onChange,
  placeholder = "Enter organism name...",
  height = "80px",
  width = "100%"
}: OrganismCodeEditorProps) {
  const [suggestions, setSuggestions] = useState<OrganismSuggestionsResponse>({
    organisms: [],
    antibiotics: []
  });

  // Load suggestions on component mount
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await apiClient.get('/lab/organism-suggestions');
        if (response.data?.data) {
          setSuggestions(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load organism suggestions:', error);
      }
    };
    
    loadSuggestions();
  }, []);

  // Create autocompletion function
  const organismCompletions = useCallback((context: any) => {
    const word = context.matchBefore(/\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    
    const allSuggestions = [
      ...suggestions.organisms.map(org => org.organism_name),
      ...suggestions.antibiotics
    ];
    
    return {
      from: word.from,
      options: allSuggestions.map(opt => ({ label: opt, type: 'text' })),
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
        extensions={[basicSetup, autocompletion({ override: [organismCompletions] })]}
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

export default OrganismCodeEditor;
