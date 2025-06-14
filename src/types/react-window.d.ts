declare module 'react-window' {
  import { ComponentType, CSSProperties } from 'react';

  export interface GridChildComponentProps {
    columnIndex: number;
    rowIndex: number;
    style: CSSProperties;
    data: any;
  }

  export interface FixedSizeGridProps {
    columnCount: number;
    columnWidth: number;
    rowCount: number;
    rowHeight: number;
    height: number;
    width: number;
    itemData?: any;
    className?: string;
    children: ComponentType<GridChildComponentProps>;
  }

  export const FixedSizeGrid: ComponentType<FixedSizeGridProps>;
} 