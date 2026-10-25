import React, { useState } from 'react';
import TabBar from './ui/components/TabBar';
import { t } from './ui/strings.fr';

// Écrans factices : remplacés par les vrais écrans dans les tâches suivantes.
const SCREENS = ['today', 'agenda', 'acquis', 'stats', 'settings'];

export default function App() {
  const [tab, setTab] = useState('today');

  return (
    <>
      <main className="app">
        {SCREENS.map((id) => (
          <section key={id} className={`screen${id === tab ? ' on' : ''}`} id={`s-${id}`}>
            <div className="top">
              <h1>{t(`screen.${id}.title`)}</h1>
            </div>
          </section>
        ))}
      </main>
      <TabBar active={tab} onChange={setTab} badge={false} />
    </>
  );
}
