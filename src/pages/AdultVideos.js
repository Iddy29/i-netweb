import { useState, useEffect, useCallback, useRef } from 'react';
import { adultVideosAPI } from '../services/api';
import AdultVideoPaymentModal from '../components/AdultVideoPaymentModal';
import {
  HiX, HiSearch, HiRefresh, HiPlay, HiLockClosed, HiLockOpen,
  HiEye, HiShieldExclamation, HiArrowsExpand,
} from 'react-icons/hi';

function formatPrice(price) {
  return `TZS ${Number(price || 0).toLocaleString()}`;
}

export default function AdultVideos() {
  const [verified, setVerified] = useState(() => localStorage.getItem('inet_18_verified') === 'true');
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [payVideo, setPayVideo] = useState(null);
  const [playerVideo, setPlayerVideo] = useState(null);
  const videoPlayerRef = useRef(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const [vidRes, catRes] = await Promise.allSettled([
        adultVideosAPI.getAll(activeCategory !== 'all' ? activeCategory : undefined),
        adultVideosAPI.getCategories(),
      ]);
      if (vidRes.status === 'fulfilled' && vidRes.value.data.success) {
        setVideos(vidRes.value.data.data);
      }
      if (catRes.status === 'fulfilled' && catRes.value.data.success) {
        setCategories(catRes.value.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (verified) fetchVideos();
  }, [fetchVideos, verified]);

  const handleVerify = () => {
    localStorage.setItem('inet_18_verified', 'true');
    setVerified(true);
  };

  const handleVideoClick = async (video) => {
    const isPaid = (video.price || 0) > 0;
    if (!isPaid || video.purchased) {
      openPlayer(video);
    } else {
      setPayVideo(video);
    }
  };

  const openPlayer = (video) => {
    setPlayerVideo(video);
    // Increment views
    adultVideosAPI.incrementViews(video._id).catch(() => {});
  };

  const closePlayer = () => {
    setPlayerVideo(null);
  };

  const handlePaySuccess = () => {
    setPayVideo(null);
    fetchVideos();
  };

  const toggleFullscreen = () => {
    const el = videoPlayerRef.current;
    if (el) {
      if (document.fullscreenElement) document.exitFullscreen();
      else el.requestFullscreen?.();
    }
  };

  const filtered = videos.filter((v) =>
    v.title?.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  // Age gate
  if (!verified) {
    return (
      <div className="av-gate">
        <div className="av-gate-card">
          <div className="av-gate-icon">
            <HiShieldExclamation size={48} />
          </div>
          <h2>Age Verification Required</h2>
          <p>This section contains adult content (18+). By continuing, you confirm that you are at least 18 years old and that viewing adult content is legal in your jurisdiction.</p>
          <div className="av-gate-actions">
            <button className="av-gate-btn confirm" onClick={handleVerify}>
              I am 18 or older — Enter
            </button>
            <button className="av-gate-btn cancel" onClick={() => window.history.back()}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="av-page">
      <div className="av-top">
        <h1>
          <span className="av-18-badge">18+</span>
          Premium Videos
        </h1>
        <button className="ch-refresh-btn" onClick={fetchVideos} title="Refresh">
          <HiRefresh size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="ch-search">
        <HiSearch className="ch-search-icon" />
        <input
          type="text"
          placeholder="Search videos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="ch-categories">
        <button
          className={`ch-cat-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`ch-cat-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="ch-loading">
          <div className="loader-spinner" />
          <p>Loading videos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ch-empty">
          <HiPlay size={48} />
          <p>No videos available</p>
        </div>
      ) : (
        <div className="av-grid">
          {filtered.map((video) => {
            const isPaid = (video.price || 0) > 0;
            const isLocked = isPaid && !video.purchased;
            return (
              <div
                key={video._id}
                className={`av-card ${isLocked ? 'locked' : ''}`}
                onClick={() => handleVideoClick(video)}
              >
                <div className="av-card-thumb">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} />
                  ) : (
                    <div className="av-card-placeholder"><HiPlay size={32} /></div>
                  )}
                  <div className="av-card-overlay">
                    {isLocked ? (
                      <div className="av-card-lock-icon"><HiLockClosed size={28} /></div>
                    ) : (
                      <div className="ch-card-play"><HiPlay size={24} /></div>
                    )}
                  </div>
                  {/* Price badge */}
                  {isPaid ? (
                    <div className={`av-price-badge ${video.purchased ? 'unlocked' : 'paid'}`}>
                      {video.purchased ? (
                        <><HiLockOpen size={12} /> UNLOCKED</>
                      ) : (
                        <><HiLockClosed size={12} /> {formatPrice(video.price)}</>
                      )}
                    </div>
                  ) : (
                    <div className="av-price-badge free">FREE</div>
                  )}
                  {/* Views */}
                  {video.views > 0 && (
                    <div className="av-views-badge">
                      <HiEye size={12} /> {video.views}
                    </div>
                  )}
                </div>
                <div className="av-card-body">
                  <h3>{video.title}</h3>
                  {video.category && <span className="ch-card-cat">{video.category}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {payVideo && (
        <AdultVideoPaymentModal
          video={payVideo}
          onClose={() => setPayVideo(null)}
          onSuccess={handlePaySuccess}
        />
      )}

      {/* Video Player Modal */}
      {playerVideo && (
        <div className="modal-overlay" onClick={closePlayer}>
          <div className="av-player-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ch-player-header">
              <div className="ch-player-info">
                <h3>{playerVideo.title}</h3>
                {playerVideo.category && <span className="ch-card-cat" style={{ marginLeft: 8 }}>{playerVideo.category}</span>}
              </div>
              <button className="modal-close-btn-sm" onClick={closePlayer}><HiX size={18} /></button>
            </div>
            <div className="ch-player-video-wrap" ref={videoPlayerRef}>
              <video
                className="ch-player-video"
                src={playerVideo.videoUrl}
                controls
                autoPlay
                playsInline
              />
              <div className="ch-player-controls">
                <button onClick={toggleFullscreen} title="Fullscreen">
                  <HiArrowsExpand size={20} />
                </button>
              </div>
            </div>
            {playerVideo.description && (
              <div className="ch-player-desc">
                <p>{playerVideo.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
