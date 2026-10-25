import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Boom() {
  throw new Error('panne');
}

const readBlob = (blob) => new Promise((resolve) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.readAsText(blob);
});

describe('ErrorBoundary', () => {
  let anchors;
  let blobs;
  beforeEach(() => {
    localStorage.clear();
    anchors = [];
    blobs = [];
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React journalise l'erreur attrapée
    globalThis.URL.createObjectURL = vi.fn((b) => { blobs.push(b); return 'blob:raw'; });
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { anchors.push(this); });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('affiche ses enfants sans erreur', () => {
    render(<ErrorBoundary><p>contenu</p></ErrorBoundary>);
    expect(screen.getByText('contenu')).toBeInTheDocument();
  });

  it('en cas d’erreur : message en français et export du texte brut de qmos.state', async () => {
    localStorage.setItem('qmos.state', '{"schemaVersion":1,"cassé":true}');
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Un problème empêche l’affichage');
    fireEvent.click(screen.getByRole('button', { name: 'Exporter mes données' }));
    expect(anchors).toHaveLength(1);
    expect(anchors[0].download).toMatch(/^qmos-.*\.json$/);
    expect(await readBlob(blobs[0])).toBe('{"schemaVersion":1,"cassé":true}');
  });

  it('Réinitialiser demande une confirmation dans la page, puis efface qmos.state et recharge', () => {
    localStorage.setItem('qmos.state', 'x');
    const onReload = vi.fn();
    render(<ErrorBoundary onReload={onReload}><Boom /></ErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(localStorage.getItem('qmos.state')).toBe('x');
    expect(onReload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('button', { name: 'Oui, tout effacer' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    fireEvent.click(screen.getByRole('button', { name: 'Oui, tout effacer' }));
    expect(localStorage.getItem('qmos.state')).toBeNull();
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
