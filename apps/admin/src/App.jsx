import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, CalendarDays, Camera, CreditCard, HardDrive, LayoutDashboard, MoreHorizontal, Search, Settings2, ShieldCheck, Sparkles, Ticket, Users, Wifi, WifiOff } from 'lucide-react';
import { getDashboardSummary, api } from './services/api.js';
import ManagementPage from './Management.jsx';

const navigation = [
  { section: 'OVERVIEW', links: [['Dashboard', LayoutDashboard], ['Calendar', CalendarDays]] },
  { section: 'BUSINESS MANAGEMENT', links: [['Events', Sparkles], ['Event setup', CalendarDays], ['Bookings', Ticket], ['Clients', Users], ['Rental packages', CreditCard]] },
  { section: 'KIOSK MANAGEMENT', links: [['Kiosk devices', Camera], ['Device pairing', ShieldCheck], ['Device monitoring', Activity]] },
  { section: 'DESIGN & DELIVERY', links: [['Photo templates', Sparkles], ['Asset library', Camera], ['Event galleries', Camera], ['Client albums', HardDrive], ['Upload monitoring', HardDrive], ['Reports', Activity]] },
  { section: 'WORKSPACE', links: [['Users', Users], ['Audit log', ShieldCheck], ['Settings', Settings2]] },
];
const displayDate = value => value ? new Intl.DateTimeFormat('en-PH', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'Asia/Manila' }).format(new Date(value)) : '—';

function StatCard({ label, value, change, icon: Icon, tone = 'mint' }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><p className="stat-label">{label}</p><strong>{value ?? '—'}</strong><span className="stat-change">{change || 'Live data from your account'}</span></article>;
}

function SignIn({ error, onSubmit, pending }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  return <main className="auth-page"><form className="auth-card" onSubmit={event => { event.preventDefault(); onSubmit({ email, password }); }}><div className="brand auth-brand"><span className="brand-mark"><Camera size={18}/></span><span><b>snapkiosk</b><small>STUDIO MANAGER</small></span></div><p className="auth-eyebrow">YOUR STUDIO, IN GOOD HANDS</p><h1>Welcome back</h1><p className="auth-copy">Sign in to manage your photo booth studio.</p>{error && <div className="auth-error" role="alert">{error}</div>}<label>Email address<input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label><button className="primary-button auth-submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button><span className="auth-footnote">Need access? Ask your SnapKiosk owner to invite you.</span></form><span className="auth-copyright">© {new Date().getFullYear()} SnapKiosk Studio</span></main>;
}

function Dashboard({ user, onLogout, activePage, onNavigate }) {
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary });
  const health = useQuery({ queryKey: ['api-health'], queryFn: () => api('/health'), retry: 1, refetchInterval: 30_000 });
  const events = useQuery({ queryKey: ['dashboard-events'], queryFn: () => api('/events') });
  const canViewAudit = user.roles?.some(role => ['owner', 'administrator'].includes(role));
  const activity = useQuery({ queryKey: ['dashboard-activity'], queryFn: () => api('/audit-logs?limit=5'), enabled: canViewAudit });
  const data = summary.data;
  const upcomingEvents = (events.data || []).filter(event => event.startsAt && new Date(event.startsAt) >= new Date() && !['cancelled', 'archived'].includes(event.status)).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)).slice(0, 4);
  const today = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date()).toUpperCase();
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#dashboard"><span className="brand-mark"><Camera size={18} /></span><span><b>snapkiosk</b><small>STUDIO MANAGER</small></span></a>
      <div className="workspace-select"><span className="workspace-avatar">S</span><span><b>SnapKiosk Studio</b><small>Owner workspace</small></span></div>
      <nav>{navigation.map(group => <div className="nav-group" key={group.section}><p>{group.section}</p>{group.links.map(([label, Icon]) => <button type="button" key={label} onClick={()=>onNavigate(label)} className={`nav-link nav-button ${activePage===label?'active':''}`}><Icon size={16} /><span>{label}</span></button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="plan-card"><div className="plan-icon"><Sparkles size={16} /></div><b>Ready for your next event?</b><span>Events, bookings, kiosks, and galleries are available from your workspace.</span></div><button className="user-row account-button" onClick={onLogout} title="Sign out"><div className="user-avatar">{user.displayName.slice(0,2).toUpperCase()}</div><div><b>{user.displayName}</b><small>{user.roles?.[0]?.replace('_',' ') || 'Team account'} · Sign out</small></div><MoreHorizontal size={17} /></button></div>
    </aside>
    <main className="main-shell" id="dashboard">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><Camera size={16} /></span><b>snapkiosk</b></div><div className="breadcrumbs"><span>Workspace</span><span>/</span><b>Dashboard</b></div><div className="top-actions"><div className="search-button" aria-label="Search is not available yet"><Search size={15} /><span>Search coming soon</span></div><span className={`status-pill ${health.isError ? 'offline' : ''}`}><i /> {health.isSuccess ? 'API reachable' : health.isError ? 'API unavailable' : 'Checking API'}</span><span className="user-avatar small-avatar">{user.displayName.slice(0,2).toUpperCase()}</span></div></header>
      <div className="page-content">
        {activePage !== 'Dashboard' ? <ManagementPage page={activePage} /> : <>
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> {today}</div><h1>Welcome, {user.displayName.split(' ')[0]} <span>✳</span></h1><p>Here’s what’s happening with your photo booth business today.</p></div><span className="phase-tag">STUDIO WORKSPACE</span></section>
        {summary.isError && <div className="notice error"><WifiOff size={17} /><div><b>Dashboard data is unavailable</b><span>{summary.error.message} Start the API and configure a database to see current business activity.</span></div><button onClick={() => summary.refetch()}>Retry</button></div>}
        {summary.isLoading && <div className="notice"><Wifi size={17} /><div><b>Connecting to your workspace</b><span>Loading current account activity…</span></div></div>}
        <section className="stats-grid" aria-label="Business overview">
          <StatCard label="Registered kiosks" value={data?.registeredKiosks} icon={Camera} tone="lavender" />
          <StatCard label="Active events" value={data?.activeEvents} icon={Sparkles} tone="peach" />
          <StatCard label="Upcoming bookings" value={data?.upcomingBookings} icon={CalendarDays} tone="mint" />
          <StatCard label="Pending uploads" value={data?.pendingUploads} icon={HardDrive} tone="blue" />
        </section>
        <section className="content-grid">
          <article className="panel events-panel"><div className="panel-heading"><div><h2>Upcoming events</h2><p>Your next photo booth bookings</p></div><button className="text-action" onClick={() => onNavigate('Events')}>Manage events</button></div>
            {events.isLoading ? <div className="empty-activity"><div><b>Loading your events…</b></div></div> : events.isError ? <div className="empty-activity"><div><b>Events could not be loaded</b><span>{events.error.message}</span></div></div> : upcomingEvents.length ? <div className="dashboard-list">{upcomingEvents.map(event => <button className="dashboard-list-row" key={event.id} onClick={() => onNavigate('Events')}><span className="dashboard-row-icon"><CalendarDays size={15}/></span><span className="dashboard-row-copy"><b>{event.name}</b><small>{event.clientName || event.eventType || 'Photo booth event'}</small></span><span className="dashboard-row-meta"><b>{new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',timeZone:'Asia/Manila'}).format(new Date(event.startsAt))}</b><small>{event.status}</small></span></button>)}</div> : <div className="empty-state compact-empty"><div className="empty-art"><div className="sun" /><div className="photo-card"><span /><span /><i /></div><div className="sparkle s1">✳</div><div className="sparkle s2">✦</div></div><h3>Your calendar is ready</h3><p>Create an event or booking to see upcoming work here.</p><button className="secondary-button" onClick={() => onNavigate('Events')}><CalendarDays size={14} /> Open events</button></div>}
          </article>
          <article className="panel device-panel"><div className="panel-heading"><div><h2>Kiosk fleet</h2><p>Connectivity and readiness</p></div><button className="text-action" onClick={() => onNavigate('Device monitoring')}>View fleet</button></div><div className="fleet-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="device-illustration"><div className="device-screen"><Camera size={23} /><span>snap</span></div><div className="device-base" /></div><span className="floating-dot dot-green" /><span className="floating-dot dot-pink" /><span className="floating-star">✳</span></div><div className="fleet-caption"><b>{data?.registeredKiosks ?? '—'} devices registered</b><span>Open device monitoring to review connection, printer, and upload status.</span></div><button className="outline-link" onClick={() => onNavigate('Kiosk devices')}>Manage kiosk devices <Camera size={12}/></button></article>
        </section>
        <section className="bottom-grid"><article className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest changes recorded across your studio</p></div><button className="text-action" onClick={() => onNavigate('Audit log')}>Audit log</button></div>{!canViewAudit ? <div className="empty-activity"><div className="activity-icon"><ShieldCheck size={18} /></div><div><b>Activity history is restricted</b><span>Ask an owner or administrator to review the audit log.</span></div></div> : activity.isLoading ? <div className="empty-activity"><div><b>Loading recent activity…</b></div></div> : activity.data?.length ? <div className="activity-list">{activity.data.map(item => <div className="activity-row" key={item.id}><div className="activity-icon"><Activity size={15} /></div><div><b>{item.action.replaceAll('_',' ')}</b><span>{item.actorEmail || 'System'} · {displayDate(item.createdAt)}</span></div></div>)}</div> : <div className="empty-activity"><div className="activity-icon"><Activity size={18} /></div><div><b>No activity just yet</b><span>Changes to events, bookings, and devices will appear here.</span></div></div>}</article><article className="panel tip-panel"><div className="tip-top"><span>STUDIO SHORTCUTS</span><span className="tip-count">READY</span></div><h3>Your workspace is ready</h3><p>Manage events, bookings, kiosks, photo delivery, and studio settings from the sidebar.</p><div className="checklist"><button type="button" onClick={() => onNavigate('Events')}><span className="check-circle done" /> Create and schedule events <span>→</span></button><button type="button" onClick={() => onNavigate('Bookings')}><span className="check-circle done" /> Track bookings and payments <span>→</span></button><button type="button" onClick={() => onNavigate('Photo templates')}><span className="check-circle done" /> Design photo layouts <span>→</span></button></div></article></section>
        </>}
        <footer><span>© {new Date().getFullYear()} SnapKiosk Studio</span><span><a href="/privacy.html" target="_blank" rel="noreferrer">Privacy</a><span>Support</span><span>API status above</span></span><span className="footer-version">v0.1.0</span></footer>
      </div>
    </main>
  </div>;
}

export default function App() {
  const queryClient = useQueryClient();
  const [activePage,setActivePage]=React.useState('Dashboard');
  const session = useQuery({ queryKey:['session'],queryFn:()=>api('/auth/me'),retry:false,staleTime:60_000 });
  const login = useMutation({ mutationFn:credentials=>api('/auth/login',{method:'POST',body:JSON.stringify(credentials)}),onSuccess:data=>queryClient.setQueryData(['session'],data) });
  const logout = async () => { try { await api('/auth/logout',{method:'POST'}); } finally { queryClient.setQueryData(['session'],{user:null}); queryClient.removeQueries({queryKey:['dashboard-summary']}); } };
  if (session.isLoading) return <main className="auth-page"><div className="auth-loading"><span className="brand-mark"><Camera size={18}/></span><span>Opening your studio…</span></div></main>;
  if (session.data?.user) return <Dashboard user={session.data.user} onLogout={logout} activePage={activePage} onNavigate={setActivePage}/>;
  return <SignIn error={login.error?.message || (session.error?.message !== 'Please sign in.' ? session.error?.message : '')} onSubmit={credentials=>login.mutate(credentials)} pending={login.isPending}/>;
}

