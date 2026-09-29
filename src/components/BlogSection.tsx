import React, { useState } from 'react';
import { useSiteData } from '../context/SiteDataContext';
import { BlogPost } from '../types';
import { ArticleReaderModal } from './ArticleReaderModal';
import { Clock, Calendar, ArrowRight } from 'lucide-react';

export const BlogSection: React.FC = () => {
  const { posts: BLOG_POSTS } = useSiteData();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', 'Ethical Sourcing', 'Gemology', 'Market Intelligence'];

  const filteredPosts = filterCategory === 'All'
    ? BLOG_POSTS
    : BLOG_POSTS.filter(p => p.category === filterCategory);

  return (
    <div className="py-12 lg:py-20 bg-[#FAF8F5] dark:bg-[#0F0E0D] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <span className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[#8C827A] dark:text-[#A69C94] font-bold">
            Gemological Journal &amp; Market Intelligence
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#1A1918] dark:text-[#F5F2ED] font-normal">
            The YosenaMora Gazette
          </h1>
          <p className="text-sm sm:text-base text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed">
            Scholarly insights into rare unheated corundum, Type IIa diamond crystallisation, ethical extraction economics, and advisory for bespoke fine jewellers.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] font-bold shadow-sm'
                  : 'bg-[#FFFFFF] dark:bg-[#181614] border border-[#E0D8CE] dark:border-[#332F2B] text-[#57534E] dark:text-[#D5CDC4] hover:border-[#1A1918] dark:hover:border-[#F5F2ED] font-semibold'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-xl overflow-hidden hover:border-[#1A1918] dark:hover:border-[#C5A880] hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="relative h-52 overflow-hidden bg-[#1A1918]">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-[#FAF8F5]/95 dark:bg-[#121110]/95 backdrop-blur px-2.5 py-1 rounded text-xs uppercase font-bold tracking-wider text-[#1A1918] dark:text-[#F5F2ED]">
                    {post.category}
                  </div>
                </div>

                <div className="p-6 space-y-3">
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

                  <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-[#FAF8F5] dark:border-[#121110]">
                <div className="flex items-center justify-between pt-4 border-t border-[#F2ECE4] dark:border-[#262320]">
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
          ))}
        </div>

        {/* Article Reader */}
        <ArticleReaderModal post={selectedPost} onClose={() => setSelectedPost(null)} />

      </div>
    </div>
  );
};
