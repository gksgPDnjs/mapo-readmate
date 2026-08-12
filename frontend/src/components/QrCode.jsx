import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

function QrCode({ value, size = 160, onRender, className = '' }) {
  const canvasRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!value || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1 }, (renderError) => {
      if (renderError) {
        setError('QR 코드를 만들지 못했어요.')
        return
      }
      setError('')
      onRender?.(canvasRef.current.toDataURL('image/png'))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, size])

  if (error) {
    return <p className="qr-error">{error}</p>
  }

  return <canvas ref={canvasRef} className={`qr-canvas ${className}`} role="img" aria-label="결과 페이지 QR 코드" />
}

export default QrCode
