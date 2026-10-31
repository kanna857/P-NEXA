export const NEXUS_THEME = {
  colors: {
    bgVoid: '#07090e',
    bgCard: '#0f141c',
    bgCardHover: '#161d2a',
    borderNeon: '#00f0ff33',
    cyanNeon: '#00f0ff',
    greenMatrix: '#00ff66',
    amberWarning: '#ffb800',
    redAlert: '#ff003c',
    purplePsionic: '#bf00ff'
  }
};

export interface CyberCardProps {
  title: string;
  badge?: string;
  variant?: 'cyan' | 'matrix' | 'amber' | 'alert';
}

