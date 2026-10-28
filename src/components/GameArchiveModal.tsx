import React, { useState } from 'react';
import {
  X,
  FileText,
  TrendingUp,
  Copy,
  Share2,
  Trash2,
  Check,
  Swords,
  Users,
  Smartphone,
  Download,
  Zap,
  Play,
  AlertCircle,
} from 'lucide-react';
import { ArchivedGame } from '../types/chess';

interface GameArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  archives: ArchivedGame[];
  onAnalyzeGame: (game: ArchivedGame) => void;
  onDeleteGame: (id: string) => void;
  onImportAndReview?: (rawText: string, perspective: 'w' | 'b') => string | null;
  onImportToBoard?: (rawText: string) => string | null;
}

export const GameArchiveModal: React.FC<GameArchiveModalProps> = ({
  isOpen,
  onClose,
  archives,
  onAnalyzeGame,
  onDeleteGame,
  onImportAndReview,
  onImportToBoard,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'ai' | 'pvp'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPerspective, setImportPerspective] = useState<'w' | 'b'>('w');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredList = archives.filter((g) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'ai') return g.mode === 'ai';
    return g.mode === 'pvp_online' || g.mode === 'pvp_local';
  });

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Fallback textarea copy
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  const handleShareGame = async (game: ArchivedGame) => {
    const summaryTitle = `[Chess Master AI] ${game.opponentName}전 (${
      game.result === 'win' ? '승리' : game.result === 'loss' ? '패배' : '무승부'
    }, ${game.moveCount}수)`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: summaryTitle,
          text: `${summaryTitle}\n\n${game.pgn}`,
        });
        return;
      } catch {
        // User cancelled or share unavailable -> fallback to copy
      }
    }
    handleCopyText(`${summaryTitle}\n\n${game.pgn}`, `share_${game.id}`);
  };

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}초`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  };

  const formatReason = (reason: ArchivedGame['reason']) => {
    switch (reason) {
      case 'checkmate':
        return '체크메이트';
      case 'timeout':
        return '시간 초과';
      case 'resignation':
        return '기권';
      case 'draw_agreement':
        return '합의 무승부';
      case 'stalemate':
        return '스테일메이트';
      case 'threefold_repetition':
        return '3회 동형반복';
      case 'insufficient_material':
        return '기물 부족';
      default:
        return '종료';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">내 기보 보관함</h2>
              <p className="text-[10px] text-zinc-400">최근 30경기가 자동 저장되며 언제든 복기·공유할 수 있습니다</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar + Import Toggle */}
        <div className="px-3 py-2 bg-zinc-950/50 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: `전체 (${archives.length})` },
              {
                id: 'ai',
                label: `AI 대국 (${archives.filter((g) => g.mode === 'ai').length})`,
              },
              {
                id: 'pvp',
                label: `1:1 대전 (${archives.filter((g) => g.mode !== 'ai').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as 'all' | 'ai' | 'pvp')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterMode === tab.id
                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                    : 'bg-zinc-850 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(onImportAndReview || onImportToBoard) ? (
            <button
              type="button"
              data-testid="toggle-import-pgn-btn"
              onClick={() => {
                setShowImportPanel((v) => !v);
                setImportError(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all ${
                showImportPanel
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-zinc-800 hover:bg-zinc-750 text-emerald-300 border-zinc-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>PGN·FEN 불러오기</span>
            </button>
          ) : (
            <span className="text-[10px] text-zinc-500 font-mono">최대 30개 보관</span>
          )}
        </div>

        {/* Expandable PGN / FEN Import Panel */}
        {showImportPanel && (
          <div
            data-testid="import-pgn-panel"
            className="p-3 bg-zinc-950/90 border-b border-emerald-500/30 space-y-2.5 shrink-0 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>외부 PGN 기보 또는 FEN 국면 불러오기</span>
              </div>
              <button
                type="button"
                data-testid="import-sample-btn"
                onClick={() => {
                  setImportText('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4');
                  setImportError(null);
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 font-semibold transition-colors"
              >
                샘플 기보 넣기
              </button>
            </div>

            <textarea
              data-testid="import-pgn-input"
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                if (importError) setImportError(null);
              }}
              rows={3}
              placeholder="Chess.com·Lichess PGN 기보(예: 1. e4 e5 2. Nf3 Nc6 ...) 또는 특정 국면의 FEN 문자열을 붙여넣으세요"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-700 focus:border-emerald-500 focus:outline-none px-3 py-2 text-xs text-zinc-100 font-mono placeholder:text-zinc-500 resize-none"
            />

            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-zinc-400">복기 기준 시점:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setImportPerspective('w')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                    importPerspective === 'w'
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  ♔ 백 시점
                </button>
                <button
                  type="button"
                  onClick={() => setImportPerspective('b')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                    importPerspective === 'b'
                      ? 'bg-zinc-700 text-white border border-zinc-500'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  ♚ 흑 시점
                </button>
              </div>
            </div>

            {importError && (
              <div
                data-testid="import-pgn-error"
                className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[11px] text-rose-300"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                <span>{importError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {onImportAndReview && (
                <button
                  type="button"
                  data-testid="import-review-btn"
                  onClick={() => {
                    const err = onImportAndReview(importText, importPerspective);
                    if (err) {
                      setImportError(err);
                    } else {
                      setImportText('');
                      setShowImportPanel(false);
                      onClose();
                    }
                  }}
                  className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>AI 코치 복기 분석</span>
                </button>
              )}

              {onImportToBoard && (
                <button
                  type="button"
                  data-testid="import-play-btn"
                  onClick={() => {
                    const err = onImportToBoard(importText);
                    if (err) {
                      setImportError(err);
                    } else {
                      setImportText('');
                      setShowImportPanel(false);
                      onClose();
                    }
                  }}
                  className="py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>이 국면 AI와 대국</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Archive List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredList.length === 0 ? (
            <div className="py-14 text-center space-y-2 text-zinc-500">
              <FileText className="w-10 h-10 mx-auto text-zinc-700" />
              <p className="text-sm font-bold text-zinc-300">아직 저장된 대국 기보가 없습니다.</p>
              <p className="text-xs text-zinc-500">
                AI 대국이나 1:1 대전을 완료하면 이곳에 기보(PGN)가 자동으로 기록됩니다.
              </p>
            </div>
          ) : (
            filteredList.map((game) => {
              const dateDisplay = game.date
                ? game.date.replace('T', ' ').substring(0, 16)
                : '';

              return (
                <div
                  key={game.id}
                  className="p-3 rounded-xl bg-zinc-850/70 border border-zinc-800 hover:border-zinc-700 space-y-2.5 transition-all"
                >
                  {/* Top Row: Result, Opponent, Date */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-black shrink-0 ${
                          game.result === 'win'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : game.result === 'loss'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-zinc-700/60 text-zinc-300 border border-zinc-600'
                        }`}
                      >
                        {game.result === 'win' ? '승리' : game.result === 'loss' ? '패배' : '무승부'}
                      </span>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          {game.mode === 'ai' ? (
                            <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : game.mode === 'pvp_online' ? (
                            <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span className="truncate">vs {game.opponentName}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span>내 진영: {game.playerColor === 'w' ? '백' : '흑'}</span>
                          <span>·</span>
                          <span>{formatReason(game.reason)}</span>
                          <span>·</span>
                          <span>{game.moveCount}수 ({formatDuration(game.durationSec)})</span>
                          {game.openingName && (
                            <>
                              <span>·</span>
                              <span className="text-amber-300/90 truncate max-w-[120px]">
                                {game.openingName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-zinc-500 font-mono">{dateDisplay}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteGame(game.id)}
                        className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                        title="기보 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Action Row: Review, Copy PGN, Copy FEN, Share */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-zinc-800/80">
                    <button
                      type="button"
                      data-testid="archive-review-btn"
                      disabled={game.moves.length === 0}
                      onClick={() => {
                        onClose();
                        onAnalyzeGame(game);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                      title={game.cachedReview ? '이미 분석된 기보 (0초 즉시 열기)' : 'Stockfish AI 코치 복기 분석'}
                    >
                      {game.cachedReview ? (
                        <>
                          <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                          <span>즉시복기</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          <span>복기</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyText(game.pgn, `pgn_${game.id}`)}
                      className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-[11px] font-semibold border border-zinc-700/70 flex items-center justify-center gap-1 transition-all"
                    >
                      {copiedKey === `pgn_${game.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-amber-400" />
                          <span>PGN</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyText(game.finalFen, `fen_${game.id}`)}
                      className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-[11px] font-semibold border border-zinc-700/70 flex items-center justify-center gap-1 transition-all"
                    >
                      {copiedKey === `fen_${game.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-sky-400" />
                          <span>FEN</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareGame(game)}
                      className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-[11px] font-semibold border border-zinc-700/70 flex items-center justify-center gap-1 transition-all"
                    >
                      {copiedKey === `share_${game.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3 h-3 text-purple-400" />
                          <span>공유</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/90 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
