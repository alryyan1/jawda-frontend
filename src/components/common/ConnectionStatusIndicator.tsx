import React from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ 
  showText = true, 
  size = 'medium' 
}) => {
  const connectionStatus = useConnectionStatus();

  const getVariant = () => {
    if (connectionStatus.isConnected) return 'default';
    if (connectionStatus.state === 'connecting' || connectionStatus.state === 'reconnecting') return 'secondary';
    return 'destructive';
  };

  const getIcon = () => {
    if (connectionStatus.isConnected) {
      return <Wifi className="h-3 w-3" />;
    } else if (connectionStatus.state === 'connecting' || connectionStatus.state === 'reconnecting') {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    } else {
      return <WifiOff className="h-3 w-3" />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'text-xs px-1.5 py-0.5';
      case 'large': return 'text-sm px-3 py-1.5';
      default: return 'text-xs px-2 py-1';
    }
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={`flex items-center gap-1 ${getSizeClasses()}`}
      title={connectionStatus.details}
    >
      {getIcon()}
      {showText && (
        <span>
          {connectionStatus.isConnected ? 'Online' : 
           connectionStatus.state === 'connecting' ? 'Connecting' :
           connectionStatus.state === 'reconnecting' ? 'Reconnecting' : 'Offline'}
        </span>
      )}
    </Badge>
  );
}; 