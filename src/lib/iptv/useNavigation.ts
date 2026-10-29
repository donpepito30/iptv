/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useReducer } from 'react';

export type AppView = 'browse' | 'watch' | 'guide' | 'categories' | 'detail' | 'adult' | 'favorites';

export interface NavigationState {
  view: AppView;
  channelId: string | null;
  categoryId: string | null;
  isSearchOpen: boolean;
}

export type NavigationAction =
  | { type: 'GO_TO_VIEW'; view: AppView }
  | { type: 'WATCH_CHANNEL'; channelId: string; categoryId?: string | null }
  | { type: 'VIEW_DETAIL'; channelId: string }
  | { type: 'VIEW_CATEGORY'; categoryId: string | null }
  | { type: 'TOGGLE_SEARCH'; isOpen?: boolean };

function parseHash(): { view: AppView; channelId: string | null; categoryId: string | null } {
  if (typeof window === 'undefined') {
    return { view: 'browse', channelId: null, categoryId: null };
  }
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) {
    return { view: 'browse', channelId: null, categoryId: null };
  }

  const [key, value] = hash.split('=');
  if (key === 'watch' && value) {
    const parts = value.split('&cat=');
    const chId = decodeURIComponent(parts[0]);
    const catId = parts[1] ? decodeURIComponent(parts[1]) : null;
    return { view: 'watch', channelId: chId, categoryId: catId };
  }
  if (key === 'category' && value) {
    return { view: 'categories', channelId: null, categoryId: decodeURIComponent(value) };
  }
  if (key === 'guide') {
    return { view: 'guide', channelId: null, categoryId: null };
  }
  if (key === 'categories') {
    return { view: 'categories', channelId: null, categoryId: null };
  }
  if (key === 'adult') {
    return { view: 'adult', channelId: null, categoryId: null };
  }
  if (key === 'favorites') {
    return { view: 'favorites', channelId: null, categoryId: 'favorites' };
  }

  return { view: 'browse', channelId: null, categoryId: null };
}

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'GO_TO_VIEW':
      return {
        ...state,
        view: action.view,
        channelId: action.view === 'watch' ? state.channelId : null,
        categoryId: action.view === 'favorites' ? 'favorites' : state.categoryId,
      };

    case 'WATCH_CHANNEL':
      return {
        ...state,
        view: 'watch',
        channelId: action.channelId,
        categoryId: action.categoryId !== undefined ? action.categoryId : state.categoryId,
        isSearchOpen: false,
      };

    case 'VIEW_DETAIL':
      return {
        ...state,
        view: 'detail',
        channelId: action.channelId,
        isSearchOpen: false,
      };

    case 'VIEW_CATEGORY':
      return {
        ...state,
        view: 'categories',
        categoryId: action.categoryId,
        isSearchOpen: false,
      };

    case 'TOGGLE_SEARCH':
      return {
        ...state,
        isSearchOpen: action.isOpen !== undefined ? action.isOpen : !state.isSearchOpen,
      };

    default:
      return state;
  }
}

export function useNavigation() {
  const [state, dispatch] = useReducer(navigationReducer, undefined, () => {
    const fromHash = parseHash();
    return {
      view: fromHash.view,
      channelId: fromHash.channelId,
      categoryId: fromHash.categoryId,
      isSearchOpen: false,
    };
  });

  // Sync state to URL hash
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (state.view === 'watch' && state.channelId) {
      const targetHash = state.categoryId
        ? `#watch=${encodeURIComponent(state.channelId)}&cat=${encodeURIComponent(state.categoryId)}`
        : `#watch=${encodeURIComponent(state.channelId)}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
    } else if (state.view === 'categories' && state.categoryId) {
      const targetHash = `#category=${encodeURIComponent(state.categoryId)}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
    } else if (state.view === 'guide') {
      if (window.location.hash !== '#guide') {
        window.history.pushState(null, '', '#guide');
      }
    } else if (state.view === 'adult') {
      if (window.location.hash !== '#adult') {
        window.history.pushState(null, '', '#adult');
      }
    } else if (state.view === 'favorites') {
      if (window.location.hash !== '#favorites') {
        window.history.pushState(null, '', '#favorites');
      }
    } else if (state.view === 'browse') {
      if (window.location.hash && window.location.hash !== '#browse') {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [state.view, state.channelId, state.categoryId]);

  // Bidirectional sync: Listen for browser Back/Forward (popstate & hashchange)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const parsed = parseHash();
      if (parsed.view === 'watch' && parsed.channelId) {
        dispatch({ type: 'WATCH_CHANNEL', channelId: parsed.channelId, categoryId: parsed.categoryId });
      } else if (parsed.view === 'categories') {
        if (parsed.categoryId) {
          dispatch({ type: 'VIEW_CATEGORY', categoryId: parsed.categoryId });
        } else {
          dispatch({ type: 'GO_TO_VIEW', view: 'categories' });
        }
      } else if (parsed.view === 'guide') {
        dispatch({ type: 'GO_TO_VIEW', view: 'guide' });
      } else if (parsed.view === 'adult') {
        dispatch({ type: 'GO_TO_VIEW', view: 'adult' });
      } else if (parsed.view === 'favorites') {
        dispatch({ type: 'GO_TO_VIEW', view: 'favorites' });
      } else {
        dispatch({ type: 'GO_TO_VIEW', view: 'browse' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Global ⌘K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_SEARCH' });
      }
      if (e.key === 'Escape' && state.isSearchOpen) {
        dispatch({ type: 'TOGGLE_SEARCH', isOpen: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isSearchOpen]);

  const goToView = useCallback((view: AppView) => {
    dispatch({ type: 'GO_TO_VIEW', view });
  }, []);

  const watchChannel = useCallback((channelId: string, categoryId?: string | null) => {
    dispatch({ type: 'WATCH_CHANNEL', channelId, categoryId });
  }, []);

  const viewCategory = useCallback((categoryId: string | null) => {
    dispatch({ type: 'VIEW_CATEGORY', categoryId });
  }, []);

  const toggleSearch = useCallback((isOpen?: boolean) => {
    dispatch({ type: 'TOGGLE_SEARCH', isOpen });
  }, []);

  return {
    view: state.view,
    channelId: state.channelId,
    categoryId: state.categoryId,
    isSearchOpen: state.isSearchOpen,
    goToView,
    watchChannel,
    viewCategory,
    toggleSearch,
  };
}
