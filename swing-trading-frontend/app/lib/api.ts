// API utility functions for backend communication

const API_BASE_URL = 'http://localhost:8000';

export const api = {
  // Stats
  async getStats() {
    const response = await fetch(`${API_BASE_URL}/api/stats`);
    return response.json();
  },

  // Stocks
  async getStocks() {
    const response = await fetch(`${API_BASE_URL}/api/stocks/`);
    return response.json();
  },

  async addStock(stock: any) {
    const response = await fetch(`${API_BASE_URL}/api/stocks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stock),
    });
    return response.json();
  },

  async deleteStock(id: number) {
    const response = await fetch(`${API_BASE_URL}/api/stocks/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete stock');
    }

    // 204 No Content - no body to parse
    return;
  },

  // Watchlists
  async getWatchlists() {
    const response = await fetch(`${API_BASE_URL}/api/watchlists/?include_stocks=true`);
    return response.json();
  },

  async createWatchlist(watchlist: any) {
    const response = await fetch(`${API_BASE_URL}/api/watchlists/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(watchlist),
    });
    return response.json();
  },

  async updateWatchlist(id: number, watchlist: any) {
    const response = await fetch(`${API_BASE_URL}/api/watchlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(watchlist),
    });
    return response.json();
  },

  async deleteWatchlist(id: number) {
    const response = await fetch(`${API_BASE_URL}/api/watchlists/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete watchlist');
    }

    // 204 No Content - no body to parse
    return;
  },

  async addStocksToWatchlist(watchlistId: number, stockIds: number[]) {
    const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/stocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_ids: stockIds }),
    });
    return response.json();
  },

  async removeStockFromWatchlist(watchlistId: number, stockId: number) {
    const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/stocks/${stockId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove stock from watchlist');
    }

    // 204 No Content - no body to parse
    return;
  },

  // Strategies
  async getStrategies() {
    const response = await fetch(`${API_BASE_URL}/api/strategies/`);
    return response.json();
  },

  async executeMultipleStrategies(watchlistId: number, strategyIds: number[]) {
    const response = await fetch(`${API_BASE_URL}/api/strategies/execute-multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        watchlist_id: watchlistId,
        strategy_ids: strategyIds,
        save_results: true,
      }),
    });
    return response.json();
  },
};