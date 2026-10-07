import React from 'react';
import { cn } from '@/lib/utils';

// 5x7 dot matrix patterns for characters (each row is a 5-bit number)
const MATRIX_FONT: Record<string, number[]> = {
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x18, 0x10, 0x1f],
  '3': [0x1f, 0x01, 0x02, 0x0e, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ':': [0x00, 0x04, 0x04, 0x00, 0x04, 0x04, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x04],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  '+': [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  '-': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  '/': [0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  'd': [0x01, 0x01, 0x0d, 0x13, 0x11, 0x13, 0x0d],
  'h': [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x11],
  'm': [0x00, 0x00, 0x1a, 0x15, 0x15, 0x11, 0x11],
};

interface DotMatrixNumberProps {
  value: string | number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  dotColor?: string;
  inactiveDotColor?: string;
  showInactive?: boolean;
  className?: string;
}

export function DotMatrixNumber({
  value,
  size = 'md',
  dotColor = 'currentColor',
  inactiveDotColor = 'currentColor',
  showInactive = false,
  className,
}: DotMatrixNumberProps) {
  const str = String(value);

  // Determine dot size and spacing
  const sizeConfig = {
    xs: { dotRadius: 1.0, gap: 3.2, charGap: 4, height: 26 },
    sm: { dotRadius: 1.3, gap: 3.8, charGap: 5, height: 32 },
    md: { dotRadius: 1.7, gap: 4.8, charGap: 6, height: 40 },
    lg: { dotRadius: 2.2, gap: 6.2, charGap: 8, height: 52 },
    xl: { dotRadius: 2.8, gap: 7.8, charGap: 10, height: 66 },
    '2xl': { dotRadius: 3.4, gap: 9.6, charGap: 12, height: 82 },
    '3xl': { dotRadius: 4.2, gap: 11.8, charGap: 15, height: 100 },
  }[size];

  const { dotRadius, gap, charGap, height } = sizeConfig;
  const charWidth = 4 * gap + dotRadius * 2;
  const totalWidth = str.length * charWidth + (str.length - 1) * charGap;

  return (
    <svg
      width={totalWidth}
      height={height}
      viewBox={`0 0 ${totalWidth} ${height}`}
      className={cn('inline-block select-none overflow-visible', className)}
    >
      {str.split('').map((char, charIdx) => {
        const pattern = MATRIX_FONT[char] || MATRIX_FONT[' '];
        const charOffsetX = charIdx * (charWidth + charGap);

        return (
          <g key={charIdx} transform={`translate(${charOffsetX}, ${(height - (6 * gap + dotRadius * 2)) / 2})`}>
            {pattern.map((rowBits, rowIdx) => {
              const y = rowIdx * gap + dotRadius;
              return [4, 3, 2, 1, 0].map((bitPos, colIdx) => {
                const isActive = (rowBits & (1 << bitPos)) !== 0;
                const x = colIdx * gap + dotRadius;

                if (!isActive && !showInactive) return null;

                return (
                  <circle
                    key={`${rowIdx}-${colIdx}`}
                    cx={x}
                    cy={y}
                    r={dotRadius}
                    fill={isActive ? dotColor : inactiveDotColor}
                    opacity={isActive ? 1 : 0.08}
                    className="transition-all duration-300"
                  />
                );
              });
            })}
          </g>
        );
      })}
    </svg>
  );
}
