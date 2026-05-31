import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Highlighter,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  RemoveFormatting,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minHeight?: number;
  placeholder?: string;
}

const ToolbarButton: React.FC<{
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, active, disabled, onClick, children }) => (
  <Tooltip title={label} placement="top">
    <span>
      <IconButton
        size="small"
        onClick={onClick}
        disabled={disabled}
        sx={{
          borderRadius: 1,
          p: 0.5,
          color: active ? "primary.main" : "text.secondary",
          bgcolor: active ? "primary.50" : "transparent",
          "&:hover": { bgcolor: active ? "primary.100" : "action.hover" },
          "&.Mui-disabled": { opacity: 0.4 },
        }}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  disabled = false,
  minHeight = 280,
  placeholder = "اكتب هنا...",
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. when data loads)
  React.useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  // Sync disabled state
  React.useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const iconSz = 15;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 1.5,
        overflow: "hidden",
        opacity: disabled ? 0.65 : 1,
        borderColor: disabled ? "divider" : "grey.400",
        "&:focus-within": { borderColor: "primary.main", borderWidth: 2 },
      }}
    >
      {/* ── Toolbar ── */}
      {!disabled && (
        <>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 0.25,
              px: 1,
              py: 0.5,
              bgcolor: "grey.50",
            }}
          >
            {/* History */}
            <ToolbarButton label="تراجع" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
              <Undo size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="إعادة" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
              <Redo size={iconSz} />
            </ToolbarButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Headings */}
            <ToolbarButton label="عنوان 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="عنوان 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="عنوان 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 size={iconSz} />
            </ToolbarButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Formatting */}
            <ToolbarButton label="عريض" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="مائل" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="تسطير" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="يتوسطه خط" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="تمييز" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
              <Highlighter size={iconSz} />
            </ToolbarButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Alignment */}
            <ToolbarButton label="يسار" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
              <AlignLeft size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="وسط" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
              <AlignCenter size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="يمين" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
              <AlignRight size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="ضبط" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
              <AlignJustify size={iconSz} />
            </ToolbarButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Lists */}
            <ToolbarButton label="قائمة نقطية" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List size={iconSz} />
            </ToolbarButton>
            <ToolbarButton label="قائمة مرقمة" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered size={iconSz} />
            </ToolbarButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Clear */}
            <ToolbarButton label="مسح التنسيق" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
              <RemoveFormatting size={iconSz} />
            </ToolbarButton>
          </Box>
          <Divider />
        </>
      )}

      {/* ── Editor area ── */}
      <Box
        sx={{
          "& .tiptap": {
            minHeight,
            p: 2,
            outline: "none",
            fontSize: "1rem",
            lineHeight: 1.9,
            fontFamily: "inherit",
            direction: "rtl",
            "& h1": { fontSize: "1.6rem", fontWeight: 700, my: 1 },
            "& h2": { fontSize: "1.35rem", fontWeight: 700, my: 1 },
            "& h3": { fontSize: "1.15rem", fontWeight: 700, my: 0.75 },
            "& ul, & ol": { pl: 0, pr: 3 },
            "& li + li": { mt: 0.25 },
            "& mark": { bgcolor: "yellow", borderRadius: "2px", px: 0.25 },
            "& p.is-editor-empty:first-of-type::before": {
              content: `"${placeholder}"`,
              color: "text.disabled",
              float: "right",
              pointerEvents: "none",
              height: 0,
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
};

export default RichTextEditor;
