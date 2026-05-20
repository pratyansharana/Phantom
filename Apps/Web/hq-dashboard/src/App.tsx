import { useState } from 'react';
import type { FormEvent } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import { useHqAccess } from './hooks/useHqAccess';
import { useHqDashboard } from './hooks/useHqDashboard';
import { formatTimestamp, labelForEvent } from './lib/format';
import './App.css';

function App() {
  const { user, isHq, loading: accessLoading, error: accessError } = useHqAccess();
  const dashboard = useHqDashboard(isHq);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      console.error(err);
      setAuthError('Sign-in failed. Use an HQ operator account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (accessLoading) {
    return <div className="content empty">Checking HQ access…</div>;
  }

  if (!user) {
    return (
      <div className="content">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>Phantom HQ</h1>
          <p>Operations dashboard. Message bodies are never loaded here.</p>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="primary-btn" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          {authError && <p className="notice">{authError}</p>}
        </form>
      </div>
    );
  }

  if (!isHq) {
    return (
      <div className="content">
        <div className="denied-card">
          <h1>Access denied</h1>
          <p>
            Signed in as {user.email}, but it is not in <code>hq_operators/hq_operator.allowedEmails</code>.
          </p>
          <button className="ghost-btn" type="button" onClick={() => signOut(auth)}>Sign out</button>
          {accessError && <p className="notice">{accessError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>Phantom HQ</strong>
          <span>Activity monitoring · no private message content</span>
        </div>
        <button className="ghost-btn" type="button" onClick={() => signOut(auth)}>Sign out</button>
      </header>

      <main className="content">
        {dashboard.error && <p className="error">{dashboard.error}</p>}

        <section className="stats-grid">
          <article className="stat-card">
            <span>Active chats</span>
            <strong>{dashboard.chats.length}</strong>
          </article>
          <article className="stat-card">
            <span>Messages (24h)</span>
            <strong>{dashboard.messagesLast24h}</strong>
          </article>
          <article className="stat-card">
            <span>Pending requests</span>
            <strong>{dashboard.pendingRequests}</strong>
          </article>
          <article className="stat-card">
            <span>Pending group invites</span>
            <strong>{dashboard.pendingInvites}</strong>
          </article>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Activity feed</h2>
              <p>Connection, group, and message events — metadata only</p>
            </div>
          </div>
          {dashboard.loading ? (
            <div className="empty">Loading activity…</div>
          ) : dashboard.events.length === 0 ? (
            <div className="empty">No activity events yet. Mobile clients log events on user actions.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.events.map(event => (
                  <tr key={event.id}>
                    <td>{formatTimestamp(event.createdAt)}</td>
                    <td>{labelForEvent(event.type)}</td>
                    <td>{event.actorName}</td>
                    <td>
                      {event.targetName && <>→ {event.targetName} </>}
                      {event.chatId && <>chat {event.chatId.slice(0, 8)}… </>}
                      {event.metadata?.hasMedia ? '(media) ' : ''}
                      {event.metadata?.groupName ? `"${event.metadata.groupName}" ` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Chat monitor</h2>
              <p>Membership and timestamps only — encrypted payloads are not queried</p>
            </div>
          </div>
          {dashboard.chats.length === 0 ? (
            <div className="empty">No chats yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Chat</th>
                  <th>Type</th>
                  <th>Members</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.chats.map(chat => (
                  <tr key={chat.id}>
                    <td>{chat.type === 'group' ? chat.name || 'Unnamed group' : chat.memberNames.join(' · ')}</td>
                    <td><span className={`pill ${chat.type}`}>{chat.type}</span></td>
                    <td>{chat.memberCount}</td>
                    <td>{formatTimestamp(chat.updatedAt || chat.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
