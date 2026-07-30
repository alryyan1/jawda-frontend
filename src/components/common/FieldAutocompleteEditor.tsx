import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { getFieldTextSuggestions } from '@/services/fieldTextSuggestionService';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldAutocompleteEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Dictionary key this field's autocomplete suggestions are scoped to. */
  fieldKey: string;
  label?: string;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

// `\w` only matches ASCII, which would break autocomplete matching for
// Arabic clinical notes — match any Unicode letter/number/underscore instead.
const wordCompletionSource = (options: string[]) => (context: CompletionContext): CompletionResult | null => {
  const word = context.matchBefore(/[\p{L}\p{N}_]*/u);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }
  return {
    from: word.from,
    options: options.map(label => ({ label })),
  };
};

const FieldAutocompleteEditor: React.FC<FieldAutocompleteEditorProps> = ({
  value,
  onChange,
  fieldKey,
  label,
  placeholder,
  minHeight = '120px',
  disabled = false,
}) => {
  const { theme } = useThemeMode();

  const { data: suggestions = [] } = useQuery({
    queryKey: ['fieldTextSuggestions', fieldKey],
    queryFn: () => getFieldTextSuggestions(fieldKey),
    staleTime: 5 * 60 * 1000,
  });

  const extensions = useMemo(
    () => [EditorView.lineWrapping, autocompletion({ override: [wordCompletionSource(suggestions)] })],
    [suggestions]
  );

  return (
    <div>
      {label && <Label className="mb-1 block text-xs font-normal text-muted-foreground">{label}</Label>}
      <div
        className={cn(
          'overflow-hidden rounded-md border border-input text-[0.82rem] focus-within:border-primary',
          '[&_.cm-editor]:[font-family:inherit] [&_.cm-content]:[direction:ltr]',
          disabled && 'opacity-65'
        )}
      >
        <CodeMirror
          value={value ?? ''}
          onChange={onChange}
          dir="ltr"
          theme={theme}
          minHeight={minHeight}
          editable={!disabled}
          placeholder={placeholder}
          extensions={extensions}
          height="120px"
        
        />
      </div>
    </div>
  );
};

export default FieldAutocompleteEditor;
