'use client';

import React, { useState, useEffect } from 'react';
import { BlogPost, PageView } from '../types';
import { fetchBlogPosts } from '../lib/api';
import { ArticleReaderModal } from './ArticleReaderModal';
import { Clock, Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface JournalCarouselProps {
  onNavigate: (page: PageView) => void;
}

const AUTOPLAY_MS = 6000;

/**
 * Home-page Journal carousel. Surfaces the Gazette stories near the foot of the
 * home page (the Journal no longer sits in the header nav) and links through to
 * the full Journal page.
 *
 * Shows two stories per view from the md breakpoint up, one below it, and
 * advances on its own. Autoplay stops while a reader is open, while the section
 * is hovered or focused, and for viewers who prefer reduced motion.
 */
export const JournalCarousel: React.FC<JournalCarouselProps> = ({ onNavigate }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [perView, setPerView] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);

  // The carousel is a home-page accent: if the journal cannot be reached the
  // section simply renders nothing rather than showing an error mid-page.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchBlogPosts();
        if (!cancelled) setPosts(data);
      } catch {
        if (!cancelled) setPosts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const total = posts.length;
  // The track stops once the last story is flush right, so the final view is never half empty.
  const maxIndex = Math.max(0, total - perView);

  // Slides are sized in CSS (w-full / md:w-1/2); this mirrors the breakpoint so the
  // transform and the page count agree with what is actually on screen.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setPerView(mq.matches ? 2 : 1);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Keep the position valid when the viewport crosses the breakpoint.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  // Autoplay. Depending on activeIndex restarts the timer after any manual move,
  // so a click is never immediately overridden by a pending tick.
  useEffect(() => {
    if (selectedPost || isPaused || maxIndex === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => {
      setActiveIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [activeIndex, selectedPost, isPaused, maxIndex]);

  const goPrev = () => setActiveIndex((i) => (i <= 0 ? maxIndex : i - 1));
  const goNext = () => setActiveIndex((i) => (i >= maxIndex ? 0 : i + 1));

  if (total === 0) return null;

  return (
    <section
      className="py-16 lg:py-24 bg-[#FAF8F5] dark:bg-[#0F0E0D] border-t border-[#E8E1D9] dark:border-[#2A2724] transition-colors"
      aria-roledescription="carousel"
      aria-label="Stories from the Gazette"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[#8C827A] dark:text-[#A69C94] font-bold block">
              From The Gazette
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1A1918] dark:text-[#F5F2ED] font-normal">
              Stories From The Vault
            </h2>
            <p className="text-sm sm:text-base text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed">
              Scholarly notes on provenance, unheated corundum valuation, and Type IIa crystallisation — written by our gemological desk.
            </p>
          </div>

          {/* Carousel Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={goPrev}
              aria-label="Previous stories"
              className="p-2.5 rounded-full border border-[#D5CDC4] dark:border-[#383430] text-[#57534E] dark:text-[#D5CDC4] hover:border-[#1A1918] dark:hover:border-[#C5A880] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              aria-label="Next stories"
              className="p-2.5 rounded-full border border-[#D5CDC4] dark:border-[#383430] text-[#57534E] dark:text-[#D5CDC4] hover:border-[#1A1918] dark:hover:border-[#C5A880] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sliding Track */}
        <div className="overflow-hidden -mx-3">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * (100 / perView)}%)` }}
          >
            {posts.map((post, idx) => (
              <div
                key={post.id}
                className="w-full md:w-1/2 shrink-0 px-3"
                role="group"
                aria-roledescription="slide"
                aria-label={`Story ${idx + 1} of ${total}`}
              >
                <article
                  onClick={() => setSelectedPost(post)}
                  className="h-full flex flex-col bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-xl overflow-hidden hover:border-[#1A1918] dark:hover:border-[#C5A880] hover:shadow-xl transition-all duration-300 cursor-pointer group"
                >
                  <div className="relative h-52 sm:h-60 overflow-hidden bg-[#1A1918] shrink-0">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-[#FAF8F5]/95 dark:bg-[#121110]/95 backdrop-blur px-2.5 py-1 rounded text-xs uppercase font-bold tracking-wider text-[#1A1918] dark:text-[#F5F2ED]">
                      {post.category}
                    </div>
                  </div>

                  <div className="p-6 sm:p-7 flex flex-col flex-1 space-y-3">
                    <div className="flex items-center gap-3 text-xs text-[#8C827A] dark:text-[#A69C94] font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {post.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {post.readTime}
                      </span>
                    </div>

                    <h3 className="font-serif text-xl sm:text-2xl text-[#1A1918] dark:text-[#F5F2ED] group-hover:text-[#635E59] dark:group-hover:text-[#C5A880] transition-colors leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-sm text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between pt-4 mt-auto border-t border-[#F2ECE4] dark:border-[#262320]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#FAF8F5] dark:bg-[#23201D] border border-[#E0D8CE] dark:border-[#38332E] flex items-center justify-center text-xs font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                          {post.author.charAt(0)}
                        </div>
                        <span className="text-xs sm:text-sm text-[#57534E] dark:text-[#D5CDC4] font-semibold">{post.author}</span>
                      </div>
                      <span className="text-xs sm:text-sm text-[#C5A880] group-hover:text-[#1A1918] dark:group-hover:text-[#F5F2ED] flex items-center gap-1 font-bold">
                        Read <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>

        {/* Slide Indicators & Journal Link */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pt-8">
          <div className="flex items-center gap-2.5">
            {Array.from({ length: maxIndex + 1 }, (_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Show stories from position ${idx + 1}`}
                aria-current={idx === activeIndex}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === activeIndex
                    ? 'w-8 bg-[#1A1918] dark:bg-[#C5A880]'
                    : 'w-2.5 bg-[#D5CDC4] dark:bg-[#383430] hover:bg-[#8C827A] dark:hover:bg-[#57534E]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => onNavigate('blog')}
            className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#8C6D44] dark:text-[#C5A880] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] underline underline-offset-4 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            Read The Full Journal
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      <ArticleReaderModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </section>
  );
};
