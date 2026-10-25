import React from 'react';
import { STORAGE_KEY } from '../../store/storage';
import { downloadText } from '../download';
import { t } from '../strings.fr';

function rawStorage() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Dernier filet : une erreur de rendu affiche un message avec l'export du texte brut stocké
 * et une réinitialisation confirmée dans la page (efface `qmos.state` puis recharge).
 * @extends {React.Component<{children: React.ReactNode, onReload?: () => void}, {failed: boolean, confirming: boolean}>}
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, confirming: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  exportRaw = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(rawStorage(), `qmos-${stamp}-brut.json`);
  };

  reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Stockage indisponible : le rechargement repartira de ce qui reste.
    }
    (this.props.onReload ?? (() => window.location.reload()))();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    const { confirming } = this.state;
    return (
      <main className="app">
        <section className="screen on">
          <div className="card empty-state" role="alert">
            <p><strong>{t('app.crash.title')}</strong></p>
            <p>{t('app.crash.body')}</p>
            <button type="button" className="btn" onClick={this.exportRaw}>{t('app.crash.export')}</button>
            {!confirming && (
              <button type="button" className="btn ghost" onClick={() => this.setState({ confirming: true })}>
                {t('app.crash.reset')}
              </button>
            )}
          </div>
          {confirming && (
            <div className="card empty-state">
              <p>{t('app.crash.confirm')}</p>
              <button type="button" className="btn ghost" onClick={() => this.setState({ confirming: false })}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn" onClick={this.reset}>{t('app.crash.confirmReset')}</button>
            </div>
          )}
        </section>
      </main>
    );
  }
}
