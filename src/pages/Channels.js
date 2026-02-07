import { useState, useEffect, useCallback, useRef } from 'react';
import { videosAPI, subscriptionAPI } from '../services/api';
import SubscriptionModal from '../components/SubscriptionModal';
import Hls from 'hls.js';
import {
  HiX, HiSearch, HiRefresh, HiPlay, HiStatusOnline,
  HiArrowsExpand, HiVolumeUp, HiVolumeOff,
  HiGlobeAlt, HiNewspaper, HiFilm, HiMusicNote, HiAcademicCap,
  HiViewGrid,
} from 'react-icons/hi';
import { MdSportsSoccer, MdChildCare, MdTheaters } from 'react-icons/md';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.i-nettz.site/api';

/**
 * If the page is loaded over HTTPS but the stream URL is HTTP,
 * route through the backend proxy to avoid mixed-content blocking.
 */
function getProxiedUrl(streamUrl) {
  if (!streamUrl) return streamUrl;
  const isPageHttps = window.location.protocol === 'https:';
  const isStreamHttp = streamUrl.startsWith('http://');
  if (isPageHttps && isStreamHttp) {
    return `${API_BASE}/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
  }
  return streamUrl;
}

const CATEGORIES = [
  { key: 'all', label: 'All', icon: <HiViewGrid size={16} /> },
  { key: 'General', label: 'General', icon: <HiGlobeAlt size={16} /> },
  { key: 'Sports', label: 'Sports', icon: <MdSportsSoccer size={16} /> },
  { key: 'News', label: 'News', icon: <HiNewspaper size={16} /> },
  { key: 'Entertainment', label: 'Entertainment', icon: <MdTheaters size={16} /> },
  { key: 'Movies', label: 'Movies', icon: <HiFilm size={16} /> },
  { key: 'Music', label: 'Music', icon: <HiMusicNote size={16} /> },
  { key: 'Kids', label: 'Kids', icon: <MdChildCare size={16} /> },
  { key: 'Documentary', label: 'Documentary', icon: <HiAcademicCap size={16} /> },
];

const PRELOAD_DELAY = 30000;  // Start preloading standby at 30s
const SWAP_DELAY = 15000;     // Swap 15s after preload starts (at 45s total)

export default function Channels() {
  const [channels, setChannels] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [playerChannel, setPlayerChannel] = useState(null);
  const [playerError, setPlayerError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const pendingChannelRef = useRef(null);

  // --- Dual-frame refs ---
  const videoRefA = useRef(null);
  const videoRefB = useRef(null);
  const hlsRefA = useRef(null);
  const hlsRefB = useRef(null);
  const [activeFrame, setActiveFrame] = useState('A');
  const activeFrameRef = useRef('A');
  const standbyReadyRef = useRef(false);
  const currentChannelRef = useRef(null);

  // Timers
  const swapIntervalRef = useRef(null);
  const preloadTimeoutRef = useRef(null);

  // Keep ref in sync with state
  const setFrame = useCallback((frame) => {
    activeFrameRef.current = frame;
    setActiveFrame(frame);
  }, []);

  // --- Data fetching ---
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await videosAPI.getAll(activeCategory !== 'all' ? activeCategory : undefined);
      if (data.success) setChannels(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  const checkSubscription = useCallback(async () => {
    try {
      const { data } = await subscriptionAPI.getMySubscription();
      if (data.success || data.subscribed !== undefined) {
        setIsSubscribed(data.subscribed || data.data?.subscribed || false);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);
  useEffect(() => { checkSubscription(); }, [checkSubscription]);

  // --- HLS helpers ---
  const createHls = useCallback((videoEl, url, shouldPlay = true, muted = false) => {
    if (!videoEl) return null;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hls.loadSource(url);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.muted = muted;
        if (shouldPlay) videoEl.play().catch(() => {});
      });
      return hls;
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = url;
      videoEl.muted = muted;
      if (shouldPlay) {
        videoEl.addEventListener('loadedmetadata', () => videoEl.play(), { once: true });
      }
      return 'native';
    }
    return null;
  }, []);

  const destroyHlsInstance = useCallback((hlsRef) => {
    if (hlsRef.current && hlsRef.current !== 'native') {
      hlsRef.current.destroy();
    }
    hlsRef.current = null;
  }, []);

  const destroyAll = useCallback(() => {
    destroyHlsInstance(hlsRefA);
    destroyHlsInstance(hlsRefB);
    if (videoRefA.current) { videoRefA.current.pause(); videoRefA.current.src = ''; }
    if (videoRefB.current) { videoRefB.current.pause(); videoRefB.current.src = ''; }
  }, [destroyHlsInstance]);

  const clearAllTimers = useCallback(() => {
    if (swapIntervalRef.current) { clearInterval(swapIntervalRef.current); swapIntervalRef.current = null; }
    if (preloadTimeoutRef.current) { clearTimeout(preloadTimeoutRef.current); preloadTimeoutRef.current = null; }
  }, []);

  // --- Preload standby frame ---
  const preloadStandby = useCallback(() => {
    const channel = currentChannelRef.current;
    if (!channel) return;
    const frame = activeFrameRef.current;
    const standbyVideoRef = frame === 'A' ? videoRefB : videoRefA;
    const standbyHlsRef = frame === 'A' ? hlsRefB : hlsRefA;

    standbyReadyRef.current = false;

    // Destroy any old standby HLS
    destroyHlsInstance(standbyHlsRef);
    if (standbyVideoRef.current) {
      standbyVideoRef.current.pause();
      standbyVideoRef.current.src = '';
    }

    // Create new HLS on standby (muted, playing to buffer)
    const hls = createHls(standbyVideoRef.current, getProxiedUrl(channel.streamUrl), true, true);
    standbyHlsRef.current = hls;

    if (hls && hls !== 'native') {
      hls.on(Hls.Events.FRAG_LOADED, () => {
        standbyReadyRef.current = true;
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          standbyReadyRef.current = false;
        }
      });
    } else if (hls === 'native') {
      // For native HLS (Safari), mark ready after canplay
      standbyVideoRef.current?.addEventListener('canplay', () => {
        standbyReadyRef.current = true;
      }, { once: true });
    }
  }, [createHls, destroyHlsInstance]);

  // --- Swap frames ---
  const swapFrames = useCallback(() => {
    const channel = currentChannelRef.current;
    if (!channel) return;
    const frame = activeFrameRef.current;

    const standbyVideoRef = frame === 'A' ? videoRefB : videoRefA;
    const oldVideoRef = frame === 'A' ? videoRefA : videoRefB;
    const oldHlsRef = frame === 'A' ? hlsRefA : hlsRefB;
    const nextFrame = frame === 'A' ? 'B' : 'A';

    if (standbyReadyRef.current && standbyVideoRef.current) {
      // Unmute standby and ensure playing
      standbyVideoRef.current.muted = false;
      standbyVideoRef.current.play().catch(() => {});

      // Switch visible frame
      setFrame(nextFrame);

      // Destroy old frame after a brief delay (allows visual swap)
      setTimeout(() => {
        destroyHlsInstance(oldHlsRef);
        if (oldVideoRef.current) {
          oldVideoRef.current.pause();
          oldVideoRef.current.src = '';
        }
      }, 500);
    } else {
      // Standby not ready — reload on standby directly
      const standbyHlsRef = frame === 'A' ? hlsRefB : hlsRefA;
      destroyHlsInstance(standbyHlsRef);
      const hls = createHls(standbyVideoRef.current, getProxiedUrl(channel.streamUrl), true, false);
      if (frame === 'A') hlsRefB.current = hls;
      else hlsRefA.current = hls;

      setFrame(nextFrame);

      setTimeout(() => {
        destroyHlsInstance(oldHlsRef);
        if (oldVideoRef.current) {
          oldVideoRef.current.pause();
          oldVideoRef.current.src = '';
        }
      }, 500);
    }

    standbyReadyRef.current = false;
  }, [setFrame, createHls, destroyHlsInstance]);

  // --- Auto retry on error ---
  const autoRetry = useCallback(() => {
    if (standbyReadyRef.current) {
      swapFrames();
      return;
    }
    // Reload the active frame
    const channel = currentChannelRef.current;
    if (!channel) return;
    const frame = activeFrameRef.current;
    const activeVideoRef = frame === 'A' ? videoRefA : videoRefB;
    const activeHlsRef = frame === 'A' ? hlsRefA : hlsRefB;

    destroyHlsInstance(activeHlsRef);
    const hls = createHls(activeVideoRef.current, getProxiedUrl(channel.streamUrl), true, false);
    activeHlsRef.current = hls;

    if (hls && hls !== 'native') {
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else setPlayerError('Stream unavailable. Try again later.');
        }
      });
    }
  }, [swapFrames, createHls, destroyHlsInstance]);

  // --- Open player (dual-frame) ---
  const openPlayer = useCallback((channel) => {
    setPlayerChannel(channel);
    setPlayerError('');
    setIsBuffering(true);
    currentChannelRef.current = channel;
    standbyReadyRef.current = false;
    setFrame('A');

    // Small delay to allow DOM render
    setTimeout(() => {
      // Start Frame A
      destroyAll();
      const hlsA = createHls(videoRefA.current, getProxiedUrl(channel.streamUrl), true, false);
      hlsRefA.current = hlsA;

      if (hlsA && hlsA !== 'native') {
        hlsA.on(Hls.Events.FRAG_LOADED, () => setIsBuffering(false));
        hlsA.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (standbyReadyRef.current) { swapFrames(); return; }
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hlsA.startLoad();
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hlsA.recoverMediaError();
            else setPlayerError('Stream error. Try again.');
          }
        });
      } else if (hlsA === 'native') {
        videoRefA.current?.addEventListener('canplay', () => setIsBuffering(false), { once: true });
      } else {
        setPlayerError('HLS playback is not supported in this browser.');
        return;
      }

      // Also listen for ended/stalled on active video to trigger swap
      const handleEnded = () => {
        if (standbyReadyRef.current) swapFrames();
        else autoRetry();
      };
      const handleStalled = () => {
        if (standbyReadyRef.current) swapFrames();
      };
      videoRefA.current?.addEventListener('ended', handleEnded);
      videoRefA.current?.addEventListener('stalled', handleStalled);

      // Start the preload/swap cycle: preload at 30s, swap at 45s
      clearAllTimers();
      swapIntervalRef.current = setInterval(() => {
        preloadStandby();
        preloadTimeoutRef.current = setTimeout(() => {
          swapFrames();
        }, SWAP_DELAY);
      }, PRELOAD_DELAY);
    }, 150);
  }, [setFrame, destroyAll, createHls, clearAllTimers, preloadStandby, swapFrames, autoRetry]);

  // --- Close player ---
  const closePlayer = useCallback(() => {
    clearAllTimers();
    destroyAll();
    setPlayerChannel(null);
    setPlayerError('');
    setIsBuffering(false);
    currentChannelRef.current = null;
    standbyReadyRef.current = false;
    setFrame('A');
  }, [clearAllTimers, destroyAll, setFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      destroyAll();
    };
  }, [clearAllTimers, destroyAll]);

  const handleChannelClick = (channel) => {
    if (isSubscribed) {
      openPlayer(channel);
    } else {
      pendingChannelRef.current = channel;
      setShowSubModal(true);
    }
  };

  const handleSubSuccess = () => {
    setIsSubscribed(true);
    setShowSubModal(false);
    if (pendingChannelRef.current) {
      openPlayer(pendingChannelRef.current);
      pendingChannelRef.current = null;
    }
  };

  const toggleFullscreen = () => {
    const container = document.querySelector('.ch-player-video-wrap');
    if (container) {
      if (document.fullscreenElement) document.exitFullscreen();
      else container.requestFullscreen?.();
    }
  };

  // Apply mute to the active video element
  useEffect(() => {
    const activeVideo = activeFrame === 'A' ? videoRefA.current : videoRefB.current;
    if (activeVideo) activeVideo.muted = isMuted;
  }, [isMuted, activeFrame]);

  const filtered = channels.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="channels-page">
      <div className="ch-top">
        <h1><HiStatusOnline size={24} /> Live TV</h1>
        <button className="ch-refresh-btn" onClick={fetchChannels} title="Refresh">
          <HiRefresh size={18} />
        </button>
      </div>

      {/* Subscription banner */}
      {!isSubscribed && (
        <div className="ch-sub-banner" onClick={() => setShowSubModal(true)}>
          <div className="ch-sub-banner-text">
            <strong>Subscribe to unlock all channels</strong>
            <span>Get access to 100+ live TV channels</span>
          </div>
          <button className="ch-sub-banner-btn">Subscribe</button>
        </div>
      )}

      {/* Search */}
      <div className="ch-search">
        <HiSearch className="ch-search-icon" />
        <input
          type="text"
          placeholder="Search channels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="ch-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`ch-cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            <span className="ch-cat-icon">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Channels Grid */}
      {loading ? (
        <div className="ch-loading">
          <div className="loader-spinner" />
          <p>Loading channels...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ch-empty">
          <HiStatusOnline size={48} />
          <p>No channels available</p>
        </div>
      ) : (
        <div className="ch-grid">
          {filtered.map((channel) => (
            <div
              key={channel._id}
              className="ch-card"
              onClick={() => handleChannelClick(channel)}
            >
              <div className="ch-card-thumb">
                {channel.thumbnail ? (
                  <img src={channel.thumbnail} alt={channel.name} />
                ) : (
                  <div className="ch-card-placeholder">
                    <HiPlay size={32} />
                  </div>
                )}
                <div className="ch-card-overlay">
                  <div className="ch-card-play"><HiPlay size={24} /></div>
                </div>
                <div className="ch-card-live">
                  <span className="ch-live-dot" />
                  LIVE
                </div>
                {!isSubscribed && (
                  <div className="ch-card-lock">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="ch-card-body">
                <h3>{channel.name}</h3>
                {channel.category && (
                  <span className="ch-card-cat">{channel.category}</span>
                )}
                {channel.description && (
                  <p className="ch-card-desc">{channel.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscription Modal */}
      {showSubModal && (
        <SubscriptionModal
          onClose={() => { setShowSubModal(false); pendingChannelRef.current = null; }}
          onSuccess={handleSubSuccess}
        />
      )}

      {/* Dual-Frame Player Modal */}
      {playerChannel && (
        <div className="modal-overlay" onClick={closePlayer}>
          <div className="ch-player-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ch-player-header">
              <div className="ch-player-info">
                <span className="ch-player-live"><span className="ch-live-dot" /> LIVE</span>
                <h3>{playerChannel.name}</h3>
              </div>
              <button className="modal-close-btn-sm" onClick={closePlayer}><HiX size={18} /></button>
            </div>
            <div className="ch-player-video-wrap">
              {/* Frame A */}
              <video
                ref={videoRefA}
                className="ch-player-video ch-frame"
                style={{
                  zIndex: activeFrame === 'A' ? 2 : 1,
                  opacity: activeFrame === 'A' ? 1 : 0,
                }}
                playsInline
              />
              {/* Frame B */}
              <video
                ref={videoRefB}
                className="ch-player-video ch-frame"
                style={{
                  zIndex: activeFrame === 'B' ? 2 : 1,
                  opacity: activeFrame === 'B' ? 1 : 0,
                }}
                playsInline
              />

              {/* Buffering overlay */}
              {isBuffering && !playerError && (
                <div className="ch-player-buffering">
                  <div className="loader-spinner" />
                  <p>Loading stream...</p>
                </div>
              )}

              {/* Error overlay */}
              {playerError && (
                <div className="ch-player-error">
                  <p>{playerError}</p>
                  <button onClick={() => openPlayer(playerChannel)}>
                    <HiRefresh size={16} /> Retry
                  </button>
                </div>
              )}

              {/* Controls — always on top */}
              <div className="ch-player-controls" style={{ zIndex: 10 }}>
                <button onClick={() => setIsMuted(!isMuted)} title={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted ? <HiVolumeOff size={20} /> : <HiVolumeUp size={20} />}
                </button>
                <button onClick={toggleFullscreen} title="Fullscreen">
                  <HiArrowsExpand size={20} />
                </button>
              </div>
            </div>
            {playerChannel.description && (
              <div className="ch-player-desc">
                <p>{playerChannel.description}</p>
                {playerChannel.category && <span className="ch-card-cat">{playerChannel.category}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
