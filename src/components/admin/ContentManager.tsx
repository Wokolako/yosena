'use client';

import React, { useEffect, useState } from 'react';
import { BlogPost, ConsultationService } from '../../types';
import {
  adminFetchBlogPosts,
  adminSaveBlogPost,
  adminDeleteBlogPost,
  adminFetchServices,
  adminSaveService,
  adminDeleteService,
  adminFetchPolicies,
  adminSavePolicy,
  PolicyDocument,
} from '../../lib/api';
import { Field, Area, Select, Toggle, Notice, PrimaryButton, GhostButton } from './adminFields';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const POST_CATEGORIES = [
  'Gemology',
  'Market Intelligence',
  'Ethical Sourcing',
  'Atelier Craft',
] as const;

const SERVICE_FORMATS = ['Virtual', 'In-Person Vault', 'Atelier Visit'] as const;

type Section = PolicyDocument['sections'][number];

/**
 * Everything on the site that is words rather than stock: the Gazette, the
 * bookable consultation tiers, and the legal policies.
 *
 * Each panel loads its own data because the desk rarely opens more than one at
 * a time, and a failure in one should not blank the others.
 */
export const ContentManager: React.FC = () => {
  const [section, setSection] = useState<'journal' | 'services' | 'policies'>('journal');

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {(
          [
            ['journal', 'Journal'],
            ['services', 'Consultations'],
            ['policies', 'Policies'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer ${
              section === key
                ? 'bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918]'
                : 'bg-[#FFFFFF] dark:bg-[#181614] border border-[#E0D8CE] dark:border-[#332F2B] text-[#57534E] dark:text-[#D5CDC4] hover:border-[#1A1918] dark:hover:border-[#C5A880]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'journal' && <JournalPanel />}
      {section === 'services' && <ServicesPanel />}
      {section === 'policies' && <PoliciesPanel />}
    </div>
  );
};

/* ------------------------------------------------------------- journal */

const blankPost = (): Partial<BlogPost> => ({
  title: '',
  category: 'Gemology',
  author: '',
  authorRole: '',
  excerpt: '',
  image: '',
  readTime: '',
  date: '',
  content: [],
});

const JournalPanel: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [draft, setDraft] = useState<(Partial<BlogPost> & { body?: string }) | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [state, setState] = useState<{ busy: boolean; error: string | null; message: string | null }>(
    { busy: false, error: null, message: null }
  );
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const load = async () => {
    try {
      setPosts(await adminFetchBlogPosts());
    } catch (err: any) {
      setState((s) => ({ ...s, error: err?.message ?? 'Could not load the journal.' }));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startAdd = () => {
    setDraft(blankPost());
    setEditingId(null);
    setIsPublished(true);
    setState({ busy: false, error: null, message: null });
  };

  const startEdit = (post: BlogPost) => {
    // Paragraphs are edited as one blank-line-separated block; the API splits
    // them back apart on save.
    setDraft({ ...post, body: post.content.join('\n\n') });
    setEditingId(post.id);
    setIsPublished(true);
    setState({ busy: false, error: null, message: null });
  };

  const save = async () => {
    if (!draft || state.busy) return;
    setState({ busy: true, error: null, message: null });

    try {
      const saved = await adminSaveBlogPost({
        ...(editingId ? { id: editingId } : {}),
        title: draft.title,
        category: draft.category,
        author: draft.author,
        authorRole: draft.authorRole,
        excerpt: draft.excerpt,
        image: draft.image,
        readTime: draft.readTime,
        date: draft.date,
        content: draft.body ?? '',
        isPublished,
      } as any);

      await load();
      setDraft(null);
      setEditingId(null);
      setState({ busy: false, error: null, message: `"${saved.title}" saved.` });
    } catch (err: any) {
      setState({ busy: false, error: err?.message ?? 'The article could not be saved.', message: null });
    }
  };

  const remove = async (id: string) => {
    setState({ busy: true, error: null, message: null });
    try {
      await adminDeleteBlogPost(id);
      await load();
      setState({ busy: false, error: null, message: 'Article removed.' });
    } catch (err: any) {
      setState({ busy: false, error: err?.message ?? 'Could not remove the article.', message: null });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[#78716C] dark:text-[#A69C94] font-light">
          {posts.length} articles in The Gazette.
        </p>
        <PrimaryButton onClick={startAdd}>
          <span className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Article
          </span>
        </PrimaryButton>
      </div>

      <Notice error={state.error} message={state.message} />

      {draft && (
        <div className="bg-[#FAF8F5] dark:bg-[#121110] border border-[#C5A880] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-lg text-[#1A1918] dark:text-[#F5F2ED]">
              {editingId ? 'Edit Article' : 'New Article'}
            </h4>
            <button
              onClick={() => setDraft(null)}
              aria-label="Close editor"
              className="p-1.5 rounded-full text-[#57534E] dark:text-[#D5CDC4] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Field
            label="Title *"
            value={draft.title ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category *"
              value={draft.category ?? 'Gemology'}
              options={POST_CATEGORIES}
              onChange={(v) => setDraft((d) => ({ ...d, category: v as BlogPost['category'] }))}
            />
            <Field
              label="Read time"
              value={draft.readTime ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, readTime: v }))}
              placeholder="Left blank, estimated from length"
            />
            <Field
              label="Author *"
              value={draft.author ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, author: v }))}
            />
            <Field
              label="Author role"
              value={draft.authorRole ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, authorRole: v }))}
            />
            <Field
              label="Display date"
              value={draft.date ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, date: v }))}
              placeholder="Left blank, today's date"
            />
            <Field
              label="Image URL"
              value={draft.image ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, image: v }))}
            />
          </div>

          <Area
            label="Excerpt"
            value={draft.excerpt ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, excerpt: v }))}
            rows={2}
            hint="Shown on the article card. Left blank, the opening lines are used."
          />

          <Area
            label="Article body *"
            value={draft.body ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, body: v }))}
            rows={10}
            hint="Separate paragraphs with a blank line."
          />

          <Toggle label="Published" checked={isPublished} onChange={setIsPublished} />

          <div className="flex items-center gap-3">
            <PrimaryButton onClick={save} disabled={state.busy}>
              {state.busy ? 'Saving…' : 'Save Article'}
            </PrimaryButton>
            <GhostButton onClick={() => setDraft(null)} disabled={state.busy}>
              Cancel
            </GhostButton>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D44] dark:text-[#C5A880]">
                {post.category}
              </span>
              <p className="font-serif text-base text-[#1A1918] dark:text-[#F5F2ED] truncate">
                {post.title}
              </p>
              <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
                {post.author} · {post.date} · {post.content.length} paragraphs
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pendingDelete === post.id ? (
                <>
                  <span className="text-xs text-[#A3524A] dark:text-[#E0897F] font-semibold">
                    Delete?
                  </span>
                  <GhostButton danger onClick={() => remove(post.id)} disabled={state.busy}>
                    Yes
                  </GhostButton>
                  <GhostButton onClick={() => setPendingDelete(null)}>No</GhostButton>
                </>
              ) : (
                <>
                  <GhostButton onClick={() => startEdit(post)}>
                    <span className="flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </span>
                  </GhostButton>
                  <GhostButton danger onClick={() => setPendingDelete(post.id)}>
                    <span className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </span>
                  </GhostButton>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ services */

const blankService = (): Partial<ConsultationService> => ({
  title: '',
  duration: '60 minutes',
  type: 'Virtual',
  fee: 'Complimentary',
  description: '',
  suitableFor: '',
});

const ServicesPanel: React.FC = () => {
  const [services, setServices] = useState<ConsultationService[]>([]);
  const [draft, setDraft] = useState<Partial<ConsultationService> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [state, setState] = useState<{ busy: boolean; error: string | null; message: string | null }>(
    { busy: false, error: null, message: null }
  );
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const load = async () => {
    try {
      setServices(await adminFetchServices());
    } catch (err: any) {
      setState((s) => ({ ...s, error: err?.message ?? 'Could not load consultation tiers.' }));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!draft || state.busy) return;
    setState({ busy: true, error: null, message: null });

    try {
      const saved = await adminSaveService({
        ...(editingId ? { id: editingId } : {}),
        ...draft,
        isActive,
      } as any);

      await load();
      setDraft(null);
      setEditingId(null);
      setState({ busy: false, error: null, message: `"${saved.title}" saved.` });
    } catch (err: any) {
      setState({ busy: false, error: err?.message ?? 'Could not save the tier.', message: null });
    }
  };

  const remove = async (id: string) => {
    setState({ busy: true, error: null, message: null });
    try {
      await adminDeleteService(id);
      await load();
      setState({ busy: false, error: null, message: 'Consultation tier removed.' });
    } catch (err: any) {
      setState({ busy: false, error: err?.message ?? 'Could not remove the tier.', message: null });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[#78716C] dark:text-[#A69C94] font-light">
          {services.length} tiers. These are what visitors can book on the Consultations page.
        </p>
        <PrimaryButton
          onClick={() => {
            setDraft(blankService());
            setEditingId(null);
            setIsActive(true);
          }}
        >
          <span className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Tier
          </span>
        </PrimaryButton>
      </div>

      <Notice error={state.error} message={state.message} />

      {draft && (
        <div className="bg-[#FAF8F5] dark:bg-[#121110] border border-[#C5A880] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-lg text-[#1A1918] dark:text-[#F5F2ED]">
              {editingId ? 'Edit Tier' : 'New Tier'}
            </h4>
            <button
              onClick={() => setDraft(null)}
              aria-label="Close editor"
              className="p-1.5 rounded-full text-[#57534E] dark:text-[#D5CDC4] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Field
            label="Title *"
            value={draft.title ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Format *"
              value={draft.type ?? 'Virtual'}
              options={SERVICE_FORMATS}
              onChange={(v) => setDraft((d) => ({ ...d, type: v as ConsultationService['type'] }))}
            />
            <Field
              label="Duration"
              value={draft.duration ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, duration: v }))}
            />
            <Field
              label="Fee"
              value={draft.fee ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, fee: v }))}
            />
          </div>

          <Area
            label="Description"
            value={draft.description ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
          />
          <Area
            label="Suitable for"
            value={draft.suitableFor ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, suitableFor: v }))}
            rows={2}
          />

          <Toggle label="Open for booking" checked={isActive} onChange={setIsActive} />

          <div className="flex items-center gap-3">
            <PrimaryButton onClick={save} disabled={state.busy}>
              {state.busy ? 'Saving…' : 'Save Tier'}
            </PrimaryButton>
            <GhostButton onClick={() => setDraft(null)} disabled={state.busy}>
              Cancel
            </GhostButton>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D44] dark:text-[#C5A880]">
                {service.type} · {service.duration}
              </span>
              <p className="font-serif text-base text-[#1A1918] dark:text-[#F5F2ED] truncate">
                {service.title}
              </p>
              <p className="text-xs text-[#78716C] dark:text-[#A69C94]">{service.fee}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pendingDelete === service.id ? (
                <>
                  <span className="text-xs text-[#A3524A] dark:text-[#E0897F] font-semibold">
                    Delete?
                  </span>
                  <GhostButton danger onClick={() => remove(service.id)} disabled={state.busy}>
                    Yes
                  </GhostButton>
                  <GhostButton onClick={() => setPendingDelete(null)}>No</GhostButton>
                </>
              ) : (
                <>
                  <GhostButton
                    onClick={() => {
                      setDraft({ ...service });
                      setEditingId(service.id);
                      setIsActive(true);
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </span>
                  </GhostButton>
                  <GhostButton danger onClick={() => setPendingDelete(service.id)}>
                    <span className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </span>
                  </GhostButton>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ policies */

const PoliciesPanel: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [draft, setDraft] = useState<PolicyDocument | null>(null);
  const [state, setState] = useState<{ busy: boolean; error: string | null; message: string | null }>(
    { busy: false, error: null, message: null }
  );

  const load = async () => {
    try {
      setPolicies(await adminFetchPolicies());
    } catch (err: any) {
      setState((s) => ({ ...s, error: err?.message ?? 'Could not load policies.' }));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setSection = (index: number, key: keyof Section, value: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            sections: d.sections.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
          }
        : d
    );

  const save = async () => {
    if (!draft || state.busy) return;
    setState({ busy: true, error: null, message: null });

    try {
      await adminSavePolicy(draft);
      await load();
      setDraft(null);
      setState({ busy: false, error: null, message: 'Policy saved and live on the site.' });
    } catch (err: any) {
      setState({ busy: false, error: err?.message ?? 'Could not save the policy.', message: null });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#78716C] dark:text-[#A69C94] font-light">
        The legal documents shown in the footer. Slugs are fixed, because the site opens each
        policy by name — the wording is yours to change.
      </p>

      <Notice error={state.error} message={state.message} />

      {draft && (
        <div className="bg-[#FAF8F5] dark:bg-[#121110] border border-[#C5A880] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-lg text-[#1A1918] dark:text-[#F5F2ED]">
              Editing “{draft.slug}”
            </h4>
            <button
              onClick={() => setDraft(null)}
              aria-label="Close editor"
              className="p-1.5 rounded-full text-[#57534E] dark:text-[#D5CDC4] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Field
            label="Title *"
            value={draft.title}
            onChange={(v) => setDraft((d) => (d ? { ...d, title: v } : d))}
          />
          <Field
            label="Subtitle"
            value={draft.subtitle}
            onChange={(v) => setDraft((d) => (d ? { ...d, subtitle: v } : d))}
          />

          <div className="space-y-4">
            {draft.sections.map((section, index) => (
              <div
                key={index}
                className="border border-[#E0D8CE] dark:border-[#332F2B] rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold text-[#8C827A] dark:text-[#A69C94]">
                    Section {index + 1}
                  </span>
                  <GhostButton
                    danger
                    onClick={() =>
                      setDraft((d) =>
                        d ? { ...d, sections: d.sections.filter((_, i) => i !== index) } : d
                      )
                    }
                  >
                    Remove
                  </GhostButton>
                </div>
                <Field
                  label="Heading"
                  value={section.heading}
                  onChange={(v) => setSection(index, 'heading', v)}
                />
                <Area
                  label="Body"
                  value={section.text}
                  onChange={(v) => setSection(index, 'text', v)}
                  rows={4}
                />
              </div>
            ))}
          </div>

          <GhostButton
            onClick={() =>
              setDraft((d) =>
                d ? { ...d, sections: [...d.sections, { heading: '', text: '' }] } : d
              )
            }
          >
            <span className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Section
            </span>
          </GhostButton>

          <div className="flex items-center gap-3 pt-1">
            <PrimaryButton onClick={save} disabled={state.busy}>
              {state.busy ? 'Saving…' : 'Save Policy'}
            </PrimaryButton>
            <GhostButton onClick={() => setDraft(null)} disabled={state.busy}>
              Cancel
            </GhostButton>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <span className="font-mono text-xs text-[#8C827A] dark:text-[#A69C94]">
                {policy.slug}
              </span>
              <p className="font-serif text-base text-[#1A1918] dark:text-[#F5F2ED] truncate">
                {policy.title}
              </p>
              <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
                {policy.sections.length} sections
              </p>
            </div>
            <GhostButton onClick={() => setDraft({ ...policy, sections: [...policy.sections] })}>
              <span className="flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </span>
            </GhostButton>
          </div>
        ))}
      </div>
    </div>
  );
};
