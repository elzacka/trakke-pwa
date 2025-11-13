import { useState } from 'react'
import BottomSheet from './BottomSheet'
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
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      peekHeight={40}
      halfHeight={60}
      initialHeight="peek"
    >
      <div className="install-sheet">
        <div className="install-sheet-header">
          <h2>Installer</h2>
          <button
            className="install-sheet-close"
            onClick={onClose}
            aria-label="Lukk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="install-sheet-content">
          <div className="install-benefits">
            <p>Offline-tilgang</p>
            <p>Raskere lasting</p>
            <p>Ingen sporing</p>
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
              <p>Trykk Del → Legg til på Hjem-skjerm</p>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

export default InstallSheet
