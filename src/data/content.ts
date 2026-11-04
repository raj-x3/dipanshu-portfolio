// All copy lives here. Only verified facts are included: no invented proficiency,
// no invented technologies, and links appear only where a live URL was provided.

export const profile = {
  name: 'Dipanshu Raj',
  tagline: 'Building ideas into digital experiences.',
  role: 'Aspiring Software Developer | Computer Science & AI Student',
  intro:
    "I'm a Computer Science & AI undergraduate exploring software development, artificial intelligence, and the art of building meaningful digital products.",
  about: [
    "I'm a first-year Computer Science & AI student at Newton School of Technology, Rishihood University, passionate about technology and building things that turn ideas into reality.",
    'I enjoy experimenting with web development, exploring artificial intelligence, participating in hackathons, and learning by creating projects.',
    'I believe the best way to understand technology is to build with it.',
  ],
  interests: [
    'Software development',
    'Web development',
    'Artificial intelligence',
    'Building useful digital products',
    'Hackathons',
    'Open-source development',
    'Problem-solving',
  ],
  location: 'Patna, Bihar, India',
  email: 'rajdipanshu346@gmail.com',
  github: 'https://github.com/raj-x3',
  linkedin: 'https://www.linkedin.com/in/dipanshu-raj-67b453426/',
} as const;

export type SkillIcon = 'python' | 'html' | 'css' | 'git' | 'github';

// Only the skills provided as verified. Add a separate `learning` list only with real entries.
export const currentSkills: { name: string; icon: SkillIcon; note: string }[] = [
  { name: 'Python', icon: 'python', note: 'General-purpose language I use for scripting and AI experiments.' },
  { name: 'HTML', icon: 'html', note: 'The structure behind every page I build.' },
  { name: 'CSS', icon: 'css', note: 'Layout, typography and motion for the web.' },
  { name: 'Git', icon: 'git', note: 'Version control for keeping projects organised.' },
  { name: 'GitHub', icon: 'github', note: 'Hosting my code and open-source work.' },
];

export const learningSkills: { name: string; note: string }[] = [];

export type Project = {
  slug: string;
  title: string;
  kicker: string;
  paragraphs: string[];
  live?: string;
  github?: string;
};

export const projects: Project[] = [
  {
    slug: 'kisan-setu',
    title: 'Kisan Setu',
    kicker: 'Smart India Hackathon project',
    paragraphs: [
      'Kisan Setu is a Smart India Hackathon project focused on improving agricultural procurement for Indian farmers.',
      'It addresses long and unpredictable queues, lack of procurement schedule information, and uncertainty around procurement status.',
      'The goal is to make the procurement process more organised, predictable, and transparent.',
    ],
    live: 'https://kisansetu-app-rose.vercel.app/',
    github: 'https://github.com/raj-x3/kisansetu_app',
  },
  {
    slug: 'rex-ai',
    title: 'Rex AI',
    kicker: 'AI chatbot',
    paragraphs: ['Rex AI is an AI-powered chatbot project that explores interactive AI conversations.'],
    live: 'https://rexaibi-pi.vercel.app/',
  },
  {
    slug: 'papertrail',
    title: 'PaperTrail',
    kicker: 'Research meets implementation',
    paragraphs: [
      'PaperTrail is a project focused on connecting research papers with their related GitHub repositories, helping users explore the relationship between research and implementation.',
    ],
    live: 'https://papertrail-frontend-vbzq.onrender.com/',
  },
];

export const journey: { year: string; text: string }[] = [
  { year: '2026', text: 'Started my B.Tech journey at Newton School of Technology, Rishihood University.' },
  {
    year: '2026',
    text: 'Participated in hackathon projects and worked on Kisan Setu for the Smart India Hackathon journey.',
  },
  { year: '2026', text: 'Explored open-source development and participated in Hacktoberfest.' },
  { year: '2026', text: 'Built personal web development and AI-related projects.' },
];

export const education = {
  university: 'Newton School of Technology',
  affiliation: 'Rishihood University',
  degree: 'B.Tech — Computer Science & Artificial Intelligence',
  years: '2026–2030',
  detail: 'First-year undergraduate · Patna, Bihar, India',
};
