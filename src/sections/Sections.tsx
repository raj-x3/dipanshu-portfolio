import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { SiCss, SiGit, SiGithub, SiHtml5, SiPython } from 'react-icons/si';
import { FaLinkedinIn } from 'react-icons/fa';
import { Reveal, SplitText, Magnetic } from '../components/primitives';
import {
  profile,
  currentSkills,
  learningSkills,
  projects,
  journey,
  education,
  educationList,
  type SkillIcon,
  type Project,
} from '../data/content';
import { hasFinePointer, prefersReducedMotion } from '../lib/motion';
import { WorksWheel, type WheelItem } from '../components/WorksWheel';

/* ----------------------------- About ----------------------------- */

function Orbit() {
  // Abstract technical illustration: concentric rings and nodes, CSS-only motion.
  return (
    <svg className="orbit" viewBox="0 0 400 400" role="img" aria-label="Abstract orbital diagram">
      <g fill="none" stroke="currentColor" strokeOpacity="0.22">
        <circle cx="200" cy="200" r="190" />
        <circle cx="200" cy="200" r="140" strokeDasharray="2 6" />
      </g>
      <g className="orbit-rings" fill="none" stroke="currentColor" strokeOpacity="0.5">
        <ellipse cx="200" cy="200" rx="170" ry="60" />
        <ellipse cx="200" cy="200" rx="60" ry="170" strokeOpacity="0.3" />
      </g>
      <g className="orbit-rings orbit-rings--reverse" fill="none" stroke="currentColor" strokeOpacity="0.35">
        <circle cx="200" cy="200" r="104" strokeDasharray="1 8" />
      </g>
      <circle cx="200" cy="200" r="5" fill="currentColor" />
      <circle cx="370" cy="200" r="4" fill="#8b8cff" />
      <circle cx="104" cy="82" r="3" fill="currentColor" fillOpacity="0.7" />
    </svg>
  );
}

export function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <Reveal>
        <p className="kicker">01 — About</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 id="about-title" className="display-2">
          <SplitText text="A little about me." />
        </h2>
      </Reveal>
      <div className="about-grid">
        <div className="about-copy">
          {profile.about.map((line, i) => (
            <Reveal key={line} delay={i * 90}>
              <p>{line}</p>
            </Reveal>
          ))}
          <Reveal delay={260}>
            <ul className="interest-list" aria-label="Interests">
              {profile.interests.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <Orbit />
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------- Skills ----------------------------- */

const ICONS: Record<SkillIcon, typeof SiPython> = {
  python: SiPython,
  html: SiHtml5,
  css: SiCss,
  git: SiGit,
  github: SiGithub,
};

function SkillCard({ name, icon, note }: { name: string; icon: SkillIcon; note: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = ICONS[icon];

  // 3D tilt on fine pointers. Writes transform directly; no state, no re-render.
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <div className="skill-card" ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}>
      <Icon className="skill-icon" aria-hidden="true" />
      <h3>{name}</h3>
      <p>{note}</p>
      <span className="sr-only">Currently used</span>
    </div>
  );
}

export function Skills() {
  return (
    <section id="skills" className="section" aria-labelledby="skills-title">
      <Reveal>
        <p className="kicker">02 — Skills</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 id="skills-title" className="display-2">
          <SplitText text="Tools I build with." />
        </h2>
      </Reveal>

      <div className="skills-group">
        <Reveal>
          <p className="skills-label">Currently using</p>
        </Reveal>
        <div className="skill-grid">
          {currentSkills.map((s, i) => (
            <Reveal key={s.name} delay={i * 70}>
              <SkillCard name={s.name} icon={s.icon} note={s.note} />
            </Reveal>
          ))}
        </div>
      </div>

      {learningSkills.length > 0 && (
        <div className="skills-group">
          <Reveal>
            <p className="skills-label">Currently learning</p>
          </Reveal>
          <div className="skill-grid">
            {learningSkills.map((s, i) => (
              <Reveal key={s.name} delay={i * 70}>
                <div className="skill-card">
                  <h3>{s.name}</h3>
                  <p>{s.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ----------------------------- Projects ----------------------------- */

function ProjectMedia({ slug, title }: { slug: string; title: string }) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Reveal the preview once, when it first enters view.
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-revealed');
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="project-media" ref={ref}>
      {!broken && (
        <img
          src={`/projects/${slug}.png`}
          alt={`Preview of ${title}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
      {broken && (
        <div className="project-media-fallback" aria-label={`${title} preview`}>
          <small>Live project</small>
          <span>{title}</span>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1200px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <article className="project-card" ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}>
      <ProjectMedia slug={project.slug} title={project.title} />
      <div className="project-body">
        <p className="project-kicker">{project.kicker}</p>
        <h3>{project.title}</h3>
        {project.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {(project.live || project.github) && (
          <div className="project-links">
            {project.live && (
              <Magnetic>
                <a className="btn btn--primary" href={project.live} target="_blank" rel="noreferrer" data-cursor>
                  Live demo ↗
                </a>
              </Magnetic>
            )}
            {project.github && (
              <a className="text-link" href={project.github} target="_blank" rel="noreferrer" data-cursor>
                Source on GitHub
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

const wheelItems: WheelItem[] = projects.map((p) => ({
  slug: p.slug,
  title: p.title,
  kicker: p.kicker,
  href: p.live ?? p.github,
}));

export function Projects() {
  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <Reveal>
        <p className="kicker">03 — Projects</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 id="projects-title" className="display-2">
          <SplitText text="Things I've built." />
        </h2>
      </Reveal>
      <WorksWheel items={wheelItems} label="Works '26" />
      <div className="project-list">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- Journey ----------------------------- */

export function Journey() {
  return (
    <section id="journey" className="section" aria-labelledby="journey-title">
      <Reveal>
        <p className="kicker">04 — Journey</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 id="journey-title" className="display-2">
          <SplitText text="Learning by building." />
        </h2>
      </Reveal>
      <Reveal>
        <TimelineList />
      </Reveal>
    </section>
  );
}

function TimelineList() {
  // Wrapper gets .is-in from Reveal; the line grows when it does.
  return (
    <ol className="timeline">
      <span className="timeline-line" aria-hidden="true" />
      {journey.map((item, i) => (
        <li
          key={`${item.year}-${i}`}
          className="timeline-item"
          style={{ '--i': i } as CSSProperties}
        >
          <p className="timeline-year">{item.year}</p>
          <p className="timeline-text">{item.text}</p>
        </li>
      ))}
    </ol>
  );
}

/* ----------------------------- Education ----------------------------- */

export function Education() {
  return (
    <section id="education" className="section" aria-labelledby="education-title">
      <Reveal>
        <p className="kicker">05 — Education</p>
      </Reveal>
      <div className="edu-list">
        {educationList.map((item, i) => (
          <Reveal key={item.institution} delay={60 * (i + 1)}>
            <div className="edu-card">
              <p className="edu-years">{item.years}</p>
              <div className="edu-body">
                <h3 id={i === 0 ? 'education-title' : undefined}>{item.institution}</h3>
                {item.affiliation && <p className="edu-affiliation">{item.affiliation}</p>}
                <p>
                  {item.degree}
                  <br />
                  {item.detail}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
