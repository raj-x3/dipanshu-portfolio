import { useState, type FormEvent } from 'react';
import { SiGithub } from 'react-icons/si';
import { FaLinkedinIn } from 'react-icons/fa';
import { FiMail, FiMapPin } from 'react-icons/fi';
import { Reveal, SplitText } from '../components/primitives';
import { profile } from '../data/content';

/*
 * "Let's create something extraordinary": a two-column contact block with a details
 * card and a form. The form has no backend, so submitting opens the visitor's email
 * app with the message addressed to you. Nothing is sent or stored by the site itself.
 */
export function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
  };

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <Reveal>
        <p className="kicker">06 — Contact</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 id="contact-title" className="display-2">
          <SplitText text="Let's create something extraordinary." />
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="lede contact-lede">
          I&rsquo;m always interested in connecting with people, exploring ideas, and building interesting things.
        </p>
      </Reveal>

      <div className="contact-grid">
        <Reveal delay={160}>
          <aside className="contact-card contact-details" aria-label="Contact details">
            <h3>Contact details</h3>
            <ul className="detail-list">
              <li>
                <span className="detail-icon" aria-hidden="true">
                  <FiMail />
                </span>
                <div>
                  <p className="detail-label">Email</p>
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>
                </div>
              </li>
              <li>
                <span className="detail-icon" aria-hidden="true">
                  <FiMapPin />
                </span>
                <div>
                  <p className="detail-label">Location</p>
                  <p className="detail-value">{profile.location}</p>
                </div>
              </li>
            </ul>
            <div className="detail-connect">
              <p className="detail-label">Connect</p>
              <div className="social-row">
                <a className="social-btn" href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub" data-cursor>
                  <SiGithub aria-hidden="true" />
                </a>
                <a className="social-btn" href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" data-cursor>
                  <FaLinkedinIn aria-hidden="true" />
                </a>
              </div>
            </div>
          </aside>
        </Reveal>

        <Reveal delay={220}>
          <form className="contact-card contact-form" onSubmit={onSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Message</span>
              <textarea
                required
                rows={5}
                placeholder="Tell me about your idea, project or collaboration…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn--primary btn--block" data-cursor>
              Send message →
            </button>
            <p className="form-note">Opens your email app with this message addressed to me.</p>
          </form>
        </Reveal>
      </div>

      <Reveal delay={260}>
        <footer className="footer">
          <span className="footer-sign">Designed &amp; built by Dipanshu Raj.</span>
          <span>© 2026 · Patna, India</span>
        </footer>
      </Reveal>
    </section>
  );
}
