import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, Link2, Link2Off, ImagePlus, Highlighter, Undo2, Redo2, Eraser } from "lucide-react";

function Btn({ label, active, onClick, disabled, children }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={!!active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`inline-flex items-center justify-center w-8 h-8 pointer-coarse:w-9 pointer-coarse:h-9 rounded-md disabled:opacity-30 ${active ? "bg-leaf text-white" : "text-slate"}`}>{children}</button>
  );
}
const Sep = () => <span className="w-px h-5 mx-1 bg-line" aria-hidden="true" />;

function Toolbar({ editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }), ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), quote: e.isActive("blockquote"),
      left: e.isActive({ textAlign: "left" }), center: e.isActive({ textAlign: "center" }), right: e.isActive({ textAlign: "right" }),
      link: e.isActive("link"), mark: e.isActive("highlight"), color: e.getAttributes("textStyle").color || "#14221a",
      canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const setLink = () => {
    const prev = editor.getAttributes("link").href || "https://";
    const url = window.prompt("Link address (leave empty to remove)", prev);
    if (url === null) return;
    if (url.trim() === "" || url === "https://") return c().extendMarkRange("link").unsetLink().run();
    if (!/^(https?:|mailto:|tel:)/i.test(url.trim())) return window.alert("Link must start with http://, https://, mailto: or tel:");
    c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const addImage = () => {
    const url = window.prompt("Image address (https://...)");
    if (url && /^https?:\/\//i.test(url.trim())) c().setImage({ src: url.trim() }).run();
  };
  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-line bg-canvas rounded-t-lg" role="toolbar" aria-label="Text formatting">
      <Btn label="Bold" active={s.bold} onClick={() => c().toggleBold().run()}><Bold size={16} /></Btn>
      <Btn label="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic size={16} /></Btn>
      <Btn label="Underline" active={s.underline} onClick={() => c().toggleUnderline().run()}><UnderlineIcon size={16} /></Btn>
      <Btn label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough size={16} /></Btn>
      <Sep />
      <Btn label="Heading" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></Btn>
      <Btn label="Subheading" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 size={17} /></Btn>
      <Btn label="Bullet list" active={s.ul} onClick={() => c().toggleBulletList().run()}><List size={17} /></Btn>
      <Btn label="Numbered list" active={s.ol} onClick={() => c().toggleOrderedList().run()}><ListOrdered size={17} /></Btn>
      <Btn label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote size={16} /></Btn>
      <Sep />
      <Btn label="Align left" active={s.left} onClick={() => c().setTextAlign("left").run()}><AlignLeft size={16} /></Btn>
      <Btn label="Align center" active={s.center} onClick={() => c().setTextAlign("center").run()}><AlignCenter size={16} /></Btn>
      <Btn label="Align right" active={s.right} onClick={() => c().setTextAlign("right").run()}><AlignRight size={16} /></Btn>
      <Sep />
      <label className="inline-flex items-center justify-center w-8 h-8 rounded-md" title="Text color">
        <span className="sr-only">Text color</span>
        <input type="color" value={s.color} onChange={(e) => c().setColor(e.target.value).run()} className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer" />
      </label>
      <Btn label="Highlight" active={s.mark} onClick={() => c().toggleHighlight().run()}><Highlighter size={16} /></Btn>
      <Btn label="Add link" active={s.link} onClick={setLink}><Link2 size={16} /></Btn>
      {s.link && <Btn label="Remove link" onClick={() => c().unsetLink().run()}><Link2Off size={16} /></Btn>}
      <Btn label="Insert image from web address" onClick={addImage}><ImagePlus size={16} /></Btn>
      <Sep />
      <Btn label="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()}><Eraser size={16} /></Btn>
      <Btn label="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 size={16} /></Btn>
      <Btn label="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 size={16} /></Btn>
    </div>
  );
}

/** Rich text field. `value` is HTML; onChange gets HTML ("" when empty). The server sanitises it again. */
export default function RichTextEditor({ value, onChange, placeholder = "Write here...", minHeight = 220 }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }), TextStyle, Color, Highlight, Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: { attributes: { style: `min-height:${minHeight}px`, "aria-label": placeholder } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  // load a different product's text into the same editor instance
  useEffect(() => {
    if (editor && (value || "") !== (editor.isEmpty ? "" : editor.getHTML())) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return <div className="h-60 rounded-lg border border-line bg-canvas" />;
  return (
    <div className="rounded-lg border border-line bg-white focus-within:ring-4 focus-within:ring-leaf/15 focus-within:border-leaf">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
