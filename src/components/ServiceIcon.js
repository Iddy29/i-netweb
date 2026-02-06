import {
  SiNetflix, SiSpotify,
} from 'react-icons/si';
import {
  HiGlobeAlt, HiChip, HiTrendingUp, HiWifi, HiStatusOnline, HiCube,
  HiPlay, HiSparkles, HiFilm, HiColorSwatch, HiLightningBolt,
} from 'react-icons/hi';

const ICON_MAP = {
  netflix: { Icon: SiNetflix, defaultColor: '#E50914' },
  chatgpt: { Icon: HiChip, defaultColor: '#10A37F' },
  spotify: { Icon: SiSpotify, defaultColor: '#1DB954' },
  tradingview: { Icon: HiTrendingUp, defaultColor: '#2962FF' },
  'data-bundle': { Icon: HiStatusOnline, defaultColor: '#8B5CF6' },
  disney: { Icon: HiFilm, defaultColor: '#113CCF' },
  midjourney: { Icon: HiColorSwatch, defaultColor: '#FF6F61' },
  'data-bundle-large': { Icon: HiLightningBolt, defaultColor: '#EC4899' },
  streaming: { Icon: HiPlay, defaultColor: '#06B6D4' },
  ai: { Icon: HiSparkles, defaultColor: '#10A37F' },
  trading: { Icon: HiTrendingUp, defaultColor: '#2962FF' },
  internet: { Icon: HiWifi, defaultColor: '#06B6D4' },
};

export default function ServiceIcon({ type, size = 24, color, iconImage }) {
  if (iconImage) {
    return (
      <img
        src={iconImage}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.2,
          objectFit: 'cover',
        }}
      />
    );
  }

  const entry = ICON_MAP[type] || { Icon: HiCube, defaultColor: '#64748B' };
  const IconComp = entry.Icon;
  return <IconComp size={size} color={color || entry.defaultColor} />;
}

export function CategoryIcon({ category, size = 16, color }) {
  const iconColor = color || '#0F172A';
  switch (category?.toLowerCase()) {
    case 'all':
      return <HiGlobeAlt size={size} color={iconColor} />;
    case 'streaming':
      return <HiPlay size={size} color={iconColor} />;
    case 'ai':
      return <HiSparkles size={size} color={iconColor} />;
    case 'trading':
      return <HiTrendingUp size={size} color={iconColor} />;
    case 'internet':
      return <HiWifi size={size} color={iconColor} />;
    default:
      return <HiCube size={size} color={iconColor} />;
  }
}
