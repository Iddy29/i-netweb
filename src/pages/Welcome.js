import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiArrowRight } from 'react-icons/hi';

export default function Welcome() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="page-loader"><div className="loader-spinner" /><p>Loading...</p></div>;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  return (
    <div className="welcome-page">
      {/* Animated background nodes */}
      <div className="welcome-bg-nodes">
        <div className="node node-1" />
        <div className="node node-2" />
        <div className="node node-3" />
        <div className="node node-4" />
        <div className="node node-5" />
        {/* Connection lines */}
        <div className="node-line line-1" />
        <div className="node-line line-2" />
        <div className="node-line line-3" />
        {/* Glow orbs */}
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
      </div>

      {/* Content */}
      <div className="welcome-inner">
        {/* Logo */}
        <div className="wl-logo anim-fade-down">
          <span className="wl-logo-i">i</span>
          <span className="wl-logo-net">-net</span>
        </div>

        {/* Text */}
        <div className="wl-text anim-fade-down anim-d1">
          <h1>Welcome to i-net.</h1>
          <h2>Your Premium<br />Digital Marketplace.</h2>
          <p>Access exclusive bundles, accounts,<br />and services instantly.</p>
        </div>

        {/* CTA */}
        <div className="wl-cta anim-fade-down anim-d2">
          <Link to="/register" className="wl-btn-primary">
            Get Started <HiArrowRight size={20} />
          </Link>
          <Link to="/login" className="wl-btn-secondary">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
