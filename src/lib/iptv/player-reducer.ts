/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ErrorKind } from './player-fallback.ts';
import { INITIAL_TELEMETRY, PlayerTelemetry } from './player-telemetry.ts';

export type PlayerState = 'idle' | 'checking' | 'loading' | 'playing' | 'error';

export interface PlayerEngineState {
  status: PlayerState;
  streamIndex: number;
  usingProxy: boolean;
  errorKind: ErrorKind | null;
  errorMessage: string | null;
  qualityLevels: { index: number; height: number; bitrate: number }[];
  currentLevelIndex: number;
  telemetry: PlayerTelemetry;
}

export type PlayerAction =
  | { type: 'START_LOADING'; streamIndex: number; usingProxy: boolean }
  | { type: 'SET_PLAYING' }
  | { type: 'SET_ERROR'; kind: ErrorKind; message: string }
  | { type: 'SET_LEVELS'; levels: { index: number; height: number; bitrate: number }[] }
  | { type: 'SET_CURRENT_LEVEL'; levelIndex: number }
  | { type: 'UPDATE_TELEMETRY'; telemetry: Partial<PlayerTelemetry> };

export const INITIAL_PLAYER_STATE: PlayerEngineState = {
  status: 'idle',
  streamIndex: 0,
  usingProxy: false,
  errorKind: null,
  errorMessage: null,
  qualityLevels: [],
  currentLevelIndex: -1,
  telemetry: INITIAL_TELEMETRY,
};

export function playerEngineReducer(
  state: PlayerEngineState,
  action: PlayerAction
): PlayerEngineState {
  switch (action.type) {
    case 'START_LOADING':
      return {
        ...state,
        status: 'loading',
        streamIndex: action.streamIndex,
        usingProxy: action.usingProxy,
        errorKind: null,
        errorMessage: null,
        telemetry: { ...INITIAL_TELEMETRY, isProxy: action.usingProxy },
      };
    case 'SET_PLAYING':
      return { ...state, status: 'playing', errorKind: null, errorMessage: null };
    case 'SET_ERROR':
      return { ...state, status: 'error', errorKind: action.kind, errorMessage: action.message };
    case 'SET_LEVELS':
      return { ...state, qualityLevels: action.levels };
    case 'SET_CURRENT_LEVEL':
      return { ...state, currentLevelIndex: action.levelIndex };
    case 'UPDATE_TELEMETRY':
      return { ...state, telemetry: { ...state.telemetry, ...action.telemetry } };
    default:
      return state;
  }
}
