import React from 'react';
import { Utensils } from 'lucide-react';

interface AppIconProps {
  iconUrl?: string | null;
  alt?: string;
  className?: string;
  fallbackIcon?: React.ComponentType<{ className?: string }>;
}

const AppIcon: React.FC<AppIconProps> = ({ 
  iconUrl, 
  alt = "App Icon", 
  className = "h-6 w-6", 
  fallbackIcon: FallbackIcon = Utensils 
}) => {
  const [imageError, setImageError] = React.useState(false);

  if (!iconUrl || imageError) {
    return <FallbackIcon className={`${className} text-primary`} />;
  }

  return (
    <img 
      src={iconUrl} 
      alt={alt} 
      className={`${className} object-contain`}
      onError={() => setImageError(true)}
    />
  );
};

export default AppIcon; 