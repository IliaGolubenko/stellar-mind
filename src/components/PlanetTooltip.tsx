import type { Exoplanet } from '../types/exoplanet';

interface PlanetTooltipProps {
  planet: Exoplanet | null;
  visible: boolean;
}

const renderMetric = (label: string, value: string | number | null) => (
  <li>
    <span>{label}</span>
    <strong>{value ?? 'N/A'}</strong>
  </li>
);

const formatNumber = (value: number | null, digits = 2) => {
  if (value === null || Number.isNaN(value)) return 'N/A';

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  return value.toFixed(digits);
};

const PlanetTooltip = ({ planet, visible }: PlanetTooltipProps) => {
  if (!visible || !planet) {
    return null;
  }

  return (
    <aside className="tooltip">
      <header>
        <p>Featured Exoplanet</p>
        <h2>{planet.pl_name}</h2>
      </header>
      <ul>
        {renderMetric('Host Star', planet.hostname)}
        {renderMetric('Discovery Method', planet.discoverymethod)}
        {renderMetric('Discovery Year', planet.disc_year)}
        {renderMetric(
          'Orbital Period (days)',
          planet.pl_orbper ? formatNumber(planet.pl_orbper) : null,
        )}
        {renderMetric(
          'Planet Radius (Earth = 1)',
          planet.pl_rade ? formatNumber(planet.pl_rade) : null,
        )}
        {renderMetric(
          'Planet Mass (Earth = 1)',
          planet.pl_bmasse ? formatNumber(planet.pl_bmasse) : null,
        )}
        {renderMetric('Star Spectral Type', planet.st_spectype)}
        {renderMetric(
          'Star Temperature (K)',
          planet.st_teff ? formatNumber(planet.st_teff, 0) : null,
        )}
        {renderMetric(
          'Star Radius (Solar = 1)',
          planet.st_rad ? formatNumber(planet.st_rad) : null,
        )}
        {renderMetric(
          'Star Mass (Solar = 1)',
          planet.st_mass ? formatNumber(planet.st_mass) : null,
        )}
      </ul>
    </aside>
  );
};

export default PlanetTooltip;
