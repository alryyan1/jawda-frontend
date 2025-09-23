import React, { useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

type ShowJsonDialogOptions = {
  title?: string;
};

function formatInputAsPrettyJson(input: unknown): string {
  // If it's already a string, try to parse and reformat; otherwise return as-is
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Not JSON; return string unchanged
      return input;
    }
  }
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

export function showJsonDialog(input: unknown, options?: ShowJsonDialogOptions): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const container = createContainer();
  const root = createRoot(container);

  const title = options?.title ?? 'JSON Preview';

  const JsonDialog: React.FC = () => {
    const parsed = useMemo(() => {
      if (typeof input === 'string') {
        try {
          return JSON.parse(input);
        } catch {
          return undefined;
        }
      }
      return input as unknown;
    }, [input]);

    const pretty = useMemo(() => formatInputAsPrettyJson(parsed ?? input), [parsed, input]);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(pretty);
      } catch {
        // noop
      }
    };

    const handleDownload = () => {
      const blob = new Blob([pretty], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    const handleClose = () => {
      // Unmount and cleanup
      setTimeout(() => {
        root.unmount();
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 0);
    };

    const isRenderableTree = typeof parsed === 'object' && parsed !== null || Array.isArray(parsed);

    return (
      <Dialog open onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          {isRenderableTree ? (
            <JsonTreeView data={parsed as unknown} />
          ) : (
            <Typography
              component="pre"
              sx={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 14,
              fontWeight: 600,
                lineHeight: 1.6,
                whiteSpace: 'pre',
                overflow: 'auto',
                maxHeight: '65vh',
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 1,
                direction: 'ltr',
              }}
            >
              {pretty}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCopy}>Copy</Button>
          <Button variant="outlined" onClick={handleDownload}>Download</Button>
          <Button variant="contained" onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  root.render(<JsonDialog />);
}

export default showJsonDialog;

// Collapsible, colorful JSON tree view
type JsonTreeViewProps = {
  data: unknown;
};

const INDENT_PER_LEVEL_PX = 14;

const keyColor = '#d19a66'; // orange-ish
const stringColor = '#98c379'; // green
const numberColor = '#61afef'; // blue
const booleanColor = '#c678dd'; // purple
const nullColor = '#56b6c2'; // cyan
const bracketColor = '#abb2bf'; // gray

const monospaceSx = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 14,
  fontWeight: 600 as const,
  lineHeight: 1.6,
  whiteSpace: 'pre',
  overflow: 'auto',
  maxHeight: '65vh',
  bgcolor: 'background.paper',
  p: 2,
  borderRadius: 1,
  direction: 'ltr' as const,
};

const caretStyles = {
  display: 'inline-block',
  width: 14,
  color: bracketColor,
  userSelect: 'none' as const,
};

function renderPrimitive(value: unknown): React.ReactNode {
  if (value === null) {
    return <span style={{ color: nullColor }}>null</span>;
  }
  switch (typeof value) {
    case 'string':
      return <span style={{ color: stringColor }}>&quot;{value}&quot;</span>;
    case 'number':
      return <span style={{ color: numberColor }}>{String(value)}</span>;
    case 'boolean':
      return <span style={{ color: booleanColor }}>{String(value)}</span>;
    case 'undefined':
      return <span style={{ color: nullColor }}>undefined</span>;
    default:
      return <span>{String(value)}</span>;
  }
}

const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data }) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['$']));

  const expandAll = useCallback(() => {
    const collect = new Set<string>();
    const walk = (node: unknown, path: string) => {
      collect.add(path);
      if (node && typeof node === 'object') {
        const entries = Array.isArray(node)
          ? node.map((v, i) => [String(i), v] as const)
          : Object.entries(node as Record<string, unknown>);
        for (const [k, v] of entries) {
          walk(v, path + '.' + k);
        }
      }
    };
    walk(data, '$');
    setExpanded(collect);
  }, [data]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set(['$']));
  }, []);

  const toggle = useCallback((path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Button size="small" variant="outlined" onClick={expandAll}>Expand All</Button>
        <Button size="small" variant="outlined" onClick={collapseAll}>Collapse All</Button>
      </div>
      <Typography component="div" sx={monospaceSx}>
        <JsonNode value={data} path="$" depth={0} expanded={expanded} onToggle={toggle} />
      </Typography>
    </div>
  );
};

type JsonNodeProps = {
  value: unknown;
  path: string;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  parentKey?: string;
};

const JsonNode: React.FC<JsonNodeProps> = ({ value, path, depth, expanded, onToggle, parentKey }) => {
  const isObject = value && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;
  const isOpen = expanded.has(path);

  const paddingLeft = depth * INDENT_PER_LEVEL_PX;

  if (!isExpandable) {
    return (
      <div style={{ paddingLeft }}>
        {parentKey !== undefined && (
          <>
            <span style={{ color: keyColor }}>{parentKey}</span>
            <span>: </span>
          </>
        )}
        {renderPrimitive(value)}
      </div>
    );
  }

  const entries: Array<[string, unknown]> = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);

  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';
  const lengthInfo = isArray ? (value as unknown[]).length : entries.length;

  return (
    <div>
      <div
        onClick={() => onToggle(path)}
        style={{ cursor: 'pointer', paddingLeft, userSelect: 'none' }}
        title={isOpen ? 'Collapse' : 'Expand'}
      >
        <span style={caretStyles}>{isOpen ? '▼' : '▶'}</span>
        {parentKey !== undefined && (
          <>
            <span style={{ color: keyColor }}>{parentKey}</span>
            <span>: </span>
          </>
        )}
        <span style={{ color: bracketColor }}>{openBracket}</span>
        <span style={{ color: '#7f848e' }}> {lengthInfo} </span>
        <span style={{ color: bracketColor }}>{closeBracket}</span>
      </div>
      {isOpen && entries.map(([k, v], idx) => (
        <div key={path + '.' + k} style={{ display: 'flex' }}>
          <div style={{ flex: '0 1 auto' }}>
            <JsonNode
              value={v}
              path={path + '.' + k}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              parentKey={isArray ? undefined : k}
            />
          </div>
          {idx < entries.length - 1 && (
            <div style={{ paddingLeft: 4 }}>,</div>
          )}
        </div>
      ))}
    </div>
  );
};


