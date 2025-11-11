import BottomSheet from './BottomSheet'
import '../styles/InfoSheet.css'

interface InfoSheetProps {
  isOpen: boolean
  onClose: () => void
}

const InfoSheet = ({ isOpen, onClose }: InfoSheetProps) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={35}
      halfHeight={70}
      initialHeight="half"
    >
      <div className="info-sheet">
        <div className="info-sheet-header">
          <h2>Datakilder</h2>
          <button
            className="info-sheet-close"
            onClick={onClose}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="info-sheet-content">
          <section className="info-section">
            <h3>Kartdata</h3>
            <p>
              Topografiske kart fra Kartverkets{' '}
              <a
                href="https://www.kartverket.no/api-og-data/kartdata/gratis-kartdata/cache-tjenester"
                target="_blank"
                rel="noopener noreferrer"
              >
                WMTS cache-tjeneste
              </a>
            </p>
            <p className="info-detail">
              Leveres via cache.kartverket.no • © Kartverket - CC BY 4.0 lisens
            </p>
          </section>

          <section className="info-section">
            <h3>Søk - Stedsnavn</h3>
            <p>
              Stedsnavn fra Kartverkets{' '}
              <a
                href="https://www.kartverket.no/api-og-data/stedsnavn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sentralt Stedsnavnregister (SSR)
              </a>
            </p>
            <p className="info-detail">
              API: ws.geonorge.no/stedsnavn/v1 • © Kartverket - CC BY 4.0 lisens
            </p>
          </section>

          <section className="info-section">
            <h3>Søk - Adresser</h3>
            <p>
              Adresser fra Kartverkets{' '}
              <a
                href="https://www.kartverket.no/api-og-data/adresser"
                target="_blank"
                rel="noopener noreferrer"
              >
                Adresseregister
              </a>
            </p>
            <p className="info-detail">
              API: ws.geonorge.no/adresser/v1 • © Kartverket - CC BY 4.0 lisens
            </p>
          </section>

          <section className="info-section">
            <h3>Geolokalisering</h3>
            <p>
              Posisjonsdata fra din enhets GPS/nettverksbaserte lokalisering via nettleserens Geolocation API
            </p>
            <p className="info-detail">
              Alle lokasjonsdata lagres kun lokalt på din enhet
            </p>
          </section>

          <section className="info-section">
            <h3>Om Tråkke</h3>
            <p>
              Tråkke er en personvernvennlig kartapplikasjon for norsk natur. Ingen
              sporing, ingen analyser, alle data lagres lokalt på din enhet.
            </p>
            <p className="info-detail">
              Bygget med React • MapLibre GL JS • Material Symbols
            </p>
          </section>

          <section className="info-section">
            <h3>Vilkår og betingelser</h3>
            <p>
              Kartdata og stedsnavn er tilgjengelig under{' '}
              <a
                href="https://www.kartverket.no/api-og-data/vilkar-for-bruk"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kartverkets vilkår for bruk
              </a>
            </p>
            <p className="info-detail">
              Tråkke er GDPR-kompatibel og følger norske personvernregler
            </p>
          </section>
          <div style={{ height: '200px', flexShrink: 0 }} />
        </div>
      </div>
    </BottomSheet>
  )
}

export default InfoSheet
