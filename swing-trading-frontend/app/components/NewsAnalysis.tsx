'use client';

import { useState, useEffect } from 'react';
import {
    Card, Button, Select, Space, Table, Tag, Alert, Spin, Empty,
    Typography, Row, Col, Divider, Switch
} from 'antd';
import {
    FileTextOutlined, ReloadOutlined, PlusOutlined,
    DeleteOutlined, CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface NewsAnalysisProps {
    watchlists: any[];
    onRefresh: () => void;
}

export default function NewsAnalysis({ watchlists = [], onRefresh }: NewsAnalysisProps) {
    const [selectedWatchlists, setSelectedWatchlists] = useState<number[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Load stocks from selected watchlists
    useEffect(() => {
        loadStocksFromWatchlists();
    }, [selectedWatchlists, watchlists]);

    const loadStocksFromWatchlists = () => {
        if (selectedWatchlists.length === 0) {
            setStocks([]);
            return;
        }

        // Collect all unique stocks from selected watchlists
        const allStocks = new Map();

        selectedWatchlists.forEach(watchlistId => {
            const watchlist = watchlists.find(wl => wl.id === watchlistId);
            if (watchlist && watchlist.stocks) {
                watchlist.stocks.forEach((stock: any) => {
                    if (!allStocks.has(stock.symbol)) {
                        allStocks.set(stock.symbol, {
                            ...stock,
                            watchlists: [watchlist.name]
                        });
                    } else {
                        const existing = allStocks.get(stock.symbol);
                        existing.watchlists.push(watchlist.name);
                    }
                });
            }
        });

        setStocks(Array.from(allStocks.values()));
    };

    const handleWatchlistChange = (values: number[]) => {
        setSelectedWatchlists(values);
    };

    const removeWatchlist = (watchlistId: number) => {
        setSelectedWatchlists(prev => prev.filter(id => id !== watchlistId));
    };

    const clearAll = () => {
        setSelectedWatchlists([]);
    };

    const handleRunAnalysis = async () => {
        setLoading(true);
        try {
            // TODO: Integrate News AI project here
            console.log('Running news analysis on stocks:', stocks.map(s => s.symbol));

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            alert('News Analysis will be integrated here!');
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Symbol',
            dataIndex: 'symbol',
            key: 'symbol',
            width: 120,
            fixed: 'left' as const,
            render: (text: string) => (
                <Tag color="blue" style={{ fontSize: 14, fontWeight: 'bold' }}>
                    {text}
                </Tag>
            )
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 200,
        },
        {
            title: 'Sector',
            dataIndex: 'sector',
            key: 'sector',
            width: 150,
            render: (text: string) => text || 'N/A'
        },
        {
            title: 'In Watchlists',
            dataIndex: 'watchlists',
            key: 'watchlists',
            render: (watchlists: string[]) => (
                <Space wrap>
                    {watchlists.map((wl, idx) => (
                        <Tag key={idx} color="green">{wl}</Tag>
                    ))}
                </Space>
            )
        },
        {
            title: 'Status',
            key: 'status',
            width: 120,
            render: () => (
                <Tag color="default">Ready</Tag>
            )
        }
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>📰 News Analysis</Title>
                <Text type="secondary">
                    Select watchlists to analyze news sentiment for stocks
                </Text>
            </div>

            {/* Watchlist Selection Card */}
            {/* Watchlist Selection Card */}
            <Card
                title="Select Watchlists for Analysis"
                style={{ marginBottom: 24 }}
                extra={
                    <Space>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={onRefresh}
                            size="small"
                        >
                            Refresh
                        </Button>
                    </Space>
                }
            >
                <Space orientation="vertical" style={{ width: '100%' }} size="large">
                    {/* Watchlist Selector */}
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Choose Watchlists:
                        </Text>
                        <Select
                            mode="multiple"
                            placeholder="Select one or more watchlists"
                            value={selectedWatchlists}
                            onChange={handleWatchlistChange}
                            style={{ width: '100%' }}
                            size="large"
                            maxTagCount="responsive"
                            disabled={watchlists.length === 0}
                        >
                            {watchlists.map(wl => (
                                <Select.Option key={wl.id} value={wl.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{wl.name}</span>
                                        <span style={{ color: '#999' }}>({wl.stock_count} stocks)</span>
                                    </div>
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    {/* Selected Watchlists Display */}
                    {selectedWatchlists.length > 0 && (
                        <div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 12
                            }}>
                                <Text strong>Selected Watchlists ({selectedWatchlists.length}):</Text>
                                <Button
                                    size="small"
                                    danger
                                    onClick={clearAll}
                                    icon={<DeleteOutlined />}
                                >
                                    Clear All
                                </Button>
                            </div>
                            <Space wrap>
                                {selectedWatchlists.map(id => {
                                    const watchlist = watchlists.find(wl => wl.id === id);
                                    return watchlist ? (
                                        <Tag
                                            key={id}
                                            color="blue"
                                            closable
                                            onClose={() => removeWatchlist(id)}
                                            style={{ padding: '4px 12px', fontSize: 14 }}
                                        >
                                            {watchlist.name} ({watchlist.stock_count})
                                        </Tag>
                                    ) : null;
                                })}
                            </Space>
                        </div>
                    )}
                </Space>
            </Card>

            {/* Summary Stats */}
            {stocks.length > 0 && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                                    Total Stocks
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>
                                    {stocks.length}
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                                    Watchlists
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#722ed1' }}>
                                    {selectedWatchlists.length}
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                                    Unique Sectors
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>
                                    {new Set(stocks.map(s => s.sector).filter(Boolean)).size}
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                                    Status
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a', marginTop: 8 }}>
                                    <CheckCircleOutlined /> Ready
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Action Buttons */}
            {stocks.length > 0 && (
                <Card size="small" style={{ marginBottom: 24, background: '#f0f9ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                            <Button
                                type="primary"
                                size="large"
                                icon={<FileTextOutlined />}
                                onClick={handleRunAnalysis}
                                loading={loading}
                            >
                                Run News Analysis
                            </Button>
                            <div style={{ marginLeft: 16 }}>
                                <Space>
                                    <Switch
                                        checked={autoRefresh}
                                        onChange={setAutoRefresh}
                                    />
                                    <Text>Auto-refresh (Every 15 min)</Text>
                                </Space>
                            </div>
                        </Space>
                        <Text type="secondary">
                            Analysis will be performed on {stocks.length} stocks
                        </Text>
                    </div>
                </Card>
            )}

            {/* Stocks Table */}
            <Card title={`📊 Stocks to Analyze (${stocks.length})`}>
                {stocks.length === 0 ? (
                    <Empty
                        description={
                            selectedWatchlists.length === 0
                                ? "Select watchlists above to start"
                                : "No stocks found in selected watchlists"
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <Table
                        dataSource={stocks}
                        columns={columns}
                        rowKey="symbol"
                        pagination={{
                            pageSize: 20,
                            showTotal: (total) => `Total ${total} stocks`,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50', '100']
                        }}
                        scroll={{ x: 'max-content' }}
                    />
                )}
            </Card>

            {/* Placeholder for Future News Analysis Results */}
            {loading && (
                <Card style={{ marginTop: 24 }}>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin size="large" />
                        <p style={{ marginTop: 16, fontSize: 16 }}>Analyzing news sentiment...</p>
                        <p style={{ color: '#666' }}>This will integrate with your News AI project</p>
                    </div>
                </Card>
            )}
        </div>
    );
}