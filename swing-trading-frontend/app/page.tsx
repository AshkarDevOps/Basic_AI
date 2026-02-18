'use client';

import { useState, useEffect } from 'react';
import { Layout, Menu, message, Tag } from 'antd';
import { DashboardOutlined, StockOutlined, UnorderedListOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

import Dashboard from './components/Dashboard';
import Stocks from './components/Stocks';
import Watchlists from './components/Watchlists';
import Strategies from './components/Strategies';
import { api } from './lib/api';

const { Header, Sider, Content } = Layout;

export default function Home() {
  const [page, setPage] = useState('dashboard');
  const [stocks, setStocks] = useState<any[]>([]);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  const menuItems: MenuProps['items'] = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'stocks', icon: <StockOutlined />, label: 'Stocks' },
    { key: 'watchlists', icon: <UnorderedListOutlined />, label: 'Watchlists' },
    { key: 'strategies', icon: <ThunderboltOutlined />, label: 'Strategies' },
  ];

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [statsData, stocksData, watchlistsData, strategiesData] = await Promise.all([
        api.getStats(),
        api.getStocks(),
        api.getWatchlists(),
        api.getStrategies(),
      ]);
      
      setStats(statsData);
      setStocks(stocksData);
      setWatchlists(watchlistsData);
      setStrategies(strategiesData);
    } catch (error) {
      message.error('Failed to load data');
      console.error(error);
    }
  };

  const handleAddStock = async (stock: any) => {
    try {
      await api.addStock(stock);
      message.success('Stock added successfully!');
      fetchAll();
    } catch (error) {
      message.error('Failed to add stock');
      throw error;
    }
  };

  const handleDeleteStock = async (id: number, symbol: string) => {
    try {
      await api.deleteStock(id);
      message.success(`Stock ${symbol} deleted`);
      fetchAll();
    } catch (error) {
      message.error('Failed to delete stock');
      throw error;
    }
  };

  const handleCreateWatchlist = async (watchlist: any) => {
    try {
      await api.createWatchlist(watchlist);
      message.success('Watchlist created successfully!');
      fetchAll();
    } catch (error) {
      message.error('Failed to create watchlist');
      throw error;
    }
  };

  const handleUpdateWatchlist = async (id: number, watchlist: any) => {
    try {
      await api.updateWatchlist(id, watchlist);
      message.success('Watchlist updated successfully!');
      fetchAll();
    } catch (error) {
      message.error('Failed to update watchlist');
      throw error;
    }
  };

  const handleDeleteWatchlist = async (id: number, name: string) => {
    try {
      await api.deleteWatchlist(id);
      message.success(`Watchlist "${name}" deleted`);
      fetchAll();
    } catch (error) {
      message.error('Failed to delete watchlist');
      throw error;
    }
  };

  const handleManageStocks = async (watchlistId: number, stockIds: number[]) => {
    try {
      await api.addStocksToWatchlist(watchlistId, stockIds);
      message.success('Stocks updated in watchlist!');
      fetchAll();
    } catch (error) {
      message.error('Failed to update watchlist stocks');
      throw error;
    }
  };

  const handleExecuteStrategies = async (watchlistId: number, strategyIds: number[]) => {
    try {
      const result = await api.executeMultipleStrategies(watchlistId, strategyIds);
      const totalMatches = result.results?.filter((r: any) => r.total_matches > 0).length || 0;
      message.success(`Executed ${result.strategy_count} strategies! Found ${totalMatches} stocks with matches`);
      return result;
    } catch (error) {
      message.error('Failed to execute strategies');
      throw error;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={250}>
        <div style={{ color: '#1890ff', padding: 20, fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}>
          📈 Trading AI
        </div>
        <Menu 
          theme="dark" 
          selectedKeys={[page]} 
          onClick={({key}) => setPage(key)} 
          mode="inline" 
          items={menuItems} 
        />
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>AI Swing Trading Platform</h2>
          <Tag color="green">Backend Connected</Tag>
        </Header>

        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          {page === 'dashboard' && (
            <Dashboard stats={stats} onRefresh={fetchAll} />
          )}
          
          {page === 'stocks' && (
            <Stocks 
              stocks={stocks} 
              onRefresh={fetchAll}
              onAddStock={handleAddStock}
              onDeleteStock={handleDeleteStock}
            />
          )}
          
          {page === 'watchlists' && (
            <Watchlists
              watchlists={watchlists}
              stocks={stocks}
              onRefresh={fetchAll}
              onCreateWatchlist={handleCreateWatchlist}
              onUpdateWatchlist={handleUpdateWatchlist}
              onDeleteWatchlist={handleDeleteWatchlist}
              onManageStocks={handleManageStocks}
            />
          )}
          
          {page === 'strategies' && (
            <Strategies
              strategies={strategies}
              watchlists={watchlists}
              onExecuteStrategies={handleExecuteStrategies}
            />
          )}
        </Content>
      </Layout>
    </Layout>
  );
}