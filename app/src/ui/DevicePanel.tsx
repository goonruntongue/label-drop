// Dev-only: shows this machine's LAN URL + QR code so a phone on the same network can open the game.
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

const URLS: string[] = __LAN_URLS__;

export function DeviceButton() {
  const [open, setOpen] = useState(false);
  if (!import.meta.env.DEV) return null;
  return (
    <div className="device">
      <button type="button" className="btn btn-hint" aria-expanded={open} onClick={() => setOpen(!open)} title="同じWi-Fiのスマホで開く">
        📱 スマホで開く
      </button>
      {open && <DevicePopover onClose={() => setOpen(false)} />}
    </div>
  );
}

function DevicePopover({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [qr, setQr] = useState('');
  const url = URLS[index];

  useEffect(() => {
    if (!url) return;
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#050C1C', light: '#FFFFFF' } }).then(
      (data) => alive && setQr(data),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <div className="device-popover" role="dialog" aria-label="スマホで開く">
      <div className="device-head">
        <p className="kicker">SAME-LAN DEVICE TEST</p>
        <button type="button" className="btn-mini" aria-label="閉じる" onClick={onClose}>
          ×
        </button>
      </div>
      {url ? (
        <>
          <p className="device-lead">スマホをPCと同じWi-Fiにつなぎ、QRコードを読み取ってください。</p>
          {qr && <img className="device-qr" src={qr} alt={`${url} のQRコード`} width={220} height={220} />}
          <p className="device-url num">{url}</p>
          {URLS.length > 1 && (
            <label className="device-pick">
              ほかのネットワーク
              <select value={index} onChange={(e) => setIndex(Number(e.target.value))}>
                {URLS.map((u, i) => (
                  <option key={u} value={i}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="device-note">つながらないときは、Windows のファイアウォールで Node.js の「プライベートネットワーク」の通信を許可してください。</p>
        </>
      ) : (
        <p className="device-lead">ネットワークが見つかりません。PCがWi-Fi／LANにつながっているか確認してください。</p>
      )}
    </div>
  );
}
