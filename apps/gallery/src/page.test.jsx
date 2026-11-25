import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Gallery from './page.jsx';

afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });

describe('guest gallery access states', () => {
  it('displays a private invalid-link state without making a request when the token is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<Gallery />);
    expect(await screen.findByRole('heading', { name: 'This photo link is unavailable' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the pending-upload message returned by the API', async () => {
    window.history.replaceState({}, '', '/s/example-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { status: 'pending' } }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    render(<Gallery />);
    expect(await screen.findByRole('heading', { name: 'Your photos are being prepared' })).toBeInTheDocument();
  });
});
