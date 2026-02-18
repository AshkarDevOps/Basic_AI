'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Tag, Popconfirm, Modal, Form, Input, Select, Upload, message } from 'antd';
import { 
  PlusOutlined, DeleteOutlined, FileExcelOutlined, 
  UploadOutlined, DownloadOutlined, SearchOutlined 
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';

const { Search, TextArea } = Input;

interface StocksProps {
  stocks: any[];
  onRefresh: () => void;
  onAddStock: (stock: any) => Promise<void>;
  onDeleteStock: (id: number, symbol: string) => Promise<void>;
}

export default function Stocks({ stocks, onRefresh, onAddStock, onDeleteStock }: StocksProps) {
  const [searchText, setSearchText] = useState('');
  const [filteredStocks, setFilteredStocks] = useState<any[]>([]);
  
  const [addStockModal, setAddStockModal] = useState(false);
  const [bulkAddModal, setBulkAddModal] = useState(false);
  const [bulkUploadModal, setBulkUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [stockForm] = Form.useForm();
  const [bulkForm] = Form.useForm();

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredStocks(stocks);
    } else {
      const searchLower = searchText.toLowerCase();
      const filtered = stocks.filter(stock => 
        stock.symbol.toLowerCase().includes(searchLower) ||
        stock.name?.toLowerCase().includes(searchLower) ||
        stock.sector?.toLowerCase().includes(searchLower)
      );
      setFilteredStocks(filtered);
    }
  }, [searchText, stocks]);

  const handleAddStock = async (values: any) => {
    await onAddStock(values);
    setAddStockModal(false);
    stockForm.resetFields();
  };

  const handleBulkAdd = async (values: any) => {
    const symbols = values.symbols
      .split(/[,\n]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s);
    
    for (const symbol of symbols) {
      try {
        await onAddStock({ symbol, exchange: values.exchange });
      } catch (error) {
        console.error(`Failed to add ${symbol}`);
      }
    }
    
    message.success(`Added ${symbols.length} stocks`);
    setBulkAddModal(false);
    bulkForm.resetFields();
    onRefresh();
  };

  const downloadSampleFile = () => {
    const csvContent = `Symbol,Name,Exchange,Sector
RELIANCE,Reliance Industries,NSE,Energy
TCS,Tata Consultancy Services,NSE,IT
INFY,Infosys Limited,NSE,IT`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'stock_upload_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Sample file downloaded!');
  };

  const handleFileUpload = async (file: RcFile) => {
    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const dataLines = lines.slice(1);
      
      for (const line of dataLines) {
        const [symbol, name, exchange, sector] = line.split(',').map(s => s.trim());
        if (symbol) {
          try {
            await onAddStock({ symbol, name, exchange: exchange || 'NSE', sector });
          } catch (error) {
            console.error(`Failed to add ${symbol}`);
          }
        }
      }
      
      message.success('Upload complete!');
      setBulkUploadModal(false);
      onRefresh();
    } catch (error) {
      message.error('Failed to process file');
    } finally {
      setUploading(false);
    }
    
    return false;
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>📈 Stocks ({filteredStocks.length})</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button icon={<PlusOutlined />} onClick={() => setAddStockModal(true)}>
            Add Stock
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={() => setBulkAddModal(true)}>
            Bulk Add (Text)
          </Button>
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setBulkUploadModal(true)}>
            Upload CSV/Excel
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Search
          placeholder="Search by symbol, name, or sector..."
          prefix={<SearchOutlined />}
          allowClear
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 500 }}
        />
      </div>

      <Table 
        dataSource={filteredStocks} 
        rowKey="id"
        columns={[
          { title: 'Symbol', dataIndex: 'symbol', render: (text: string) => <Tag color="blue">{text}</Tag> },
          { title: 'Name', dataIndex: 'name' },
          { title: 'Exchange', dataIndex: 'exchange' },
          { title: 'Sector', dataIndex: 'sector' },
          { 
            title: 'Status', 
            dataIndex: 'is_active', 
            render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag> 
          },
          {
            title: 'Actions',
            render: (_: any, record: any) => (
              <Popconfirm
                title="Delete Stock"
                description={`Are you sure you want to delete ${record.symbol}?`}
                onConfirm={() => onDeleteStock(record.id, record.symbol)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>Delete</Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      {/* Modals */}
      <Modal title="Add New Stock" open={addStockModal} onCancel={() => setAddStockModal(false)} footer={null}>
        <Form form={stockForm} layout="vertical" onFinish={handleAddStock}>
          <Form.Item label="Symbol" name="symbol" rules={[{ required: true }]}>
            <Input placeholder="e.g., RELIANCE" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item label="Name" name="name">
            <Input placeholder="e.g., Reliance Industries" />
          </Form.Item>
          <Form.Item label="Exchange" name="exchange" initialValue="NSE">
            <Select>
              <Select.Option value="NSE">NSE</Select.Option>
              <Select.Option value="BSE">BSE</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Sector" name="sector">
            <Input placeholder="e.g., Energy" />
          </Form.Item>
          <Form.Item>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button onClick={() => setAddStockModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Add Stock</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Bulk Add Stocks (Text)" open={bulkAddModal} onCancel={() => setBulkAddModal(false)} footer={null} width={600}>
        <Form form={bulkForm} layout="vertical" onFinish={handleBulkAdd} initialValues={{ exchange: 'NSE' }}>
          <Form.Item label="Stock Symbols" name="symbols" rules={[{ required: true }]}>
            <TextArea rows={8} placeholder="RELIANCE, TCS, INFY" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item label="Exchange" name="exchange">
            <Select>
              <Select.Option value="NSE">NSE</Select.Option>
              <Select.Option value="BSE">BSE</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button onClick={() => setBulkAddModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Add Stocks</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Upload Stocks from CSV" open={bulkUploadModal} onCancel={() => setBulkUploadModal(false)} footer={null} width={600}>
        <div style={{ marginBottom: 24 }}>
          <Button icon={<DownloadOutlined />} onClick={downloadSampleFile} type="dashed" block>
            Download Sample CSV File
          </Button>
        </div>
        <Upload.Dragger
          accept=".csv"
          beforeUpload={handleFileUpload}
          showUploadList={false}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">Click or drag file to upload</p>
        </Upload.Dragger>
        {uploading && <Tag color="processing" style={{ marginTop: 16 }}>Processing...</Tag>}
      </Modal>
    </div>
  );
}