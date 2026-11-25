import { useEffect, useState } from 'react';
import { Camera, Heart, Image, LockKeyhole, ShieldCheck } from 'lucide-react';

const configuredApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api/v1';
const apiUrl = new URL(configuredApiBase, window.location.href);
const localApi = ['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname);
const localDevPage = window.location.protocol === 'http:' && window.location.port === '5174' && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
if (localApi && localDevPage) apiUrl.hostname = window.location.hostname;
const API_BASE = apiUrl.toString().replace(/\/$/, '');

export default function Gallery() {
  const token = window.location.pathname.split('/').filter(Boolean).at(-1);
  const galleryType = window.location.pathname.split('/').filter(Boolean).at(-2) === 'c' ? 'client' : 'guest';
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    if (!token || token === 's') return setState({ status: 'invalid' });
    let cancelled = false;
    let timer;
    const checkGallery = async () => {
      try {
        const response = await fetch(`${API_BASE}/gallery/${galleryType}/${encodeURIComponent(token)}`);
        const body = await response.json().catch(() => ({}));
        const next = response.ok ? body.data : { status: body.error?.code || 'invalid' };
        if (cancelled) return;
        setState(next);
        if (next.status === 'pending') timer = setTimeout(checkGallery, 8_000);
      } catch {
        if (!cancelled) setState({ status: 'unavailable' });
      }
    };
    checkGallery();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [token, galleryType]);

  const messages = {
    loading: ['Opening your keepsake', 'Checking that your private gallery is ready.'],
    pending: ['Your photos are being prepared', 'Please keep this link and check again shortly.'],
    expired: ['Your download period has ended', 'Please contact the event organizer for assistance.'],
    revoked: ['This photo gallery is no longer available', 'Please contact the event organizer if you need help.'],
    deleted: ['These photos are no longer available', 'The gallery owner has removed these photos.'],
    invalid: ['This photo link is unavailable', 'Check the link or ask the event organizer to share it again.'],
    unavailable: ['We couldn’t open this gallery', 'Check your connection and try again in a moment.'],
  };
  if (state.status === 'active') return <main className="gallery-page"><header><a href="/" className="gallery-brand"><span><Camera size={17}/></span>snapkiosk</a><span className="private-label"><LockKeyhole size={13}/> {galleryType === 'client' ? 'Client album' : 'Private gallery'}</span></header><section className="gallery-content"><div className="gallery-kicker"><span>✳</span> MADE TO KEEP</div><h1>{state.eventName || 'A little moment to remember'}</h1><p className="gallery-date">{state.eventDate || 'Your photo booth keepsake'}</p>{state.welcomeMessage && <p className="welcome-message">{state.welcomeMessage}</p>}<div className="photo-grid">{(state.photos || []).map(photo=><figure key={photo.id}><img src={new URL(photo.thumbnailUrl, API_BASE).href} alt="Photo booth keepsake"/><a href={new URL(photo.downloadUrl, API_BASE).href} download aria-label="Download photo">↓</a></figure>)}</div>{!state.photos?.length && <p className="empty-photos">Your photos are being prepared. Please check back soon.</p>}<div className="gallery-footer"><span><ShieldCheck size={14}/> Shared just for you</span><span>Available until {state.expiresAt ? new Date(state.expiresAt).toLocaleDateString() : 'the link expires'}</span></div></section></main>;
  const [title, message] = messages[state.status] || messages.invalid;
  return <main className="status-page"><div className="status-card"><div className="status-brand"><Camera size={17}/> snapkiosk</div><div className="status-art"><div className="frame"><Image size={28}/><Heart size={15}/></div><span>✦</span></div><p className="gallery-kicker">A PRIVATE PHOTO GALLERY</p><h1>{title}</h1><p className="status-message">{message}</p><div className="privacy-note"><ShieldCheck size={16}/><span>Your gallery is private. Only someone with this link can view it.</span></div></div><footer>Made for the moments you want to keep <span>✳</span></footer></main>;
}
