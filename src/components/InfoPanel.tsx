import { useState } from 'react'
import '../styles/InfoPanel.css'

const InfoPanel = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="info-panel-control">
      {!isOpen ? (
        <button
          className="info-toggle"
          onClick={() => setIsOpen(true)}
          title="Datakilder"
          aria-label="Datakilder og informasjon"
        >
          <span className="material-symbols-outlined">info</span>
        </button>
      ) : (
        <div className="info-panel">
          <div className="info-header">
            <h2>Datakilder</h2>
            <button
              className="info-close"
              onClick={() => setIsOpen(false)}
              aria-label="Lukk"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="info-content">
            <section className="info-section">
              <h3>Kartdata</h3>
              <p>
                Topografiske kart fra{' '}
                <a
                  href="https://www.kartverket.no"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Kartverket
                </a>
              </p>
              <p className="info-detail">
                © Kartverket - CC BY 4.0 lisens
              </p>
            </section>

            <section className="info-section">
              <h3>Stedsnavn</h3>
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
                © Kartverket - CC BY 4.0 lisens
              </p>
            </section>

            <section className="info-section">
              <h3>Adressedata</h3>
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
                © Kartverket - CC BY 4.0 lisens
              </p>
            </section>

            <section className="info-section">
              <h3>Om Tråkke</h3>
              <p>
                Tråkke er en personvernvennlig kartapplikasjon for norsk natur.
                Ingen sporing, ingen analyser, alle data lagres lokalt på din enhet.
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
          </div>
        </div>
      )}
    </div>
  )
}

export default InfoPanel
