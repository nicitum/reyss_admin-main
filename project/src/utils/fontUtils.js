// Font size management utility
export const initializeFontSize = () => {
  const savedFontSize = localStorage.getItem('panelFontSize') || 'medium';
  applyFontSize(savedFontSize);
  return savedFontSize;
};

export const applyFontSize = (size) => {
  const root = document.documentElement;
  const sizeMap = {
    'small': '14px',
    'medium': '16px',
    'large': '18px',
    'extra-large': '20px'
  };
  
  root.style.fontSize = sizeMap[size] || '16px';
  
  // Apply additional responsive scaling
  switch (size) {
    case 'small':
      root.style.setProperty('--text-xs', '10px');
      root.style.setProperty('--text-sm', '12px');
      root.style.setProperty('--text-base', '14px');
      root.style.setProperty('--text-lg', '16px');
      root.style.setProperty('--text-xl', '18px');
      root.style.setProperty('--text-2xl', '22px');
      root.style.setProperty('--text-3xl', '26px');
      break;
    case 'large':
      root.style.setProperty('--text-xs', '14px');
      root.style.setProperty('--text-sm', '16px');
      root.style.setProperty('--text-base', '18px');
      root.style.setProperty('--text-lg', '20px');
      root.style.setProperty('--text-xl', '22px');
      root.style.setProperty('--text-2xl', '26px');
      root.style.setProperty('--text-3xl', '30px');
      break;
    case 'extra-large':
      root.style.setProperty('--text-xs', '16px');
      root.style.setProperty('--text-sm', '18px');
      root.style.setProperty('--text-base', '20px');
      root.style.setProperty('--text-lg', '22px');
      root.style.setProperty('--text-xl', '24px');
      root.style.setProperty('--text-2xl', '28px');
      root.style.setProperty('--text-3xl', '32px');
      break;
    default: // medium
      root.style.setProperty('--text-xs', '12px');
      root.style.setProperty('--text-sm', '14px');
      root.style.setProperty('--text-base', '16px');
      root.style.setProperty('--text-lg', '18px');
      root.style.setProperty('--text-xl', '20px');
      root.style.setProperty('--text-2xl', '24px');
      root.style.setProperty('--text-3xl', '28px');
  }
};

export const getFontSizeOptions = () => [
  { value: 'small', label: 'Small', size: '14px', description: 'Compact view for more content' },
  { value: 'medium', label: 'Medium', size: '16px', description: 'Default comfortable reading' },
  { value: 'large', label: 'Large', size: '18px', description: 'Easier reading for larger screens' },
  { value: 'extra-large', label: 'Extra Large', size: '20px', description: 'Maximum readability' }
];