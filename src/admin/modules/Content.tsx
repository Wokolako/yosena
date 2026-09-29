'use client';

import React, { useEffect, useState } from 'react';
import type { BlogPost, ConsultationService, PolicyContent } from '../../types';
import { Panel, useResource, apiSend, useFlash, Button, Field, Pill, statusTone, inputCls, Loading, Notice, Empty } from '../ui';

interface ContentDoc {
  services: ConsultationService[];
  posts: BlogPost[];
  policies: Record<string, PolicyContent>;
}

const POST_CATEGORIES: BlogPost['category'][] = ['Gemology', 'Market Intelligence', 'Ethical Sourcing', 'Atelier Craft'];
const SERVICE_TYPES: ConsultationService['type'][] = ['Virtual', 'In-Person Vault', 'Atelier Visit'];
const POLICY_LABELS: Record<string, string> = {
  'ethical-sourcing': 'Ethical Sourcing',
  'shipping-returns': 'Shipping & Returns',
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
  'legal-notice': 'Legal Notice',
  accessibility: 'Accessibility',
};

export const ContentModule: React.FC = () => {
  const { data, error, loading, reload } = useResource<ContentDoc>('/api/admin/content');
  const [section, setSection] = useState<'posts' | 'services' | 'policies'>('posts');

  if (loading && !data) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!data) return null;

  return (
    <>
      <div className="flex gap-2">
        {(['posts', 'services', 'policies'] as const).map((s) => (
          <Button key={s} variant={section === s ? 'primary' : 'secondary'} onClick={() => setSection(s)}>
            {s === 'posts' ? 'Journal' : s === 'services' ? 'Consultation services' : 'Policies'}
          </Button>
        ))}
      </div>
      {section === 'posts' && <PostsEditor posts={data.posts} onSaved={reload} />}
      {section === 'services' && <ServicesEditor services={data.services} onSaved={reload} />}
      {section === 'policies' && <PoliciesEditor policies={data.policies} onSaved={reload} />}
    </>
  );
};

// ---------------------------------------------------------------- Journal

const blankPost = (): BlogPost => ({
  id: '',
  title: '',
  category: 'Gemology',
  readTime: '5 min read',
  date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  excerpt: '',
  author: '',
  authorRole: '',
  image: '',
  content: [],
  status: 'draft',
});

const PostsEditor: React.FC<{ posts: BlogPost[]; onSaved: () => Promise<void> }> = ({ posts, onSaved }) => {
  const flash = useFlash();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<BlogPost | null>(null);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (index: number | null) => {
    const post = index === null ? blankPost() : { ...posts[index] };
    setEditingIndex(index);
    setDraft(post);
    setBody(post.content.join('\n\n'));
  };

  const publish = async (next: BlogPost[]) => {
    setSaving(true);
    const result = await apiSend('/api/admin/content/posts', 'PUT', { posts: next });
    setSaving(false);
    flash.show(result);
    if (result.ok) {
      setDraft(null);
      setEditingIndex(null);
      await onSaved();
    }
  };

  const saveDraft = () => {
    if (!draft) return;
    const post: BlogPost = { ...draft, content: body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) };
    const next = [...posts];
    if (editingIndex === null) next.unshift(post);
    else next[editingIndex] = post;
    void publish(next);
  };

  const remove = (index: number) => {
    if (!window.confirm(`Delete "${posts[index].title}"? This cannot be undone.`)) return;
    void publish(posts.filter((_, i) => i !== index));
  };

  const set = (key: keyof BlogPost) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDraft((d) => (d ? { ...d, [key]: e.target.value } : d));

  return (
    <>
      {flash.node}
      {draft && (
        <Panel
          title={editingIndex === null ? 'New article' : `Edit “${draft.title}”`}
          actions={
            <>
              <Button onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="primary" onClick={saveDraft} busy={saving}>
                {draft.status === 'published' ? 'Save & publish' : 'Save draft'}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Title *" className="md:col-span-2"><input className={inputCls} value={draft.title} onChange={set('title')} maxLength={200} /></Field>
            <Field label="Visibility" hint="Drafts are only visible here.">
              <select className={inputCls} value={draft.status ?? 'published'} onChange={set('status')}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </Field>
            <Field label="Category">
              <select className={inputCls} value={draft.category} onChange={set('category')}>
                {POST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Date shown"><input className={inputCls} value={draft.date} onChange={set('date')} /></Field>
            <Field label="Read time"><input className={inputCls} value={draft.readTime} onChange={set('readTime')} /></Field>
            <Field label="Author"><input className={inputCls} value={draft.author} onChange={set('author')} /></Field>
            <Field label="Author role" className="md:col-span-2"><input className={inputCls} value={draft.authorRole} onChange={set('authorRole')} /></Field>
            <Field label="Cover image URL" className="md:col-span-3" hint="An https:// link."><input className={inputCls} value={draft.image} onChange={set('image')} /></Field>
            <Field label="Excerpt" className="md:col-span-3"><textarea className={inputCls} rows={2} value={draft.excerpt} onChange={set('excerpt')} maxLength={600} /></Field>
            <Field label="Article text" className="md:col-span-3" hint="Leave a blank line between paragraphs.">
              <textarea className={inputCls} rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
          </div>
        </Panel>
      )}

      <Panel title={`Journal articles (${posts.length})`} actions={<Button variant="primary" onClick={() => startEdit(null)}>New article</Button>}>
        {posts.length === 0 ? <Empty>No articles yet.</Empty> : (
          <ul className="divide-y divide-[#E8E1D9] dark:divide-[#262320]">
            {posts.map((p, i) => (
              <li key={p.id || i} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{p.title}</span>
                    <Pill tone={statusTone(p.status ?? 'published')}>{p.status ?? 'published'}</Pill>
                  </div>
                  <div className="text-xs text-[#78716C] dark:text-[#A69C94]">{p.category} · {p.date} · {p.author}</div>
                </div>
                <div>
                  <Button variant="ghost" onClick={() => startEdit(i)}>Edit</Button>
                  <Button variant="ghost" onClick={() => remove(i)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
};

// ---------------------------------------------------------------- Services

const ServicesEditor: React.FC<{ services: ConsultationService[]; onSaved: () => Promise<void> }> = ({ services, onSaved }) => {
  const flash = useFlash();
  const [list, setList] = useState<ConsultationService[]>(services);
  const [saving, setSaving] = useState(false);
  useEffect(() => setList(services), [services]);

  const update = (i: number, key: keyof ConsultationService, value: string) =>
    setList((l) => l.map((s, j) => (j === i ? { ...s, [key]: value } : s)));

  const save = async () => {
    setSaving(true);
    const result = await apiSend('/api/admin/content/services', 'PUT', { services: list });
    setSaving(false);
    flash.show(result);
    if (result.ok) await onSaved();
  };

  return (
    <>
      {flash.node}
      <Panel
        title="Consultation services"
        actions={
          <>
            <Button
              onClick={() =>
                setList((l) => [...l, { id: '', title: 'New consultation', duration: '60 minutes', type: 'Virtual', fee: 'Complimentary', description: '', suitableFor: '' }])
              }
            >
              Add service
            </Button>
            <Button variant="primary" onClick={save} busy={saving}>Publish changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          {list.map((s, i) => (
            <div key={s.id || `new-${i}`} className="rounded-lg border border-[#E8E1D9] dark:border-[#262320] p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Title" className="md:col-span-2"><input className={inputCls} value={s.title} onChange={(e) => update(i, 'title', e.target.value)} /></Field>
              <Field label="Format">
                <select className={inputCls} value={s.type} onChange={(e) => update(i, 'type', e.target.value)}>
                  {SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Duration"><input className={inputCls} value={s.duration} onChange={(e) => update(i, 'duration', e.target.value)} /></Field>
              <Field label="Fee" className="md:col-span-2"><input className={inputCls} value={s.fee} onChange={(e) => update(i, 'fee', e.target.value)} /></Field>
              <Field label="Suitable for" className="md:col-span-2"><input className={inputCls} value={s.suitableFor} onChange={(e) => update(i, 'suitableFor', e.target.value)} /></Field>
              <Field label="Description" className="md:col-span-4"><textarea className={inputCls} rows={2} value={s.description} onChange={(e) => update(i, 'description', e.target.value)} /></Field>
              <div className="md:col-span-4 text-right">
                <Button variant="ghost" onClick={() => setList((l) => l.filter((_, j) => j !== i))}>Remove service</Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
};

// ---------------------------------------------------------------- Policies

const PoliciesEditor: React.FC<{ policies: Record<string, PolicyContent>; onSaved: () => Promise<void> }> = ({ policies, onSaved }) => {
  const flash = useFlash();
  const keys = Object.keys(POLICY_LABELS);
  const [key, setKey] = useState(keys[0]);
  const [policy, setPolicy] = useState<PolicyContent>(policies[keys[0]] ?? { title: '', subtitle: '', sections: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPolicy(policies[key] ?? { title: POLICY_LABELS[key], subtitle: '', sections: [] });
  }, [key, policies]);

  const updateSection = (i: number, field: 'heading' | 'text', value: string) =>
    setPolicy((p) => ({ ...p, sections: p.sections.map((s, j) => (j === i ? { ...s, [field]: value } : s)) }));

  const save = async () => {
    setSaving(true);
    const result = await apiSend('/api/admin/content/policies', 'PUT', { policies: { [key]: policy } });
    setSaving(false);
    flash.show(result);
    if (result.ok) await onSaved();
  };

  return (
    <>
      {flash.node}
      <Panel
        title="Policies"
        actions={
          <>
            <select className={`${inputCls} w-56`} value={key} onChange={(e) => setKey(e.target.value)}>
              {keys.map((k) => <option key={k} value={k}>{POLICY_LABELS[k]}</option>)}
            </select>
            <Button variant="primary" onClick={save} busy={saving}>Publish policy</Button>
          </>
        }
      >
        <Notice tone="warn">Policies are legal text. Have changes reviewed before publishing.</Notice>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title"><input className={inputCls} value={policy.title} onChange={(e) => setPolicy({ ...policy, title: e.target.value })} /></Field>
          <Field label="Subtitle"><input className={inputCls} value={policy.subtitle} onChange={(e) => setPolicy({ ...policy, subtitle: e.target.value })} /></Field>
        </div>
        <div className="space-y-3">
          {policy.sections.map((s, i) => (
            <div key={i} className="rounded-lg border border-[#E8E1D9] dark:border-[#262320] p-3 space-y-2">
              <Field label={`Section ${i + 1} heading`}><input className={inputCls} value={s.heading} onChange={(e) => updateSection(i, 'heading', e.target.value)} /></Field>
              <Field label="Text"><textarea className={inputCls} rows={3} value={s.text} onChange={(e) => updateSection(i, 'text', e.target.value)} /></Field>
              <div className="text-right">
                <Button variant="ghost" onClick={() => setPolicy({ ...policy, sections: policy.sections.filter((_, j) => j !== i) })}>Remove section</Button>
              </div>
            </div>
          ))}
          <Button onClick={() => setPolicy({ ...policy, sections: [...policy.sections, { heading: '', text: '' }] })}>Add section</Button>
        </div>
      </Panel>
    </>
  );
};
