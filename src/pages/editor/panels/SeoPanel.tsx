import { useEditor } from "../editorStore";
import { useEditorUI } from "../editorUI";
import { Field, ImagePicker, TextArea, TextInput, Toggle } from "@/components/ui/Fields";

/* ============================================================
   SEO panel — per-page metadata. Kept deliberately simple.
   ============================================================ */

export default function SeoPanel() {
  const { project, update } = useEditor();
  const { activePageId } = useEditorUI();

  const page = project.config.pages.find((p) => p.id === activePageId);
  if (!page) return <p className="text-sm text-ink-faint">Select a page first.</p>;

  const setSeo = (patch: Record<string, unknown>) => {
    update((p) => {
      const pg = p.config.pages.find((x) => x.id === activePageId);
      if (pg) pg.seo = { ...pg.seo, ...patch };
    });
  };

  const seo = page.seo;
  const seoFeature = project.config.features.find((f) => f.id === "seo")?.enabled ?? false;

  return (
    <div className="space-y-4">
      {!seoFeature && (
        <div className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-[12.5px] leading-relaxed text-ink">
          SEO is currently <strong>disabled</strong> for this project — enable it in the Features tab to include
          meta tags in the export.
        </div>
      )}

      <Field label="Page name (visible in menus)">
        <div className="flex items-center gap-1.5">
          <TextInput
            value={page.name}
            onChange={(e) => {
              const name = e.target.value;
              update((p) => {
                const pg = p.config.pages.find((x) => x.id === activePageId);
                if (pg) pg.name = name;
              });
            }}
            aria-label="Page name"
          />
        </div>
      </Field>

      <Field label="URL slug" hint="The path of this page in the generated site.">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-ink-faint">/</span>
          <TextInput
            className="font-mono text-[13px]"
            value={page.path.replace(/^\//, "")}
            onChange={(e) =>
              update((p) => {
                const pg = p.config.pages.find((x) => x.id === activePageId);
                if (pg) pg.path = `/${e.target.value.replace(/^\/+/, "")}`;
              })
            }
            aria-label="Page slug"
          />
        </div>
      </Field>

      <Field label="Page title" hint="Shown in the browser tab and search results.">
        <TextInput value={seo.title} onChange={(e) => setSeo({ title: e.target.value })} placeholder={`${project.config.brand.businessName} — ${page.name}`} />
      </Field>

      <Field label="Meta description" hint="Keep it under ~160 characters.">
        <TextArea value={seo.description} onChange={(e) => setSeo({ description: e.target.value })} />
      </Field>

      <Field label="Keywords" hint="Comma-separated.">
        <TextInput value={seo.keywords} onChange={(e) => setSeo({ keywords: e.target.value })} />
      </Field>

      <ImagePicker value={seo.ogImage} onChange={(ogImage) => setSeo({ ogImage })} label="Open Graph image (shown when shared)" />

      <div className="flex items-center justify-between rounded-lg border border-line bg-surface-1 p-3.5">
        <div>
          <p className="text-[13.5px] font-medium text-ink">Allow search engines to index</p>
          <p className="text-[11.5px] text-ink-faint">Turn off for drafts that shouldn't appear in search results.</p>
        </div>
        <Toggle checked={seo.index} onChange={(index) => setSeo({ index })} label="Index page" />
      </div>
    </div>
  );
}
