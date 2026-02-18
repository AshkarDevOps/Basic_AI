'use client';

import { useState } from 'react';
import { Table, Button, Tag, Popconfirm, Modal, Form, Input, Transfer } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TransferProps } from 'antd';

interface WatchlistsProps {
  watchlists: any[];
  stocks: any[];
  onRefresh: () => void;
  onCreateWatchlist: (watchlist: any) => Promise<void>;
  onUpdateWatchlist: (id: number, watchlist: any) => Promise<void>;
  onDeleteWatchlist: (id: number, name: string) => Promise<void>;
  onManageStocks: (watchlistId: number, stockIds: number[]) => Promise<void>;
}

export default function Watchlists({ 
  watchlists, 
  stocks, 
  onRefresh,
  onCreateWatchlist,
  onUpdateWatchlist,
  onDeleteWatchlist,
  onManageStocks
}: WatchlistsProps) {
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [manageStocksModal, setManageStocksModal] = useState(false);
  
  const [editingWatchlist, setEditingWatchlist] = useState<any>(null);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const handleCreate = async (values: any) => {
    await onCreateWatchlist(values);
    setCreateModal(false);
    createForm.resetFields();
  };

  const handleEdit = async (values: any) => {
    if (!editingWatchlist) return;
    await onUpdateWatchlist(editingWatchlist.id, values);
    setEditModal(false);
    setEditingWatchlist(null);
    editForm.resetFields();
  };

  const handleManageStocks = async () => {
    if (!selectedWatchlistId) return;
    const stockIds = targetKeys.map(k => parseInt(k));
    await onManageStocks(selectedWatchlistId, stockIds);
    setManageStocksModal(false);
    setTargetKeys([]);
  };

  const openManageStocks = (watchlist: any) => {
    setSelectedWatchlistId(watchlist.id);
    const existingStockIds = watchlist.stocks?.map((s: any) => s.id.toString()) || [];
    setTargetKeys(existingStockIds);
    setManageStocksModal(true);
  };

  const openEdit = (watchlist: any) => {
    setEditingWatchlist(watchlist);
    editForm.setFieldsValue({ 
      name: watchlist.name, 
      description: watchlist.description 
    });
    setEditModal(true);
  };

  // Fix Transfer onChange handler
  const handleTransferChange: TransferProps['onChange'] = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys as string[]);
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>📋 Watchlists ({watchlists.length})</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setCreateModal(true)}
        >
          Create Watchlist
        </Button>
      </div>

      <Table 
        dataSource={watchlists} 
        rowKey="id"
        columns={[
          { 
            title: 'Name', 
            dataIndex: 'name', 
            render: (text: string) => <strong>{text}</strong> 
          },
          { title: 'Description', dataIndex: 'description' },
          { title: 'Stocks', dataIndex: 'stock_count' },
          { 
            title: 'Created', 
            dataIndex: 'created_date', 
            render: (date: string) => new Date(date).toLocaleDateString() 
          },
          {
            title: 'Actions',
            render: (_: any, record: any) => (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  type="link" 
                  icon={<EditOutlined />} 
                  onClick={() => openEdit(record)}
                >
                  Edit
                </Button>
                <Button 
                  type="link" 
                  onClick={() => openManageStocks(record)}
                >
                  Manage Stocks
                </Button>
                <Popconfirm
                  title="Delete Watchlist"
                  description={`Delete "${record.name}"?`}
                  onConfirm={() => onDeleteWatchlist(record.id, record.name)}
                >
                  <Button 
                    type="link" 
                    danger 
                    icon={<DeleteOutlined />}
                  >
                    Delete
                  </Button>
                </Popconfirm>
              </div>
            ),
          },
        ]}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ margin: 0 }}>
              <strong>Stocks in this watchlist:</strong>
              <div style={{ marginTop: 8 }}>
                {record.stocks?.length > 0 ? (
                  record.stocks.map((stock: any) => (
                    <Tag key={stock.id} color="blue" style={{ margin: 4 }}>
                      {stock.symbol}
                    </Tag>
                  ))
                ) : (
                  <Tag>No stocks added yet</Tag>
                )}
              </div>
            </div>
          ),
        }}
      />

      {/* Create Watchlist Modal */}
      <Modal 
        title="Create Watchlist" 
        open={createModal} 
        onCancel={() => setCreateModal(false)} 
        footer={null}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item 
            label="Watchlist Name" 
            name="name" 
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Tech Stocks" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>
          <Form.Item>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Create</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Watchlist Modal */}
      <Modal 
        title="Edit Watchlist" 
        open={editModal} 
        onCancel={() => setEditModal(false)} 
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item 
            label="Name" 
            name="name" 
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Update</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Manage Watchlist Stocks Modal */}
      <Modal 
        title="Manage Watchlist Stocks" 
        open={manageStocksModal} 
        onCancel={() => setManageStocksModal(false)} 
        onOk={handleManageStocks}
        width={800}
      >
        <Transfer
          dataSource={stocks.map((s: any) => ({ 
            key: s.id.toString(), 
            title: `${s.symbol} - ${s.name || 'N/A'}`,
            description: s.sector || ''
          }))}
          titles={['Available Stocks', 'In Watchlist']}
          targetKeys={targetKeys}
          onChange={handleTransferChange}
          render={(item) => item.title}
          showSearch
          filterOption={(inputValue, item) =>
            item.title.toLowerCase().includes(inputValue.toLowerCase()) ||
            item.description.toLowerCase().includes(inputValue.toLowerCase())
          }
          listStyle={{ 
            width: 350, 
            height: 500 
          }}
        />
      </Modal>
    </div>
  );
}