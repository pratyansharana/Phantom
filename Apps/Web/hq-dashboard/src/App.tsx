import { useState } from 'react';
import type { FormEvent } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import { useHqAccess } from './hooks/useHqAccess';
import { useHqDashboard } from './hooks/useHqDashboard';
import { formatTimestamp, labelForEvent } from './lib/format';
import type { UserDetails } from './types/activity';
import './App.css';

const mapUrlForLocation = (latitude: number, longitude: number) => {
  const delta = 0.01;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

const externalMapUrl = (latitude: number, longitude: number) =>
  `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

function App() {
  const { user, isHq, loading: accessLoading, error: accessError } = useHqAccess();
  const dashboard = useHqDashboard(isHq);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const activeDistressCount = dashboard.distressAlerts.filter(alert => alert.status === 'active').length;

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
    return <div className="content empty">Checking HQ access...</div>;
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="auth-visual">
          <div className="brand-mark">PH</div>
          <h1>Phantom HQ</h1>
          <p>Encrypted field operations, distress monitoring, and command oversight in one protected console.</p>
          <div className="signal-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
        <form className="login-card" onSubmit={handleLogin}>
          <h2>Operator Sign In</h2>
          <p>Message bodies are never loaded here.</p>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="primary-btn" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
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
          <div className="brand-mark small">PH</div>
          <div>
            <strong>Phantom HQ</strong>
            <span>Activity monitoring - no private message content</span>
          </div>
        </div>
        <div className="operator-strip">
          <span>Operator</span>
          <strong>{user.email}</strong>
          <button className="ghost-btn compact" type="button" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </header>

      <main className="content">
        {dashboard.error && <p className="error">{dashboard.error}</p>}
        {actionError && <p className="error">{actionError}</p>}

        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">Command overview</span>
            <h1>Secure operations dashboard</h1>
            <p>Monitor field distress signals, inspect verified profiles, and remove compromised chats without exposing encrypted message content.</p>
            <div className="hero-actions">
              <a className="primary-link" href="#distress-alerts">Review distress</a>
              <a className="secondary-link" href="#chat-monitor">Audit chats</a>
            </div>
          </div>
          <div className="visual-grid" aria-hidden="true">
            <div className="visual-card visual-command"><span>OPS</span></div>
            <div className="visual-card visual-map"><span>GEO</span></div>
            <div className="visual-card visual-field"><span>FIELD</span></div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card danger-stat">
            <span>Active distress</span>
            <strong>{activeDistressCount}</strong>
            <em>{activeDistressCount > 0 ? 'Immediate review' : 'All clear'}</em>
          </article>
          <article className="stat-card">
            <span>Active chats</span>
            <strong>{dashboard.chats.length}</strong>
            <em>Encrypted channels</em>
          </article>
          <article className="stat-card">
            <span>Messages (24h)</span>
            <strong>{dashboard.messagesLast24h}</strong>
            <em>Metadata only</em>
          </article>
          <article className="stat-card">
            <span>Pending requests</span>
            <strong>{dashboard.pendingRequests}</strong>
            <em>Connection queue</em>
          </article>
          <article className="stat-card">
            <span>Pending group invites</span>
            <strong>{dashboard.pendingInvites}</strong>
            <em>Group queue</em>
          </article>
        </section>

        <section className="panel distress-panel" id="distress-alerts">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Priority response</span>
              <h2>Distress alerts</h2>
              <p>Live mobile distress signals for HQ response</p>
            </div>
          </div>
          {dashboard.distressAlerts.length === 0 ? (
            <div className="empty">No distress alerts.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Status</th>
                    <th>Details</th>
                    <th>Location</th>
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
                        {alert.location?.available && typeof alert.location.latitude === 'number' && typeof alert.location.longitude === 'number' ? (
                          <div className="map-cell">
                            <iframe
                              title={`Distress location for ${alert.name}`}
                              src={mapUrlForLocation(alert.location.latitude, alert.location.longitude)}
                            />
                            <div className="map-meta">
                              <strong>{alert.location.latitude.toFixed(5)}, {alert.location.longitude.toFixed(5)}</strong>
                              <span>
                                {typeof alert.location.accuracy === 'number' ? `Accuracy ${Math.round(alert.location.accuracy)} m` : 'Accuracy unavailable'}
                              </span>
                              {alert.location.capturedAt && <span>{new Date(alert.location.capturedAt).toLocaleString()}</span>}
                              <a href={externalMapUrl(alert.location.latitude, alert.location.longitude)} target="_blank" rel="noreferrer">Open map</a>
                            </div>
                          </div>
                        ) : (
                          <span className="muted">Unavailable{alert.location?.reason ? `: ${alert.location.reason}` : ''}</span>
                        )}
                      </td>
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
            </div>
          )}
        </section>

        {selectedUser && (
          <section className="panel user-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Profile intelligence</span>
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

        <section className="dashboard-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Audit trail</span>
                <h2>Activity feed</h2>
                <p>Connection, group, and message events - metadata only</p>
              </div>
            </div>
            {dashboard.loading ? (
              <div className="empty">Loading activity...</div>
            ) : dashboard.events.length === 0 ? (
              <div className="empty">No activity events yet. Mobile clients log events on user actions.</div>
            ) : (
              <div className="table-wrap">
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
                          {event.targetName && <>to {event.targetName} </>}
                          {event.chatId && <>chat {event.chatId.slice(0, 8)}... </>}
                          {event.metadata?.hasMedia ? '(media) ' : ''}
                          {event.metadata?.groupName ? `"${event.metadata.groupName}" ` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel" id="chat-monitor">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Channel control</span>
                <h2>Chat monitor</h2>
                <p>Membership and timestamps only - encrypted payloads are not queried</p>
              </div>
            </div>
            {dashboard.chats.length === 0 ? (
              <div className="empty">No chats yet.</div>
            ) : (
              <div className="table-wrap">
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
                        <td>{chat.type === 'group' ? chat.name || 'Unnamed group' : chat.memberNames.join(' / ')}</td>
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
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
