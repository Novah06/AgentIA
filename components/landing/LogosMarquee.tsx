const LOGOS = [
  'Groupe Nexalta',
  'Atelier Dubois',
  'Meridian Tech',
  'Cabinet Morel',
  'Foncière Aurore',
  'Studio Karbon',
  'LogiServ Pro',
  'Innov RH',
  'Archimed Group',
  'Tectum SAS',
];

export function LogosMarquee() {
  return (
    <section className="relative py-16">
      <div className="container-narrow">
        <p className="label-muted mb-8 text-center">Ils nous font confiance</p>
      </div>
      <div className="fade-edges-x relative overflow-hidden">
        <div className="flex w-max animate-marquee gap-12 [animation-play-state:running] hover:[animation-play-state:paused]">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <div
              key={i}
              className="flex h-14 items-center justify-center whitespace-nowrap text-lg font-display font-semibold text-text-secondary opacity-70 transition-opacity hover:opacity-100"
              style={{ minWidth: '180px' }}
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
