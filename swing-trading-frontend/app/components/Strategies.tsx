'use client';

import { useState } from 'react';
import {
  Card, Button, Modal, Form, Select, Table, Tag, Row, Col, Alert, Spin,
  Upload, message as antMessage, Popconfirm, Space, Tooltip, Tabs, Input,
  Checkbox
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, DownloadOutlined, DeleteOutlined,
  FileTextOutlined, SyncOutlined, ThunderboltOutlined,
  PlusOutlined, SaveOutlined, EditOutlined
} from '@ant-design/icons';

interface StrategiesProps {
  strategies: any[];
  watchlists: any[];
  onExecuteStrategies: (watchlistId: number, strategyIds: number[]) => Promise<any>;
  onRefresh: () => void;
}

export default function Strategies({
  strategies = [],
  watchlists = [],
  onExecuteStrategies,
  onRefresh
}: StrategiesProps) {
  const [executeModal, setExecuteModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [createWatchlistModal, setCreateWatchlistModal] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanAbortController, setScanAbortController] = useState<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);

  const [executeForm] = Form.useForm();
  const [watchlistForm] = Form.useForm();

  // Execute strategies
  const handleExecute = async (values: any) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedStocks([]);

    try {
      const result = await onExecuteStrategies(values.watchlist_id, values.strategy_ids);
      setResults(result);
      setExecuteModal(false);
      executeForm.resetFields();
    } catch (err: any) {
      setError(err.message || 'Failed to execute strategies');
      console.error('Execution failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Upload strategy file
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/strategies/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const result = await response.json();
      antMessage.success(result.message);
      setUploadModal(false);
      onRefresh();
    } catch (error: any) {
      antMessage.error(error.message || 'Failed to upload strategy');
    } finally {
      setUploading(false);
    }

    return false;
  };

  // Scan for strategies
  const handleScan = async () => {
    if (scanning) {
      console.log('⚠️ Scan already in progress');
      return;
    }

    if (scanAbortController) {
      scanAbortController.abort();
    }

    const controller = new AbortController();
    setScanAbortController(controller);

    setScanning(true);
    setError(null);
    antMessage.destroy();

    try {
      const response = await fetch('http://localhost:8000/api/strategies/scan', {
        method: 'POST',
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = 'Scan failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Use default
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Scan successful:', result);

      antMessage.success({
        content: `Scanned ${result.scanned} files. Added: ${result.added.length}, Updated: ${result.updated.length}`,
        duration: 4,
        key: 'scan-success',
      });

      try {
        onRefresh?.();
      } catch (refreshError) {
        console.error('⚠️ Refresh failed:', refreshError);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 Scan aborted');
        return;
      }

      console.error('❌ Scan error:', error);
      antMessage.error({
        content: error.message || 'Failed to scan strategies',
        duration: 5,
        key: 'scan-error',
      });

    } finally {
      setScanning(false);
      setScanAbortController(null);
    }
  };

  // Download strategy
  const handleDownload = async (strategyId: number, filename: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/strategies/download/${strategyId}`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      antMessage.success('Strategy downloaded');
    } catch (error) {
      antMessage.error('Failed to download strategy');
    }
  };

  // Delete strategy
  const handleDelete = async (strategyId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/strategies/${strategyId}?delete_file=false`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      antMessage.success('Strategy deleted');
      onRefresh();
    } catch (error) {
      antMessage.error('Failed to delete strategy');
    }
  };

  // Create watchlist from selected stocks
  const handleCreateWatchlistFromResults = () => {
    if (!results || !results.results) {
      antMessage.warning('No results available');
      return;
    }

    if (selectedStocks.length === 0) {
      const matchedStocks = results.results
        .filter((r: any) => r.total_matches > 0)
        .map((r: any) => r.symbol);

      if (matchedStocks.length === 0) {
        antMessage.warning('No matched stocks to add to watchlist');
        return;
      }

      setSelectedStocks(matchedStocks);

      antMessage.info({
        content: `Auto-selected all ${matchedStocks.length} matched stocks. You can adjust selection in the modal.`,
        duration: 3,
        key: 'auto-select-info'
      });

      setCreateWatchlistModal(true);

      const strategyNames = Object.values(results.strategies || {})
        .map((s: any) => s.name)
        .join(', ');

      watchlistForm.setFieldsValue({
        name: `Strategy Results - ${new Date().toLocaleDateString()}`,
        description: `Created from strategies: ${strategyNames}. ${matchedStocks.length} matched stocks.`
      });
    } else {
      setCreateWatchlistModal(true);

      const strategyNames = Object.values(results.strategies || {})
        .map((s: any) => s.name)
        .join(', ');

      watchlistForm.setFieldsValue({
        name: `Strategy Results - ${new Date().toLocaleDateString()}`,
        description: `Created from strategies: ${strategyNames}. ${selectedStocks.length} selected stocks.`
      });
    }
  };

  // Ensure stocks exist in database before creating watchlist
  const ensureStocksExist = async (symbols: string[]) => {
    try {
      console.log('📝 Ensuring stocks exist:', symbols);

      const stocksResponse = await fetch('http://localhost:8000/api/stocks/');
      if (!stocksResponse.ok) throw new Error('Failed to fetch stocks');

      const allStocks = await stocksResponse.json();

      const missingStocks = symbols.filter(symbol =>
        !allStocks.some((s: any) => s.symbol === symbol)
      );

      if (missingStocks.length > 0) {
        console.log(`📊 Adding ${missingStocks.length} missing stocks to database...`);

        for (const symbol of missingStocks) {
          try {
            const addResponse = await fetch('http://localhost:8000/api/stocks/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                symbol: symbol,
                name: symbol.replace('.NS', '').replace('.BO', ''),
                exchange: symbol.endsWith('.NS') ? 'NSE' : 'BSE',
                sector: 'Unknown',
                is_active: true
              })
            });

            if (addResponse.ok) {
              console.log(`✅ Added stock: ${symbol}`);
            } else {
              console.error(`❌ Failed to add: ${symbol}`);
            }
          } catch (err) {
            console.error(`Error adding ${symbol}:`, err);
          }
        }

        antMessage.success(`Added ${missingStocks.length} new stocks to database`);

        // Wait for database to update
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return true;
    } catch (error) {
      console.error('Error ensuring stocks exist:', error);
      return false;
    }
  };

  // Submit create watchlist - FIXED VERSION
  const handleSubmitWatchlist = async (values: any) => {
    try {
      setLoading(true);

      console.log('📊 Selected stocks:', selectedStocks);

      // FIRST: Ensure all stocks exist in database
      await ensureStocksExist(selectedStocks);

      // SECOND: Fetch all stocks to get IDs
      const stocksResponse = await fetch('http://localhost:8000/api/stocks/');
      if (!stocksResponse.ok) {
        throw new Error('Failed to fetch stocks');
      }

      const allStocks = await stocksResponse.json();
      console.log('📦 All stocks from API:', allStocks.length, 'stocks');

      // THIRD: Map symbols to IDs
      const stockIds: number[] = [];
      const notFoundStocks: string[] = [];

      for (const symbol of selectedStocks) {
        const stock = allStocks.find((s: any) => s.symbol === symbol);
        if (stock) {
          stockIds.push(stock.id);
          console.log(`✅ Found ${symbol} with ID ${stock.id}`);
        } else {
          notFoundStocks.push(symbol);
          console.warn(`⚠️ Stock still not found: ${symbol}`);
        }
      }

      if (notFoundStocks.length > 0) {
        antMessage.warning({
          content: `${notFoundStocks.length} stocks could not be added: ${notFoundStocks.join(', ')}`,
          duration: 5
        });
      }

      if (stockIds.length === 0) {
        antMessage.error('No valid stocks found. Please try again.');
        setLoading(false);
        return;
      }

      console.log('🎯 Creating watchlist with', stockIds.length, 'stock IDs:', stockIds);

      // FOURTH: Create watchlist with stock_ids
      const createResponse = await fetch('http://localhost:8000/api/watchlists/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          description: values.description || '',
          stock_ids: stockIds
        })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.detail || 'Failed to create watchlist');
      }

      const newWatchlist = await createResponse.json();
      console.log('✅ Watchlist created:', newWatchlist);

      antMessage.success({
        content: `Watchlist "${values.name}" created with ${stockIds.length} stocks!`,
        duration: 5
      });

      setCreateWatchlistModal(false);
      watchlistForm.resetFields();
      setSelectedStocks([]);

      // Refresh the page data
      if (typeof onRefresh === 'function') {
        onRefresh();
      }

      // Force reload to show new watchlist
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error('❌ Create watchlist error:', error);
      antMessage.error(error.message || 'Failed to create watchlist');
    } finally {
      setLoading(false);
    }
  };

  // Toggle stock selection
  const toggleStockSelection = (symbol: string) => {
    setSelectedStocks(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  // Select all matched stocks
  const selectAllMatched = () => {
    if (!results) return;
    const matchedStocks = results.results
      .filter((r: any) => r.total_matches > 0)
      .map((r: any) => r.symbol);
    setSelectedStocks(matchedStocks);
    antMessage.success(`Selected all ${matchedStocks.length} matched stocks`);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedStocks([]);
    antMessage.info('Selection cleared');
  };

  const getSummary = () => {
    if (!results) return null;

    const totalStocks = results.total_stocks || 0;
    const stocksWithMatches = results.results?.filter((r: any) => r.total_matches > 0).length || 0;
    const matchRate = totalStocks > 0 ? ((stocksWithMatches / totalStocks) * 100).toFixed(1) : "0.0";

    return { totalStocks, stocksWithMatches, matchRate };
  };

  const summary = getSummary();

  const strategyColumns = [
    {
      title: 'Strategy Name',
      dataIndex: 'display_name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{record.description}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'strategy_type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Indicators',
      dataIndex: 'indicators_used',
      key: 'indicators',
      render: (indicators: string) => {
        try {
          const indicatorList = JSON.parse(indicators);
          return (
            <div>
              {indicatorList?.slice(0, 3).map((ind: string, idx: number) => (
                <Tag key={idx} style={{ margin: 2 }}>{ind}</Tag>
              ))}
              {indicatorList?.length > 3 && (
                <Tag style={{ margin: 2 }}>+{indicatorList.length - 3} more</Tag>
              )}
            </div>
          );
        } catch {
          return <Tag>{indicators}</Tag>;
        }
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Download">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleDownload(record.id, record.script_name)}
            />
          </Tooltip>

          <Popconfirm
            title="Delete Strategy"
            description="Delete strategy from database? File will remain in folder."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Tooltip title="Delete">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🎯 Strategy Management & Execution</h2>
        <Space>
          <Button
            icon={<SyncOutlined spin={scanning} />}
            onClick={handleScan}
            loading={scanning}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : 'Scan Folder'}
          </Button>

          <Button icon={<UploadOutlined />} onClick={() => setUploadModal(true)}>
            Upload Strategy
          </Button>

          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => setExecuteModal(true)}
            size="large"
            disabled={watchlists.length === 0 || strategies.length === 0}
          >
            Execute Strategies
          </Button>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="strategies"
        items={[
          {
            key: 'strategies',
            label: <span><FileTextOutlined /> Strategies ({strategies.length})</span>,
            children: (
              <Card>
                {strategies.length === 0 ? (
                  <Alert
                    title="No Strategies Found"
                    description="Click 'Scan Folder' to load strategies or 'Upload Strategy' to add new one."
                    type="info"
                    showIcon
                  />
                ) : (
                  <Table
                    dataSource={strategies}
                    columns={strategyColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'results',
            label: <span><ThunderboltOutlined /> Execution Results</span>,
            children: (
              <div>
                {error && (
                  <Alert
                    title="Execution Error"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setError(null)}
                    style={{ marginBottom: 16 }}
                  />
                )}

                {loading && (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin size="large" />
                      <p style={{ marginTop: 16, fontSize: 16 }}>
                        {createWatchlistModal ? 'Creating watchlist...' : 'Executing strategies...'}
                      </p>
                      <p style={{ color: '#666' }}>This may take a few moments</p>
                    </div>
                  </Card>
                )}

                {!loading && results && (
                  <div>
                    <Card size="small" style={{ marginBottom: 16, background: '#f0f9ff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>Actions:</strong>
                          <Space style={{ marginLeft: 16 }}>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={handleCreateWatchlistFromResults}
                              disabled={!summary || summary.stocksWithMatches === 0}
                            >
                              Create Watchlist {selectedStocks.length > 0 && `(${selectedStocks.length})`}
                            </Button>
                            {selectedStocks.length > 0 && (
                              <Tag color="blue">{selectedStocks.length} selected</Tag>
                            )}
                          </Space>
                        </div>
                        {selectedStocks.length > 0 && (
                          <Button size="small" onClick={clearSelection}>
                            Clear Selection
                          </Button>
                        )}
                      </div>
                    </Card>

                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col span={6}>
                        <Card>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Watchlist</div>
                            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                              {results.watchlist_name}
                            </div>
                          </div>
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Strategies Executed</div>
                            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#722ed1' }}>
                              {results.strategy_count}
                            </div>
                          </div>
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Total Stocks</div>
                            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                              {summary?.totalStocks}
                            </div>
                          </div>
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Stocks with Matches</div>
                            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                              {summary?.stocksWithMatches}
                            </div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                              {summary?.matchRate}% success rate
                            </div>
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    <Card title="📊 Detailed Results">
                      <Table
                        dataSource={results.results || []}
                        rowKey="symbol"
                        pagination={{
                          pageSize: 20,
                          showTotal: (total) => `Total ${total} stocks`,
                          showSizeChanger: true,
                          pageSizeOptions: ['10', '20', '50', '100']
                        }}
                        scroll={{ x: 'max-content' }}
                        columns={[
                          {
                            title: 'Select',
                            key: 'select',
                            width: 70,
                            fixed: 'left',
                            render: (_: any, record: any) => (
                              <Checkbox
                                checked={selectedStocks.includes(record.symbol)}
                                onChange={() => toggleStockSelection(record.symbol)}
                                disabled={record.total_matches === 0}
                              />
                            )
                          },
                          {
                            title: 'Stock',
                            dataIndex: 'symbol',
                            key: 'symbol',
                            fixed: 'left',
                            width: 120,
                            render: (text: string) => (
                              <Tag color="blue" style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>
                                {text}
                              </Tag>
                            )
                          },
                          {
                            title: 'Match Status',
                            dataIndex: 'total_matches',
                            key: 'match_status',
                            width: 140,
                            sorter: (a: any, b: any) => a.total_matches - b.total_matches,
                            defaultSortOrder: 'descend',
                            render: (count: number) => (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {count > 0 ? (
                                  <CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} />
                                ) : (
                                  <CloseCircleOutlined style={{ fontSize: 16, color: '#d9d9d9' }} />
                                )}
                                <Tag color={count > 0 ? 'success' : 'default'}>
                                  {count} / {results.strategy_count}
                                </Tag>
                              </div>
                            ),
                            filters: [
                              { text: 'Has Matches', value: 'has_matches' },
                              { text: 'No Matches', value: 'no_matches' },
                            ],
                            onFilter: (value, record) => {
                              if (value === 'has_matches') return record.total_matches > 0;
                              if (value === 'no_matches') return record.total_matches === 0;
                              return true;
                            }
                          },
                          ...(results.strategies ? Object.entries(results.strategies).map(([strategyId, strategyInfo]: [string, any]) => ({
                            title: strategyInfo.name,
                            key: `strategy_${strategyId}`,
                            width: 280,
                            render: (_: any, record: any) => {
                              const strategyResult = record.strategies?.[strategyId];
                              if (!strategyResult) {
                                return <Tag color="default">No Data</Tag>;
                              }

                              if (strategyResult.matched) {
                                return (
                                  <div style={{ background: '#f6ffed', padding: 8, borderRadius: 4, border: '1px solid #b7eb8f' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                                      <Tag color="success" style={{ margin: 0 }}>MATCH</Tag>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#333', marginBottom: 4 }}>
                                      <strong>Score:</strong> {strategyResult.score}
                                      {strategyResult.confidence && (
                                        <> | <strong>Confidence:</strong> {strategyResult.confidence.toFixed(1)}%</>
                                      )}
                                    </div>
                                    {strategyResult.reason && (
                                      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.4 }}>
                                        {strategyResult.reason.substring(0, 80)}
                                        {strategyResult.reason.length > 80 && '...'}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <div style={{ padding: 8 }}>
                                    <Tag color="default" icon={<CloseCircleOutlined />}>
                                      No Match
                                    </Tag>
                                  </div>
                                );
                              }
                            }
                          })) : [])
                        ]}
                      />
                    </Card>

                    {summary && summary.stocksWithMatches > 0 && (
                      <Card
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>
                              <span>🌟 </span>
                              <span>Matched Stocks ({summary.stocksWithMatches})</span>
                            </span>
                            <Space>
                              <Button size="small" onClick={selectAllMatched}>
                                Select All Matched
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={handleCreateWatchlistFromResults}
                              >
                                Create Watchlist {selectedStocks.length > 0 && `(${selectedStocks.length})`}
                              </Button>
                            </Space>
                          </div>
                        }
                        style={{ marginTop: 16, background: '#f0f9ff', border: '1px solid #91d5ff' }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {results.results
                            .filter((r: any) => r.total_matches > 0)
                            .sort((a: any, b: any) => b.total_matches - a.total_matches)
                            .map((r: any) => (
                              <div
                                key={r.symbol}
                                style={{
                                  background: selectedStocks.includes(r.symbol) ? '#e6f7ff' : '#fff',
                                  border: selectedStocks.includes(r.symbol) ? '2px solid #1890ff' : '2px solid #52c41a',
                                  borderRadius: 8,
                                  padding: '12px 16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  minWidth: 120,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onClick={() => toggleStockSelection(r.symbol)}
                              >
                                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                                  {r.symbol}
                                </div>
                                <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                                  ✓ {r.total_matches} match{r.total_matches > 1 ? 'es' : ''}
                                </div>
                                {selectedStocks.includes(r.symbol) && (
                                  <div style={{ marginTop: 4 }}>
                                    <CheckCircleOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {!loading && !results && !error && (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <PlayCircleOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                      <h3 style={{ marginTop: 16, color: '#666' }}>No Execution Results Yet</h3>
                      <p style={{ color: '#999' }}>
                        Click "Execute Strategies" to run analysis
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="Upload Strategy File"
        open={uploadModal}
        onCancel={() => setUploadModal(false)}
        footer={null}
        width={600}
      >
        <Upload.Dragger
          name="file"
          accept=".py"
          beforeUpload={handleUpload}
          showUploadList={false}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <FileTextOutlined style={{ fontSize: 48, color: uploading ? '#d9d9d9' : '#1890ff' }} />
          </p>
          <p className="ant-upload-text">
            {uploading ? 'Uploading...' : 'Click or drag Python file to upload'}
          </p>
          <p className="ant-upload-hint">
            Only .py files implementing BaseStrategy are accepted
          </p>
        </Upload.Dragger>

        <Alert
          title="Strategy Requirements"
          description={
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>Must inherit from BaseStrategy class</li>
              <li>Must implement analyze(symbols) method</li>
              <li>Must define get_metadata() class method</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>

      <Modal
        title="Execute Multiple Strategies"
        open={executeModal}
        onCancel={() => setExecuteModal(false)}
        footer={null}
        width={600}
      >
        <Form form={executeForm} layout="vertical" onFinish={handleExecute}>
          <Form.Item
            label="Select Watchlist"
            name="watchlist_id"
            rules={[{ required: true, message: 'Please select a watchlist' }]}
          >
            <Select placeholder="Choose a watchlist" size="large">
              {watchlists.map((wl: any) => (
                <Select.Option key={wl.id} value={wl.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{wl.name}</span>
                    <span style={{ color: '#999' }}>({wl.stock_count} stocks)</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Select Strategies"
            name="strategy_ids"
            rules={[{ required: true, message: 'Please select at least one strategy' }]}
          >
            <Select
              mode="multiple"
              placeholder="Choose strategies"
              maxTagCount="responsive"
              size="large"
            >
              {strategies.filter(s => s.is_active).map((st: any) => (
                <Select.Option key={st.id} value={st.id}>
                  {st.display_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 24 }}>
              <Button onClick={() => setExecuteModal(false)} size="large">
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlayCircleOutlined />}
                size="large"
                loading={loading}
              >
                Execute
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div>
            <PlusOutlined /> Create Watchlist from Strategy Results
          </div>
        }
        open={createWatchlistModal}
        onCancel={() => {
          setCreateWatchlistModal(false);
          watchlistForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Alert
          title={`Creating watchlist with ${selectedStocks.length} selected stocks`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={watchlistForm}
          layout="vertical"
          onFinish={handleSubmitWatchlist}
        >
          <Form.Item
            label="Watchlist Name"
            name="name"
            rules={[{ required: true, message: 'Please enter watchlist name' }]}
          >
            <Input
              placeholder="e.g., Strategy Results - Feb 2026"
              size="large"
              prefix={<EditOutlined />}
            />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              placeholder="Add notes about this watchlist..."
              rows={3}
            />
          </Form.Item>

          <Form.Item label="Selected Stocks">
            <div style={{
              maxHeight: 200,
              overflow: 'auto',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              padding: 12,
              background: '#fafafa'
            }}>
              {selectedStocks.length > 0 ? (
                <Space wrap>
                  {selectedStocks.map(symbol => (
                    <Tag
                      key={symbol}
                      color="blue"
                      closable
                      onClose={() => toggleStockSelection(symbol)}
                    >
                      {symbol}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <div style={{ textAlign: 'center', color: '#999' }}>
                  No stocks selected
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setCreateWatchlistModal(false);
                  watchlistForm.resetFields();
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                size="large"
                disabled={selectedStocks.length === 0}
                loading={loading}
              >
                Create Watchlist ({selectedStocks.length} stocks)
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}