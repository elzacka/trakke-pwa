import { useState } from 'react'
import BottomSheet from './BottomSheet'
import '../styles/InfoSheet.css'

interface InfoSheetProps {
  isOpen: boolean
  onClose: () => void
}

const InfoSheet = ({ isOpen, onClose }: InfoSheetProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

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
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

export default InfoSheet
