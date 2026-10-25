import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import TabBar from './TabBar';
import ScorePills from './ScorePills';
import BottomSheet from './BottomSheet';
import Toast from './Toast';
import HizbLabel from './HizbLabel';
import { t } from '../strings.fr';

afterEach(cleanup);

vi.mock('../../domain/referential', () => ({
  hizbInfo: (hizb) => ({ hizb, juz: 13, hizbName: 'وما أبرئ', surah: 'يوسف' }),
}));

describe('t', () => {
  it('interpole les variables {name}', () => {
    expect(t('toast.validated', { hizb: 25 })).toContain('25');
  });
});

describe('TabBar', () => {
  it('affiche 5 libellés et appelle onChange("agenda")', () => {
    const onChange = vi.fn();
    render(<TabBar active="today" onChange={onChange} badge={false} />);
    for (const l of ["Aujourd'hui", 'Agenda', 'Acquis', 'Stats', 'Réglages']) {
      expect(screen.getByText(l)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByText('Agenda'));
    expect(onChange).toHaveBeenCalledWith('agenda');
  });
  it("marque l'onglet actif avec aria-current", () => {
    render(<TabBar active="stats" onChange={() => {}} badge />);
    expect(screen.getByText('Stats').closest('button')).toHaveAttribute('aria-current', 'page');
  });
});

describe('ScorePills', () => {
  it('clic sur 2 appelle onChange(2) et aria-pressed reflète la valeur', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ScorePills value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onChange).toHaveBeenCalledWith(2);
    rerender(<ScorePills value={2} onChange={onChange} />);
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});

describe('BottomSheet', () => {
  it('fermé : non rendu', () => {
    render(<BottomSheet open={false} title="X" onClose={() => {}}>contenu</BottomSheet>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('contenu')).toBeNull();
  });
  it('ouvert : dialog, et le scrim appelle onClose', () => {
    const onClose = vi.fn();
    render(<BottomSheet open title="Titre" subtitle="Sous" onClose={onClose}>contenu</BottomSheet>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('contenu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('scrim'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Toast', () => {
  it("affiche le message, déclenche l'action et disparaît après la durée", () => {
    vi.useFakeTimers();
    const onAction = vi.fn();
    render(<Toast message="Hizb 25 validé" actionLabel="Annuler" onAction={onAction} duration={5000} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(onAction).toHaveBeenCalled();
    expect(screen.getByText('Hizb 25 validé')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5100); });
    expect(screen.queryByText('Hizb 25 validé')).toBeNull();
    vi.useRealTimers();
  });
});

describe('HizbLabel', () => {
  it('affiche numéro, nom arabe, sourate et thumun', () => {
    render(<HizbLabel hizb={25} thumun={6} showName showSurah />);
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('وما أبرئ')).toBeInTheDocument();
    expect(screen.getByText('سورة يوسف')).toBeInTheDocument();
    expect(screen.getByText('الثمن 6/8')).toBeInTheDocument();
  });
});
