import './App.css';

import useExoplanets from './hooks/useExoplanets';

const formatNumber = (value: number | null, decimals = 2) => {
  if (value === null) {
    return '—';
  }

  return value.toFixed(decimals);
};

function App() {
  const { items, status, error } = useExoplanets();

  return (
    <main className="app">
      <header className="app__header">
        <h1>NASA Exoplanet Archive</h1>
        <p>Latest confirmed exoplanets with key discovery metrics.</p>
      </header>

      {status === 'loading' && <p className="app__message">Loading exoplanet data…</p>}
      {status === 'failed' && (
        <p className="app__message app__message--error" role="alert">
          Unable to load exoplanets: {error}
        </p>
      )}

      {status === 'succeeded' && (
        <section className="exoplanet-grid" aria-live="polite">
          {items.map((planet) => (
            <article className="exoplanet-card" key={planet.pl_name}>
              <h2>{planet.pl_name}</h2>
              <dl>
                <div>
                  <dt>Host Star</dt>
                  <dd>{planet.hostname ?? '—'}</dd>
                </div>
                <div>
                  <dt>Discovery Method</dt>
                  <dd>{planet.discoverymethod ?? '—'}</dd>
                </div>
                <div>
                  <dt>Discovery Year</dt>
                  <dd>{planet.disc_year ?? '—'}</dd>
                </div>
                <div>
                  <dt>Orbital Period (days)</dt>
                  <dd>{formatNumber(planet.pl_orbper)}</dd>
                </div>
                <div>
                  <dt>Planet Radius (Earth radii)</dt>
                  <dd>{formatNumber(planet.pl_rade)}</dd>
                </div>
                <div>
                  <dt>Planet Mass (Earth masses)</dt>
                  <dd>{formatNumber(planet.pl_bmasse)}</dd>
                </div>
                <div>
                  <dt>Star Spectral Type</dt>
                  <dd>{planet.st_spectype ?? '—'}</dd>
                </div>
                <div>
                  <dt>Star Temperature (K)</dt>
                  <dd>{formatNumber(planet.st_teff, 0)}</dd>
                </div>
                <div>
                  <dt>Star Radius (Solar radii)</dt>
                  <dd>{formatNumber(planet.st_rad)}</dd>
                </div>
                <div>
                  <dt>Star Mass (Solar masses)</dt>
                  <dd>{formatNumber(planet.st_mass)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default App;
