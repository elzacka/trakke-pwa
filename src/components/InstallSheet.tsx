import { useState } from 'react'
import Sheet from './Sheet'
import '../styles/InstallSheet.css'

interface InstallSheetProps {
  isOpen: boolean
  onClose: () => void
  onInstall: () => Promise<boolean>
  canInstall: boolean
  platform: string
}

const InstallSheet = ({ isOpen, onClose, onInstall, canInstall, platform }: InstallSheetProps) => {
  const [installing, setInstalling] = useState(false)

  const handleInstall = async () => {
    setInstalling(true)
    const success = await onInstall()
    setInstalling(false)
    if (success) {
      onClose()
    }
  }

  const isIOS = platform === 'ios'

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={20}
      halfHeight={50}
      initialHeight="half"
    >
      <button className="sheet-close-button" onClick={onClose} aria-label="Lukk installer">
        <span className="material-symbols-outlined">close</span>
      </button>
      <div className="install-sheet">
        <div className="install-sheet-content">
          <div className="install-benefits">
            <p>Offline-tilgang</p>
            <p>Raskere lasting</p>
          </div>

          {canInstall && !isIOS && (
            <button
              className="install-button"
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? 'Installerer...' : 'Installer'}
            </button>
          )}

          {isIOS && (
            <div className="install-instructions-ios">
              <p>Trykk ... → Del → Legg til på Hjem-skjerm → Åpne som nettapp</p>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

export default InstallSheet
