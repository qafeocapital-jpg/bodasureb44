import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function LegalPage({ slug, title, lastUpdated, intro, sections }) {
  const [dbContent, setDbContent] = useState(null);
  const [checked, setChecked] = useState(!slug);

  useEffect(() => { document.title = `${title} | BodaSure`; }, [title]);

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    base44.entities.LegalContent.filter({ slug })
      .then(records => {
        if (mounted && records.length > 0 && records[0].html_body) {
          setDbContent(records[0]);
        }
        if (mounted) setChecked(true);
      })
      .catch(() => { if (mounted) setChecked(true); });
    return () => { mounted = false; };
  }, [slug]);

  // DB version found — render saved HTML inside the same shell
  if (checked && dbContent) {
    const dbDate = dbContent.updated_at
      ? new Date(dbContent.updated_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })
      : lastUpdated;
    return (
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-border pb-6 mb-8">
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">{dbContent.title || title}</h1>
            {dbDate && <p className="mt-2 text-sm text-muted-foreground">Last updated: {dbDate}</p>}
          </div>
          <div
            className="legal-html text-sm text-muted-foreground leading-relaxed [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-lg [&_h2]:text-foreground [&_h2]:mb-3 [&_h2]:mt-8 [&_p]:mb-4 [&_p]:leading-relaxed [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_li]:mb-1"
            dangerouslySetInnerHTML={{ __html: dbContent.html_body }}
          />
        </div>
      </section>
    );
  }

  // No DB record (or loading) — render hardcoded content, zero regression
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-border pb-6 mb-8">
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">{title}</h1>
          {lastUpdated && <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>}
        </div>
        {intro && <p className="text-base text-muted-foreground leading-relaxed mb-8">{intro}</p>}
        <div className="space-y-8">
          {sections?.map((section, i) => (
            <div key={i}>
              <h2 className="font-heading font-bold text-lg mb-3">{section.heading}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                {typeof section.body === 'string'
                  ? section.body.split('\n\n').map((para, j) => <p key={j}>{para}</p>)
                  : section.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}