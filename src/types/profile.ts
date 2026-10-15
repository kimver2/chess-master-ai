export type PlayerProfileId = 'daegyeom' | 'mingyeom';

export interface PlayerProfile {
  id: PlayerProfileId;
  name: string;
  tagline: string;
  photoUrl: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
}
