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

  async addStock(stock: Record<string, any>) {
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
    return response.json();
  },

  // Watchlists
  async getWatchlists() {
    const response = await fetch(`${API_BASE_URL}/api/watchlists/?include_stocks=true`);
    return response.json();
  },

  async createWatchlist(watchlist: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/api/watchlists/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(watchlist),
    });
    return response.json();
  },

  async updateWatchlist(id: number, watchlist: Record<string, any>) {
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
    return response.json();
  },

  async addStocksToWatchlist(watchlistId: number, stockIds: number[]) {
    const response = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/stocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_ids: stockIds }),
    });
    return response.json();
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
