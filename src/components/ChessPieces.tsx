import React, { useState, useEffect } from 'react';
import { PieceTheme } from '../types/chess';

interface PieceProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  className?: string;
  theme?: PieceTheme;
}

export const ChessPieceDefs: React.FC = () => (
  <svg className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
    <defs>
      {/* White Piece Gradients */}
      <linearGradient id="white-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="white-highlight-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="white-gold-accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>

      {/* Black Piece Gradients */}
      <linearGradient id="black-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#52525b" />
        <stop offset="45%" stopColor="#27272a" />
        <stop offset="100%" stopColor="#09090b" />
      </linearGradient>
      <linearGradient id="black-highlight-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#a1a1aa" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#27272a" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="black-silver-accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>

      {/* Drop Shadow Filter */}
      <filter id="piece-depth-shadow" x="-20%" y="-20%" width="150%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.45" />
      </filter>
    </defs>
  </svg>
);

export const ChessPiece: React.FC<PieceProps> = ({
  type,
  color,
  className = 'w-full h-full',
  theme = 'metal',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [theme, type, color]);

  if (theme !== 'classic' && !imgError) {
    const fileName = `${color}${type}.png`;
    return (
      <img
        src={`/pieces/${theme}/${fileName}`}
        alt={`${color}${type}`}
        className={`${className} object-contain pointer-events-none drop-shadow-md select-none transition-transform`}
        draggable={false}
        onError={() => setImgError(true)}
      />
    );
  }

  const isWhite = color === 'w';
  const bodyGrad = isWhite ? 'url(#white-body-grad)' : 'url(#black-body-grad)';
  const strokeColor = isWhite ? '#334155' : '#09090b';
  const accentColor = isWhite ? 'url(#white-gold-accent)' : 'url(#black-silver-accent)';
  const highlightGrad = isWhite ? 'url(#white-highlight-grad)' : 'url(#black-highlight-grad)';
  const innerStroke = isWhite ? '#ffffff' : '#71717a';

  switch (type) {
    case 'p': // Pawn
      return (
        <svg viewBox="0 0 45 45" className={className} filter="url(#piece-depth-shadow)">
          <g stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Base Pedestal */}
            <path
              d="M 10,40 C 13,38 32,38 35,40 L 37,42 L 8,42 Z"
              fill={bodyGrad}
            />
            <path d="M 12,38 C 15,36.5 30,36.5 33,38" fill="none" stroke={accentColor} strokeWidth="2" />

            {/* Body */}
            <path
              d="M 14,37 C 14,32 18,27 18.5,23 C 16.5,22.5 15.5,20.5 16.5,18.5 C 17.5,16.5 20,16.5 21,17 C 20.2,14.5 21,11 22.5,9 C 24,11 24.8,14.5 24,17 C 25,16.5 27.5,16.5 28.5,18.5 C 29.5,20.5 28.5,22.5 26.5,23 C 27,27 31,32 31,37 Z"
              fill={bodyGrad}
            />

            {/* Head Sphere */}
            <circle cx="22.5" cy="11.5" r="5" fill={bodyGrad} />
            <circle cx="21" cy="9.5" r="2.2" fill={highlightGrad} stroke="none" />

            {/* Collar Ring */}
            <ellipse cx="22.5" cy="17" rx="5.5" ry="1.5" fill={accentColor} />
            <path d="M 15.5,33 C 18,34.5 27,34.5 29.5,33" fill="none" stroke={innerStroke} strokeWidth="1" />
          </g>
        </svg>
      );

    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className={className} filter="url(#piece-depth-shadow)">
          <g stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M 9,41 L 36,41 L 37,43 L 8,43 Z" fill={bodyGrad} />
            <path d="M 10,38 L 35,38 L 36,41 L 9,41 Z" fill={bodyGrad} />
            <path d="M 11,38 L 34,38" fill="none" stroke={accentColor} strokeWidth="2" />

            {/* Tower Wall */}
            <path d="M 12.5,38 L 14,19 L 31,19 L 32.5,38 Z" fill={bodyGrad} />

            {/* Castle Ramparts */}
            <path
              d="M 11,19 L 11,9 L 16,9 L 16,13 L 20,13 L 20,9 L 25,9 L 25,13 L 29,13 L 29,9 L 34,9 L 34,19 Z"
              fill={bodyGrad}
            />

            {/* Decorative battlements and cornice */}
            <path d="M 10.5,19 L 34.5,19" fill="none" stroke={accentColor} strokeWidth="2" />
            <path d="M 15,24 L 30,24" fill="none" stroke={innerStroke} strokeWidth="0.9" />
            <path d="M 15,30 L 30,30" fill="none" stroke={innerStroke} strokeWidth="0.9" />

            {/* Arrow slits */}
            <path d="M 22.5,23 L 22.5,31" stroke={accentColor} strokeWidth="1.5" />
            <path d="M 20,27 L 25,27" stroke={accentColor} strokeWidth="1.5" />
          </g>
        </svg>
      );

    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className={className} filter="url(#piece-depth-shadow)">
          <g stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M 10,41 L 35,41 L 37,43 L 8,43 Z" fill={bodyGrad} />
            <path d="M 11,38 C 15,37 30,37 34,38 L 35,41 L 10,41 Z" fill={bodyGrad} />
            <path d="M 12,38 L 33,38" fill="none" stroke={accentColor} strokeWidth="2" />

            {/* Proud Steed Body & Mane */}
            <path
              d="M 13,38 C 13,31 16.5,29 17,25 C 13,26 9.5,23 9,18 C 8.5,14 11,12 14,11 C 15,10 16,8 18,7.5 C 19.5,7 21,8 21.5,9 C 23,8 26,8 28,10.5 C 31,14 36.5,17 37,28 C 37.5,33 34,38 34,38 Z"
              fill={bodyGrad}
            />

            {/* Flowing Mane Details */}
            <path
              d="M 21.5,9 C 23.5,13 28,15 28.5,20 M 26,11 C 28.5,16 33,18 33.5,24 M 29,13 C 32,18 36,22 36,29"
              fill="none"
              stroke={accentColor}
              strokeWidth="1.5"
            />

            {/* Fierce Eye & Nostril */}
            <circle cx="15.5" cy="14.5" r="1.5" fill={isWhite ? '#1e293b' : '#f8fafc'} />
            <circle cx="15" cy="14" r="0.5" fill="#ffffff" />
            <path d="M 11,17 C 12,18 13.5,18 14.5,17" fill="none" stroke={innerStroke} strokeWidth="1.2" />

            {/* Jaw and bridle accent */}
            <path d="M 18,22 C 20,24 23,24 25,21" fill="none" stroke={innerStroke} strokeWidth="1" />
          </g>
        </svg>
      );

    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className={className} filter="url(#piece-depth-shadow)">
          <g stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M 10,41 L 35,41 L 37,43 L 8,43 Z" fill={bodyGrad} />
            <path d="M 12,38 C 15,36.5 30,36.5 33,38 L 35,41 L 10,41 Z" fill={bodyGrad} />
            <path d="M 13,38 L 32,38" fill="none" stroke={accentColor} strokeWidth="2" />

            {/* Body */}
            <path
              d="M 14,37 C 14,32 17,29 18,25 C 16,24 15,22 15,19 C 15,12 18,7 22.5,7 C 27,7 30,12 30,19 C 30,22 29,24 27,25 C 28,29 31,32 31,37 Z"
              fill={bodyGrad}
            />

            {/* Mitre Slash (Cutout) */}
            <path d="M 23,12 L 29,17" stroke={isWhite ? '#1e293b' : '#f8fafc'} strokeWidth="1.8" />

            {/* Collar and Ribbons */}
            <ellipse cx="22.5" cy="25" rx="5.5" ry="1.5" fill={accentColor} />
            <path d="M 16,33 C 19,34.5 26,34.5 29,33" fill="none" stroke={innerStroke} strokeWidth="1" />

            {/* Cross on Head */}
            <path d="M 22.5,3.5 L 22.5,7" stroke={accentColor} strokeWidth="2" />
            <path d="M 21,5 L 24,5" stroke={accentColor} strokeWidth="1.8" />
            <circle cx="22.5" cy="4" r="1.5" fill={accentColor} stroke="none" />
          </g>
        </svg>
      );

    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className={className} filter="url(#piece-depth-shadow)">
          <g stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M 9,41 L 36,41 L 38,43 L 7,43 Z" fill={bodyGrad} />
            <path d="M 11,38 C 14,36.5 31,36.5 34,38 L 36,41 L 9,41 Z" fill={bodyGrad} />
            <path d="M 12,38 L 33,38" fill="none" stroke={accentColor} strokeWidth="2" />

            {/* Robe Body */}
            <path
              d="M 13,37 C 13,31 16,28 17,25 C 13,24 10,21 10,18 L 13.5,18 L 8,13 L 15,20 L 17.5,10 L 22.5,20 L 27.5,10 L 30,20 L 37,13 L 31.5,18 L 35,18 C 35,21 32,24 28,25 C 29,28 32,31 32,37 Z"
              fill={bodyGrad}
            />

            {/* Jewels on Crown Tips */}
            <circle cx="8" cy="12" r="1.8" fill={accentColor} />
            <circle cx="17.5" cy="9" r="1.8" fill={accentColor} />
            <circle cx="22.5" cy="7.5" r="2.2" fill={accentColor} />
            <circle cx="27.5" cy="9" r="1.8" fill={accentColor} />
            <circle cx="37" cy="12" r="1.8" fill={accentColor} />

            {/* Regal Corset & Belt */}
            <path d="M 16,25 C 19,26.5 26,26.5 29,25" fill="none" stroke={accentColor} strokeWidth="2" />
            <path d="M 15,32 C 18.5,34 26.5,34 30,32" fill="none" stroke={innerStroke} strokeWidth="1" />
          </g>
        </svg>
      );

    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className={className} filter="url(#piece-depth-shadow)">
          <g stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M 9,41 L 36,41 L 38,43 L 7,43 Z" fill={bodyGrad} />
            <path d="M 11,38 C 14,36.5 31,36.5 34,38 L 36,41 L 9,41 Z" fill={bodyGrad} />
            <path d="M 12,38 L 33,38" fill="none" stroke={accentColor} strokeWidth="2" />

            {/* Body */}
            <path
              d="M 13,37 C 13,31 16.5,28 17.5,25 C 14.5,24 13,22 13,19 C 13,14 17,11 22.5,11 C 28,11 32,14 32,19 C 32,22 30.5,24 27.5,25 C 28.5,28 32,31 32,37 Z"
              fill={bodyGrad}
            />

            {/* Royal Crown Arches */}
            <path
              d="M 15,19 C 15,14 22.5,14 22.5,19 M 22.5,19 C 22.5,14 30,14 30,19"
              fill="none"
              stroke={accentColor}
              strokeWidth="1.6"
            />

            {/* Royal Fleury Cross */}
            <g stroke={accentColor} strokeWidth="2" strokeLinecap="round">
              <path d="M 22.5,4 L 22.5,10" />
              <path d="M 19.5,6.5 L 25.5,6.5" />
            </g>
            <circle cx="22.5" cy="4" r="1.3" fill={accentColor} stroke="none" />

            {/* Waist and Hem Accents */}
            <path d="M 16,25 C 19.5,26.5 25.5,26.5 29,25" fill="none" stroke={accentColor} strokeWidth="2" />
            <path d="M 15,32 C 18.5,33.5 26.5,33.5 30,32" fill="none" stroke={innerStroke} strokeWidth="1" />
          </g>
        </svg>
      );
  }
};
