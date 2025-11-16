import { useState } from 'react'
import BottomSheet from './BottomSheet'
import '../styles/InfoSheet.css'

interface InfoSheetProps {
  isOpen: boolean
  onClose: () => void
}

const InfoSheet = ({ isOpen, onClose }: InfoSheetProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Detect if mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={40}
      halfHeight={70}
      initialHeight="half"
    >
      <div className="info-sheet">
        <div className="info-sheet-header">
          <h2>Info</h2>
          <button
            className="info-sheet-close"
            onClick={onClose}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="info-sheet-content">
          <div className="info-menu">
            {/* Datakilder Section */}
            <div className="info-section-group">
              <button
                className="info-section-header"
                onClick={() => toggleSection('datakilder')}
                aria-expanded={expandedSections.has('datakilder')}
              >
                <span className="info-section-title">Datakilder</span>
                <span className="material-symbols-outlined info-section-chevron">
                  {expandedSections.has('datakilder') ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {expandedSections.has('datakilder') && (
                <div className="info-section-content">
                  <section className="info-section">
                    <h3>Kartverket</h3>
                    <ul className="info-list">
                      <li>
                        Topografiske kart. {' '}
                        <a
                          href="https://kartkatalog.geonorge.no/metadata/topografisk-norgeskart-wmts--cache/8f381180-1a47-4453-bee7-9a3d64843efa"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          WMTS cache-tjeneste.
                        </a>
                      </li>
                      <li>
                        Stedsnavn for søkefunksjon. {' '}
                        <a
                          href="https://kartkatalog.geonorge.no/metadata/stedsnavn-komplett-ssr/e1c50348-962d-4047-8325-bdc265c853ed?search=Sentralt%20Stedsnavnregister%20(SSR)"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          REST API.
                        </a>
                      </li>
                      <li>
                        Adresser for søkefunksjon. {' '}
                        <a
                          href="https://kartkatalog.geonorge.no/metadata/adresser/ea192681-d039-42ec-b1bc-f3ce04c189ac"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          REST API.
                        </a>
                      </li>
                    </ul>
                  </section>

                  <section className="info-section">
                    <h3>Direktoratet for samfunnssikkerhet og beredskap</h3>
                    <p>
                      Offentlige tilfluktsrom i Norge. {' '}
                      <a
                        href="https://kartkatalog.geonorge.no/metadata/tilfluktsrom-offentlige-wfs/06da6e96-544c-467d-8329-5ca25a11328b"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WMS-tjeneste.
                      </a>
                    </p>
                  </section>
                </div>
              )}
            </div>

            {/* Personvern Section */}
            <div className="info-section-group">
              <button
                className="info-section-header"
                onClick={() => toggleSection('personvern')}
                aria-expanded={expandedSections.has('personvern')}
              >
                <span className="info-section-title">Personvern</span>
                <span className="material-symbols-outlined info-section-chevron">
                  {expandedSections.has('personvern') ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {expandedSections.has('personvern') && (
                <div className="info-section-content">
                  <section className="info-section">
                    <p>
                      Tråkke er laget med personvern som grunnleggende prinsipp:
                    </p>
                    <ul className="info-list">
                      <li>Ingen eksterne sporingsverktøy, ingen analyser, ingen cookies.</li>
                      <li>All brukerdata lagres kun lokalt på din enhet.</li>
                    </ul>
                    <p>
                      Les mer i{' '}
                      <a
                        href="https://forvarelset.tazk.no/space/TO/293371905/Personvernerkl%C3%A6ring+for+Tr%C3%A5kke"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Tråkkes personvernerklæring
                      </a>
                      .
                    </p>
                  </section>
                </div>
              )}
            </div>

            {/* Veiledning Section */}
            <div className="info-section-group">
              <button
                className="info-section-header"
                onClick={() => toggleSection('veiledning')}
                aria-expanded={expandedSections.has('veiledning')}
              >
                <span className="info-section-title">Veiledning</span>
                <span className="material-symbols-outlined info-section-chevron">
                  {expandedSections.has('veiledning') ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {expandedSections.has('veiledning') && (
                <div className="info-section-content">
                  {/* Bruke appen - User Guide */}
                  <div className="info-section-group">
                    <button
                      className="info-section-header"
                      onClick={() => toggleSection('bruke-appen')}
                      aria-expanded={expandedSections.has('bruke-appen')}
                    >
                      <span className="info-section-title">Bruke appen</span>
                      <span className="material-symbols-outlined info-section-chevron">
                        {expandedSections.has('bruke-appen') ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {expandedSections.has('bruke-appen') && (
                      <div className="info-section-content">
                        <section className="info-section">
                          <h4>Legge til punkt på kartet</h4>
                          <ul className="info-list">
                            <li>Åpne <strong>Ruter og punkter</strong> fra menyen</li>
                            <li>Trykk <strong>Legg til punkt</strong></li>
                            <li>Klikk på kartet der du vil plassere punktet</li>
                            <li>{isMobile ? 'Trykk og hold' : 'Høyreklikk'} på punktmarkøren for å gi navn og kategori</li>
                          </ul>

                          <h4>Måle avstand og areal</h4>
                          <ul className="info-list">
                            <li>Åpne <strong>Måleverktøy</strong> fra menyen</li>
                            <li>Velg <strong>Avstand</strong> eller <strong>Areal</strong></li>
                            <li>Klikk på kartet for å legge til målepunkter</li>
                            <li>Bruk <strong>Angre</strong> for å fjerne siste punkt</li>
                            <li>Bruk <strong>Nullstill</strong> for å starte på nytt</li>
                          </ul>

                          <h4>Laste ned kart for offline bruk</h4>
                          <ul className="info-list">
                            <li>Åpne <strong>Offline kart</strong> fra menyen</li>
                            <li>Klikk to ganger på kartet for å velge område</li>
                            <li>Velg zoom-nivå (høyere nivå = mer detaljer, større nedlasting)</li>
                            <li>Trykk <strong>Last ned</strong> og vent til ferdig</li>
                          </ul>

                          <h4>Vise og skjule punkter</h4>
                          <ul className="info-list">
                            <li>Åpne <strong>Ruter og punkter</strong></li>
                            <li>Trykk <strong>Fjern punkter fra kart</strong> for å skjule alle punkter</li>
                            <li>Trykk <strong>Vis punkter på kart</strong> for å vise dem igjen</li>
                            <li>Innstillingen lagres og huskes når du åpner appen neste gang</li>
                          </ul>

                          <h4>Vise tilfluktsrom og andre POI</h4>
                          <ul className="info-list">
                            <li>Åpne <strong>Kategorier</strong> fra menyen</li>
                            <li>Aktiver <strong>Tilfluktsrom</strong> eller andre kategorier</li>
                            <li>Zoom inn på kartet for å se markører</li>
                            <li>Klikk på markør for å se detaljer</li>
                          </ul>

                          <h4>Endre koordinatformat</h4>
                          <ul className="info-list">
                            <li>Åpne <strong>Innstillinger</strong> fra menyen</li>
                            <li>Rull ned til <strong>Koordinatformat</strong></li>
                            <li>Velg mellom DD, DMS, DDM, UTM eller MGRS</li>
                            <li>Formatet brukes i søkeresultater og punktdetaljer</li>
                          </ul>

                          <h4>Kopiere koordinater fra kartet</h4>
                          <ul className="info-list">
                            <li>{isMobile ? 'Trykk og hold' : 'Ctrl + klikk'} på kartet</li>
                            <li>Koordinater kopieres automatisk til utklippstavlen</li>
                            <li>En melding vises nederst på kartet</li>
                          </ul>

                          <h4>Søke etter steder</h4>
                          <ul className="info-list">
                            <li>Trykk <strong>Søk</strong> fra menyen (eller {isMobile ? 'søkeknapp' : 'Ctrl + K'})</li>
                            <li>Skriv stedsnavn eller adresse</li>
                            <li>Bruk {isMobile ? 'filterknapp' : 'hjem-ikon'} for å søke kun i adresser</li>
                            <li>Klikk på resultat for å sentrere kartet</li>
                          </ul>
                        </section>
                      </div>
                    )}
                  </div>

                  {/* Desktop: Hurtigtaster */}
                  {!isMobile && (
                    <div className="info-section-group">
                      <button
                        className="info-section-header"
                        onClick={() => toggleSection('hurtigtaster')}
                        aria-expanded={expandedSections.has('hurtigtaster')}
                      >
                        <span className="info-section-title">Hurtigtaster</span>
                        <span className="material-symbols-outlined info-section-chevron">
                          {expandedSections.has('hurtigtaster') ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {expandedSections.has('hurtigtaster') && (
                        <div className="info-section-content">
                          <section className="info-section">
                            <ul className="info-list">
                              <li><strong>Ctrl + K</strong> - Søk</li>
                              <li><strong>Ctrl + B</strong> - Åpne/lukk meny</li>
                              <li><strong>Esc</strong> - Avbryt/lukk</li>
                              <li><strong>↑ ↓</strong> - Naviger søkeresultater</li>
                              <li><strong>Enter</strong> - Velg søkeresultat</li>
                              <li><strong>Tab</strong> - Fullfør søk</li>
                              <li><strong>Skyv</strong> - Panorér kart</li>
                              <li><strong>Rullehjul</strong> - Zoom inn/ut</li>
                              <li><strong>Shift + rullehjul</strong> - Zoom inn/ut (presis)</li>
                              <li><strong>Shift + skyv</strong> - Zoom til område</li>
                              <li><strong>Ctrl + skyv</strong> - Vipp og roter kart</li>
                              <li><strong>Dobbeltklikk</strong> - Zoom til punkt</li>
                              <li><strong>Ctrl + klikk</strong> - Kopier koordinater fra kart</li>
                            </ul>
                          </section>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mobile: Bevegelser */}
                  {isMobile && (
                    <div className="info-section-group">
                      <button
                        className="info-section-header"
                        onClick={() => toggleSection('bevegelser')}
                        aria-expanded={expandedSections.has('bevegelser')}
                      >
                        <span className="info-section-title">Bevegelser</span>
                        <span className="material-symbols-outlined info-section-chevron">
                          {expandedSections.has('bevegelser') ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {expandedSections.has('bevegelser') && (
                        <div className="info-section-content">
                          <section className="info-section">
                            <ul className="info-list">
                              <li><strong>Dra finger</strong> - Panorér kart</li>
                              <li><strong>Knip</strong> - Zoom inn/ut</li>
                              <li><strong>To fingre + vri</strong> - Roter kart</li>
                              <li><strong>To fingre + skyv opp/ned</strong> - Vipp kart</li>
                              <li><strong>Dobbeltrykk</strong> - Zoom til punkt</li>
                            </ul>
                          </section>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

export default InfoSheet
