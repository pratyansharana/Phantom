import { useState } from 'react';
import type { FormEvent } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import { useHqAccess } from './hooks/useHqAccess';
import { useHqDashboard } from './hooks/useHqDashboard';
import { formatTimestamp, labelForEvent } from './lib/format';
import type { UserDetails } from './types/activity';
import './App.css';

function App() {
  const { user, isHq, loading: accessLoading, error: accessError } = useHqAccess();
  const dashboard = useHqDashboard(isHq);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
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

  const inspectUser = async (profilePath: string) => {
    setActionError(null);
    try {
      setSelectedUser(await dashboard.loadUserDetails(profilePath));
    } catch (err) {
      console.error(err);
      setActionError('Unable to load user details.');
    }
  };

  const eraseChat = async (chatId: string) => {
    const confirmed = window.confirm('Erase this chat for all members? This deletes the chat and all message records.');
    if (!confirmed) return;

    setActionError(null);
    try {
      await dashboard.eraseChat(chatId);
    } catch (err) {
      console.error(err);
      setActionError('Unable to erase chat. Check Firestore rules and HQ access.');
    }
  };

  const resolveAlert = async (alertId: string) => {
    setActionError(null);
    try {
      await dashboard.resolveDistressAlert(alertId);
    } catch (err) {
      console.error(err);
      setActionError('Unable to resolve distress alert.');
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
            Signed in as {user.email}, but this dashboard currently allows only <code>pratyanshrana1@gmail.com</code>.
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
        {actionError && <p className="error">{actionError}</p>}

        <section className="stats-grid">
          <article className="stat-card danger-stat">
            <span>Active distress</span>
            <strong>{dashboard.distressAlerts.filter(alert => alert.status === 'active').length}</strong>
          </article>
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

        <section className="panel distress-panel">
          <div className="panel-header">
            <div>
              <h2>Distress alerts</h2>
              <p>Live mobile distress signals for HQ response</p>
            </div>
          </div>
          {dashboard.distressAlerts.length === 0 ? (
            <div className="empty">No distress alerts.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.distressAlerts.map(alert => (
                  <tr key={alert.id} className={alert.status === 'active' ? 'alert-row' : undefined}>
                    <td>{formatTimestamp(alert.createdAt)}</td>
                    <td>
                      <button className="link-btn" type="button" onClick={() => inspectUser(alert.profilePath)}>
                        {alert.name}
                      </button>
                      <div className="muted">{alert.email}</div>
                    </td>
                    <td><span className={`pill ${alert.status}`}>{alert.status}</span></td>
                    <td>{alert.subtitle || alert.profilePath}</td>
                    <td>
                      {alert.status === 'active' ? (
                        <button className="ghost-btn compact" type="button" onClick={() => resolveAlert(alert.id)}>Resolve</button>
                      ) : (
                        <span className="muted">Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selectedUser && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>User details</h2>
                <p>{selectedUser.path}</p>
              </div>
              <button className="ghost-btn compact" type="button" onClick={() => setSelectedUser(null)}>Close</button>
            </div>
            <div className="details-grid">
              <div><span>Name</span><strong>{selectedUser.name}</strong></div>
              <div><span>Email</span><strong>{selectedUser.email || 'Not available'}</strong></div>
              <div><span>Phone</span><strong>{selectedUser.phone || 'Not available'}</strong></div>
              <div><span>Profile</span><strong>{selectedUser.collectionName}</strong></div>
              <div><span>Service number</span><strong>{selectedUser.serviceNumber || 'Not available'}</strong></div>
              <div><span>Dependent card</span><strong>{selectedUser.dependentCardNumber || 'Not available'}</strong></div>
            </div>
            <pre className="details-json">{JSON.stringify({
              militaryProfile: selectedUser.militaryProfile,
              relationshipProfile: selectedUser.relationshipProfile,
              personalInformation: selectedUser.personalInformation,
              metadata: selectedUser.metadata,
              authentication: selectedUser.authentication,
            }, null, 2)}</pre>
          </section>
        )}

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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.chats.map(chat => (
                  <tr key={chat.id}>
                    <td>{chat.type === 'group' ? chat.name || 'Unnamed group' : chat.memberNames.join(' · ')}</td>
                    <td><span className={`pill ${chat.type}`}>{chat.type}</span></td>
                    <td>{chat.memberCount}</td>
                    <td>{formatTimestamp(chat.updatedAt || chat.createdAt)}</td>
                    <td className="table-actions">
                      {chat.memberProfilePaths.map((profilePath, index) => (
                        <button
                          key={profilePath}
                          className="ghost-btn compact"
                          type="button"
                          onClick={() => inspectUser(profilePath)}
                        >
                          User {index + 1}
                        </button>
                      ))}
                      <button className="danger-btn compact" type="button" onClick={() => eraseChat(chat.id)}>Erase</button>
                    </td>
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
