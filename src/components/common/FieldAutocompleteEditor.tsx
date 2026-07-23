import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { getFieldTextSuggestions } from '@/services/fieldTextSuggestionService';
import { useThemeMode } from '@/contexts/ThemeModeContext';

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
  minHeight = '64px',
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
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontSize: '0.75rem' }}>
          {label}
        </Typography>
      )}
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          opacity: disabled ? 0.65 : 1,
          fontSize: '0.82rem',
          '&:focus-within': { borderColor: 'primary.main' },
          '& .cm-editor': { fontFamily: 'inherit' },
          '& .cm-content': { direction: 'rtl' },
        }}
      >
        <CodeMirror
          value={value ?? ''}
          onChange={onChange}
          dir="rtl"
          theme={theme}
          minHeight={minHeight}
          editable={!disabled}
          placeholder={placeholder}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            autocompletion: false,
            bracketMatching: false,
            closeBrackets: false,
            dropCursor: false,
            allowMultipleSelections: false,
            rectangularSelection: false,
            crosshairCursor: false,
            indentOnInput: false,
            highlightSelectionMatches: false,
          }}
          extensions={extensions}
        />
      </Box>
    </Box>
  );
};

export default FieldAutocompleteEditor;
