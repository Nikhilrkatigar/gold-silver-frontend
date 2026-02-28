import React, { useCallback, useEffect, useRef, useState } from 'react';
import { itemAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiCamera, FiSearch, FiX } from 'react-icons/fi';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Item Scanner Component for Item Mode Billing
 * Supports camera QR scanning and manual item search.
 */
const ItemScanner = ({ onItemSelected, existingItems = [] }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const inputRef = useRef(null);
  const qrReaderId = 'item-qr-reader';
  const html5QrCodeRef = useRef(null);
  const decodeInProgressRef = useRef(false);
  const previewStyleTimerRef = useRef(null);

  const isItemAlreadyAdded = (itemId) => {
    return existingItems.some((item) => item._id === itemId || item._itemId === itemId);
  };

  const isObjectId = (value) => /^[a-f0-9]{24}$/i.test(value);

  const extractItemId = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!value) return null;

    if (isObjectId(value)) {
      return value;
    }

    try {
      const parsed = JSON.parse(value);
      const candidate = parsed?.item_id || parsed?.itemId || parsed?.id || parsed?._id;
      if (candidate && isObjectId(candidate)) {
        return candidate;
      }
    } catch (_) {
      // Ignore parse errors for non-JSON scans.
    }

    const embedded = value.match(/[a-f0-9]{24}/i);
    return embedded ? embedded[0] : null;
  };

  const handleResolvedItem = (item) => {
    if (!item) return false;

    if (item.status === 'sold') {
      setSearchResults([]);
      setScanInput('');
      toast.error('This item has already been sold');
      return true;
    }

    if (isItemAlreadyAdded(item._id)) {
      setScanInput('');
      toast.warning('Item already added to this invoice');
      return true;
    }

    onItemSelected(item);
    setScanInput('');
    setShowScanner(false);
    setSearchResults([]);
    toast.success('Item scanned successfully');
    return true;
  };

  const handleSearch = useCallback(async (value) => {
    setScanInput(value);

    if (!value.trim()) {
      setSearchResults([]);
      return false;
    }

    setScanning(true);
    try {
      const parsedItemId = extractItemId(value);

      try {
        const res = parsedItemId
          ? await itemAPI.getOne(parsedItemId)
          : await itemAPI.getByCode(value.toUpperCase());

        if (res.data.item && handleResolvedItem(res.data.item)) {
          return true;
        }
      } catch (primaryLookupError) {
        const responseStatus = primaryLookupError?.response?.status;
        const responseMessage = primaryLookupError?.response?.data?.message || '';

        if (responseStatus === 400 && responseMessage.toLowerCase().includes('already been sold')) {
          setScanInput('');
          toast.error('This item has already been sold');
          return true;
        }

        const itemsRes = await itemAPI.getAll({ status: 'available' });
        if (itemsRes.data.items) {
          const query = value.toLowerCase();
          const filtered = itemsRes.data.items.filter((item) =>
            item.name.toLowerCase().includes(query)
            || item.itemCode.toLowerCase().includes(query)
            || item._id.toLowerCase().includes(query)
          );

          setSearchResults(filtered.filter((item) => !isItemAlreadyAdded(item._id)));
        }
      }
      return false;
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error searching for items');
      return false;
    } finally {
      setScanning(false);
    }
  }, [existingItems, onItemSelected]);

  const stopCameraScanner = useCallback(async () => {
    const scanner = html5QrCodeRef.current;
    const readerEl = document.getElementById(qrReaderId);
    const videoEl = readerEl?.querySelector('video');
    const mediaStream = videoEl?.srcObject;

    if (previewStyleTimerRef.current) {
      clearInterval(previewStyleTimerRef.current);
      previewStyleTimerRef.current = null;
    }

    if (scanner) {
      try {
        await scanner.stop();
      } catch (_) {
        // Ignore stop errors when scanner is not running.
      }

      try {
        await scanner.clear();
      } catch (_) {
        // Ignore clear errors.
      }

      html5QrCodeRef.current = null;
    }

    // Fallback: force stop media tracks in case library stop fails silently.
    if (mediaStream && typeof mediaStream.getTracks === 'function') {
      mediaStream.getTracks().forEach((track) => track.stop());
      if (videoEl) {
        videoEl.srcObject = null;
      }
    }

    setCameraActive(false);
    setCameraStarting(false);
  }, [qrReaderId]);

  const startCameraScanner = useCallback(async () => {
    if (cameraActive || cameraStarting) {
      return;
    }

    setCameraError('');
    setCameraStarting(true);

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (_) {
          // Ignore stop errors when scanner is not running.
        }

        try {
          await html5QrCodeRef.current.clear();
        } catch (_) {
          // Ignore clear errors.
        }

        html5QrCodeRef.current = null;
      }

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        toast.error('No camera found on this device');
        setCameraStarting(false);
        return;
      }

      const scanner = new Html5Qrcode(qrReaderId);
      html5QrCodeRef.current = scanner;

      const onDecode = async (decodedText) => {
        if (decodeInProgressRef.current) {
          return;
        }

        decodeInProgressRef.current = true;
        try {
          const wasResolved = await handleSearch(decodedText);
          if (wasResolved) {
            await stopCameraScanner();
          }
        } finally {
          decodeInProgressRef.current = false;
        }
      };

      const config = {
        fps: 10,
        disableFlip: false
      };

      try {
        await scanner.start({ facingMode: 'environment' }, config, onDecode, () => {});
      } catch (_) {
        // Fallback for browsers/devices that don't support facingMode constraint.
        await scanner.start(cameras[0].id, config, onDecode, () => {});
      }

      setCameraActive(true);
      setCameraStarting(false);
    } catch (error) {
      console.error('Camera scan start failed:', error);
      const message = error?.message?.toLowerCase?.() || '';
      if (message.includes('permission')) {
        setCameraError('Camera permission denied. Allow camera access and try again.');
      } else if (message.includes('secure context')) {
        setCameraError('Camera needs HTTPS or localhost.');
      } else {
        setCameraError('Unable to start camera scanner.');
      }
      toast.error('Unable to start camera scanner');
      await stopCameraScanner();
    }
  }, [cameraActive, cameraStarting, handleSearch, stopCameraScanner]);

  useEffect(() => {
    if (!showScanner) {
      setCameraError('');
      void stopCameraScanner();
    }
  }, [showScanner, stopCameraScanner]);

  useEffect(() => {
    if (!cameraActive) {
      return;
    }

    const readerEl = document.getElementById(qrReaderId);
    if (!readerEl) return;

    // Style the container div
    readerEl.style.width = '100%';
    readerEl.style.height = '100%';
    readerEl.style.position = 'absolute';
    readerEl.style.inset = '0';

    // Wait for html5-qrcode elements, then force consistent sizing and remove dark overlay.
    previewStyleTimerRef.current = setInterval(() => {
      const shadedRegion = readerEl.querySelector('#qr-shaded-region');
      if (shadedRegion) {
        shadedRegion.style.display = 'none';
      }

      const scanRegion = readerEl.querySelector('#qr-code-full-region');
      if (scanRegion) {
        scanRegion.style.border = 'none';
      }

      const videoEl = readerEl.querySelector('video');
      if (videoEl) {
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        videoEl.style.display = 'block';
      }

      const canvasEl = readerEl.querySelector('canvas');
      if (canvasEl) {
        canvasEl.style.width = '100%';
        canvasEl.style.height = '100%';
      }
    }, 120);

    return () => {
      if (previewStyleTimerRef.current) {
        clearInterval(previewStyleTimerRef.current);
        previewStyleTimerRef.current = null;
      }
    };
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      void stopCameraScanner();
    };
  }, [stopCameraScanner]);

  const handleSelectItem = (item) => {
    handleResolvedItem(item);
  };

  return (
    <div style={{ position: 'relative', marginBottom: '1.5rem', width: '100%' }}>
      {showScanner && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Scan Item QR Code</h3>
            <button
              type="button"
              onClick={() => {
                setShowScanner(false);
                void stopCameraScanner();
              }}
              className="btn"
              style={{ padding: '0.25rem 0.5rem' }}
            >
              <FiX />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={startCameraScanner}
              disabled={cameraActive || cameraStarting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FiCamera /> {cameraStarting ? 'Starting Camera...' : 'Use Camera'}
            </button>
            {cameraActive && (
              <button
                type="button"
                className="btn"
                onClick={() => { void stopCameraScanner(); }}
              >
                Stop Camera
              </button>
            )}
          </div>

          <div
            style={{
              width: '100%',
              maxWidth: '360px',
              aspectRatio: '1',
              borderRadius: '10px',
              border: '2px solid var(--border-color)',
              overflow: 'hidden',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              marginLeft: 'auto',
              marginRight: 'auto',
              position: 'relative'
            }}
          >
            <div
              id={qrReaderId}
              style={{
                width: '100%',
                height: '100%',
                display: cameraActive || cameraStarting ? 'block' : 'none',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            />
            {!cameraActive && !cameraStarting && (
              <span style={{ fontSize: '0.85rem', color: '#999', textAlign: 'center', padding: '0.75rem', position: 'relative', zIndex: 1 }}>
                Camera preview will appear here
              </span>
            )}
          </div>

          {cameraError && (
            <div style={{ marginBottom: '0.75rem', color: 'var(--color-danger)' }}>
              {cameraError}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label className="input-label">Scan QR Code or Search Item</label>
            <input
              ref={inputRef}
              type="text"
              className="input"
              placeholder="Scan item QR or type item id/code..."
              value={scanInput}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowScanner(false);
                  setScanInput('');
                }
              }}
            />
          </div>

          {searchResults.length > 0 && (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.map((item) => (
                <div
                  key={item._id}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div>Code: {item.itemCode} | Metal: {item.metal} | Purity: {item.purity}</div>
                    <div>Gross: {item.grossWeight}g | Net: {item.netWeight}g</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {scanInput && searchResults.length === 0 && !scanning && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}
            >
              No items found matching "{scanInput}"
            </div>
          )}

          {scanning && (
            <div
              style={{
                padding: '1rem',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}
            >
              <span className="loading" style={{ marginRight: '0.5rem' }}></span>
              Searching...
            </div>
          )}

          <small style={{ display: 'block', marginTop: '1rem', color: 'var(--text-secondary)' }}>
            Tip: Use camera scan or type item id/code. Sold items cannot be added.
          </small>
        </div>
      )}

      {!showScanner && (
        <button
          type="button"
          onClick={() => {
            setShowScanner(true);
            setTimeout(() => {
              inputRef.current?.focus();
              void startCameraScanner();
            }, 120);
          }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
        >
          <FiSearch /> Scan Item QR Code
        </button>
      )}
    </div>
  );
};

export default ItemScanner;
