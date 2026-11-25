import React, { useState } from 'react';
import { Download, Smartphone, Check, Copy, X, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { amazeGoAudio } from '../game/amazeGoAudio';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isInstalled) {
    return null;
  }

  const currentUrl =
    typeof window !== 'undefined' ? window.location.origin : '';
  const isInIframe =
    typeof window !== 'undefined' && window.self !== window.top;

  const handleClick = async () => {
    amazeGoAudio.playClick();
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setShowGuide(true);
  };

  const handleCopyLink = async () => {
    amazeGoAudio.playClick();
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard blocked
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1d4ed8]/12 hover:bg-[#1d4ed8]/20 text-[#1d4ed8] border border-[#1d4ed8]/30 text-xs font-extrabold shadow-sm active:scale-95 transition-all"
        title="Install Brain Faster App"
        aria-label="Install App"
      >
        <Download className="w-4 h-4" />
        <span>{isInstallable ? 'Install Brain Faster App' : 'Install App on Phone / PC'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Install Brain Faster Guide"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="relative w-full max-w-sm bg-[#fbf6ea] text-[#5c4b37] rounded-3xl p-5 shadow-2xl border border-[#e0d2b8] text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#1d4ed8]" />
                <h3 className="text-lg font-black text-[#3f3122]">Install Brain Faster</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-xl bg-[#efe4ce] text-[#6b563c]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-medium leading-relaxed">
              {currentUrl && (
                <div className="p-3 rounded-2xl bg-white border border-[#e2d4ba] space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8c7a64]">
                    App Link (Chrome / Safari-তে খুলুন)
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-bold text-[#1d4ed8] break-all">
                      {currentUrl}
                    </code>
                    <button
                      onClick={handleCopyLink}
                      className="p-2 rounded-xl bg-[#efe4ce] text-[#5c4b37] hover:bg-[#e5d6b8] shrink-0 active:scale-95 transition-all"
                      aria-label="Copy App Link"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1d4ed8] text-white font-extrabold text-xs shadow-sm hover:bg-[#1e40af] active:scale-95 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isInIframe ? 'Open Full App in Chrome' : 'Open App Tab'}</span>
                  </a>
                </div>
              )}

              {isIOS ? (
                <div className="p-3 rounded-2xl bg-[#f3e9d3]">
                  <p className="font-bold text-[#3f3122] mb-1">iPhone / iPad (Safari):</p>
                  <p>
                    ১. উপরের <strong>Open Full App</strong> বাটন থেকে <strong>Safari</strong>-তে খুলুন।<br />
                    ২. Safari-এর নিচে <strong>Share (↑)</strong> → <strong>Add to Home Screen</strong> চাপুন।
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-[#f3e9d3]">
                  <p className="font-bold text-[#3f3122] mb-1">Android (Google Chrome):</p>
                  <p>
                    ১. AI Studio-র ভেতর থেকে সরাসরি ইনস্টল হয় না—উপরের <strong>Open Full App in Chrome</strong> বাটনে চাপুন (অথবা শেয়ার লিংক কপি করে <strong>Chrome</strong>-এ খুলুন)।<br />
                    ২. Chrome-এ ওপেন হলে <strong>Install Brain Faster App</strong> বাটন চাপুন, অথবা ডানদিকের <strong>⋮ মেনু → Add to Home screen → Install</strong> সিলেক্ট করুন।<br />
                    ৩. ইনস্টল হলে ফোনের হোম স্ক্রিনে আসল অ্যাপ আইকন চলে আসবে এবং পুরো গেম অফলাইনেও চলবে!
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full mt-4 py-3 rounded-2xl bg-[#6b563c] text-white font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              OK, Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
