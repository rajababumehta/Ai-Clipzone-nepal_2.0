import type { BlogPost } from '../types.ts';

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'mastering-prompt-engineering-for-practical-ai-workflows',
    title: 'Mastering Prompt Engineering for Practical AI Workflows',
    seoTitle: 'Prompt Engineering Guide for Practical AI Workflows | HamroLms',
    seoDescription: 'Learn structured prompt engineering frameworks for writing, visual generation, coding, and productivity using modern AI tools.',
    excerpt: 'Move beyond basic one-line prompts with a repeatable framework covering role framing, context blocks, constraints, and iterative refinement.',
    category: 'AI & Automation',
    tags: ['Prompt Engineering', 'AI Tools', 'Productivity', 'ChatGPT'],
    authorSlug: 'rajababu-mehta',
    publishedAt: '2026-09-18',
    updatedAt: '2026-11-15',
    readTimeMinutes: 6,
    coverImage: '/institute-logo.png',
    coverAlt: 'HamroLms guide on structured prompt engineering workflows',
    relatedCourseIds: ['Ai master class course by Ai clipzone'],
    sections: [
      {
        heading: 'Why Structured Prompts Outperform One-Line Queries',
        paragraphs: [
          'Most beginners treat AI assistants like traditional keyword search engines and receive generic output as a result. When you specify role, audience, output schema, and quality constraints upfront, model accuracy improves dramatically across writing, research, and code generation.',
          'A reliable prompt architecture works consistently across ChatGPT, Claude, Gemini, and multimodal creative tools because it removes ambiguity before generation begins.',
        ],
      },
      {
        heading: 'The 4-Part Production Prompt Formula',
        paragraphs: [
          'Before running complex tasks, organize your instruction into four modular blocks that can be reused across projects:',
        ],
        bullets: [
          'Role & Domain: Define who the model should act as and the standard of rigor expected.',
          'Context & Inputs: Supply source facts, audience level, and desired tone without jargon.',
          'Format & Constraints: Specify headings, length boundaries, JSON or markdown layout, and what to exclude.',
          'Verification Pass: Ask the model to check assumptions or highlight missing data before finalizing.',
        ],
      },
      {
        heading: 'Applying Prompt Workflows to Visual & Video Production',
        paragraphs: [
          'The same structured approach powers AI image generators, voice synthesis, and short-form video scripts. Separating subject description, camera angle, lighting mood, and pacing cues ensures repeatable visual consistency across an entire campaign.',
        ],
      },
    ],
  },
  {
    slug: 'high-retention-video-editing-workflow-for-creators',
    title: 'High-Retention Video Editing Workflow for Digital Creators',
    seoTitle: 'High-Retention Video Editing Workflow Guide | HamroLms',
    seoDescription: 'Step-by-step guide to pacing, hooks, sound design, and visual storytelling that keep viewers watching educational and creator videos.',
    excerpt: 'Discover how structured hooks, clean audio layering, and intentional visual pacing turn raw footage into engaging educational stories.',
    category: 'Video Editing',
    tags: ['Video Editing', 'Storytelling', 'CapCut', 'YouTube'],
    authorSlug: 'rajababu-mehta',
    publishedAt: '2026-10-04',
    updatedAt: '2026-11-18',
    readTimeMinutes: 7,
    coverImage: '/institute-logo.png',
    coverAlt: 'High-retention video editing and visual storytelling workflow',
    relatedCourseIds: ['youtube-blueprint-course-by-al-clipzone', 'Ai master class course by Ai clipzone'],
    sections: [
      {
        heading: 'Start with Narrative Clarity Before Timeline Effects',
        paragraphs: [
          'Transitions and motion presets cannot save a weak opening. Strong educational videos open with a clear promise in the first 10 seconds, establishing what problem the viewer will solve by watching through to the end.',
          'During your rough cut, remove pauses, repeated phrases, and off-topic tangents first before adding any B-roll or graphics.',
        ],
      },
      {
        heading: 'Core Pillars of Retention-Focused Editing',
        paragraphs: [
          'Consistent viewer engagement depends on balancing audio clarity with visual variety:',
        ],
        bullets: [
          'Audio First: Level dialogue cleanly, apply subtle compression, and use ambient music at low volume.',
          'Visual Anchors: Introduce annotated screenshots, charts, or motion callouts whenever explaining abstract steps.',
          'Intentional Pacing: Shift framing or graphic layout every 5 to 12 seconds during dense explanations.',
          'Clear Transitions: Use sound effects and clean J-cuts/L-cuts to carry attention smoothly between chapters.',
        ],
      },
    ],
  },
  {
    slug: 'building-a-sustainable-youtube-education-channel',
    title: 'Building a Sustainable YouTube Education Channel from Scratch',
    seoTitle: 'How to Build a YouTube Education Channel | HamroLms',
    seoDescription: 'Learn practical niche positioning, topic research, packaging, and ethical monetization workflows for educational YouTube creators.',
    excerpt: 'A realistic blueprint for selecting an educational niche, planning searchable topics, designing clear thumbnails, and building long-term audience trust.',
    category: 'Creator Growth',
    tags: ['YouTube Growth', 'Thumbnails', 'Content Strategy', 'Creator Economy'],
    authorSlug: 'rajababu-mehta',
    publishedAt: '2026-10-22',
    updatedAt: '2026-11-19',
    readTimeMinutes: 8,
    coverImage: '/institute-logo.png',
    coverAlt: 'YouTube educational channel strategy and packaging workflow',
    relatedCourseIds: ['youtube-blueprint-course-by-al-clipzone'],
    sections: [
      {
        heading: 'Choosing an Intersection of Skill and Learner Demand',
        paragraphs: [
          'Long-lasting channels solve recurring problems for a specific audience. Rather than chasing short-lived trends, map out 20 evergreen questions beginners ask in your field and build clear tutorials answering each one.',
        ],
      },
      {
        heading: 'Packaging: Honest Titles and High-Clarity Thumbnails',
        paragraphs: [
          'Click-through rate starts with clarity, not clickbait. Pair a readable 2-to-4-word thumbnail concept with a title that delivers an explicit outcome.',
        ],
        bullets: [
          'Use high-contrast typography readable at mobile feed size.',
          'Highlight one focal subject or before/after visual contrast.',
          'Deliver immediately on the title promise in the intro to protect watch-time trust.',
        ],
      },
    ],
  },
  {
    slug: 'ai-assisted-web-development-best-practices-for-beginners',
    title: 'AI-Assisted Web Development Best Practices for Beginners',
    seoTitle: 'AI-Assisted Web Development Best Practices | HamroLms',
    seoDescription: 'Understand how to combine HTML, CSS, React, and AI coding assistants responsibly to build fast, accessible, production-ready web apps.',
    excerpt: 'Learn how modern developers pair foundational web architecture with AI-assisted coding without sacrificing security, performance, or accessibility.',
    category: 'Career & Skills',
    tags: ['Web Development', 'React', 'Frontend', 'AI Coding'],
    authorSlug: 'rajababu-mehta',
    publishedAt: '2026-11-05',
    updatedAt: '2026-11-20',
    readTimeMinutes: 6,
    coverImage: '/institute-logo.png',
    coverAlt: 'Modern web development architecture and best practices guide',
    relatedCourseIds: ['Ai master class course by Ai clipzone'],
    sections: [
      {
        heading: 'Foundations Still Determine Application Quality',
        paragraphs: [
          'AI coding tools accelerate scaffolding, styling, and refactoring, yet shipping reliable web software still requires understanding semantic HTML, responsive CSS layout, client/server boundaries, and input validation.',
        ],
      },
      {
        heading: 'Production Checklist Every Builder Should Follow',
        paragraphs: [
          'Treat every AI-assisted feature as a draft until verified against core engineering standards:',
        ],
        bullets: [
          'Semantic Landmarks & Headings: Use one clear H1 per page and logical H2/H3 nesting.',
          'Bundle Hygiene: Lazy-load secondary routes and avoid render-blocking stylesheet imports.',
          'Credential Boundaries: Keep API keys and private tokens on the server, never in frontend bundles.',
        ],
      },
    ],
  },
];

export function findBlogPostBySlug(posts: BlogPost[], slug?: string): BlogPost | undefined {
  if (!slug || !posts?.length) return undefined;
  const target = slug.trim().toLowerCase();
  return posts.find((p) => p.slug.toLowerCase() === target);
}
