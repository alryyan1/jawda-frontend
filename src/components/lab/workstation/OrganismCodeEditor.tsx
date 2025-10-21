// src/components/lab/workstation/OrganismCodeEditor.tsx
import ReusableCodeEditor from "./ReusableCodeEditor";

interface OrganismCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  width?: string;
  table?: string;
}

function OrganismCodeEditor({
  value,
  onChange,
  placeholder = "Enter organism name...",
  height = "80px",
  width = "100%",
  table = 'suggested_organisms'
}: OrganismCodeEditorProps) {
  // Determine which table to use based on type

  return (
    <ReusableCodeEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      height={height}
      width={width}
      table={table}
    />
  );
}

export default OrganismCodeEditor;
