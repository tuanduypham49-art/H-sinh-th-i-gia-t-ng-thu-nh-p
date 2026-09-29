import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'gttn_enterprise.json');

app.use(express.json({ limit: '50mb' }));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface Member {
  code: string;
  name: string;
  dob?: string;
  gender?: string;
  phone: string;
  cccd: string;
  level: number;
  sponsor?: string;
  u1?: string;
  u2?: string;
  u3?: string;
  u4?: string;
  u5?: string;
  u6?: string;
  u7?: string;
  bankAccount?: string;
  bankName?: string;
  created?: string;
  ts?: number;
}

interface Allocation {
  code: string;
  level: number;
  pct: number;
  amount: number;
}

interface IncomeRecord {
  id: string;
  date: string;
  memberCode: string;
  product: string;
  productIncome: number;
  level: number;
  sponsor?: string;
  u1?: string;
  u2?: string;
  u3?: string;
  u4?: string;
  u5?: string;
  u6?: string;
  u7?: string;
  phone?: string;
  cccd?: string;
  name?: string;
  allocations: Allocation[];
}

interface StoreData {
  members: Member[];
  incomes: IncomeRecord[];
}

function readData(): StoreData {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { members: [], incomes: [] };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      members: Array.isArray(parsed.members) ? parsed.members : [],
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
    };
  } catch (e) {
    console.error('Error reading data:', e);
    return { members: [], incomes: [] };
  }
}

function writeData(data: StoreData) {
  const tempFile = DATA_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, DATA_FILE);
}

// API Endpoints
app.get('/api/data', (_req, res) => {
  const data = readData();
  res.json({ success: true, data });
});

app.post('/api/members', (req, res) => {
  const newMember: Member = req.body;
  if (!newMember || !newMember.code || !newMember.name || !newMember.phone || !newMember.cccd) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ Mã, Họ tên, SĐT và CCCD.' });
  }

  const data = readData();
  const existingCode = data.members.find(m => m.code.toUpperCase() === newMember.code.toUpperCase());
  if (existingCode) {
    return res.status(400).json({ success: false, message: `Mã thành viên ${newMember.code} đã tồn tại trong cơ sở dữ liệu.` });
  }

  const existingPhone = data.members.find(m => m.phone === newMember.phone);
  if (existingPhone) {
    return res.status(400).json({ success: false, message: `Số điện thoại ${newMember.phone} đã tồn tại trong cơ sở dữ liệu.` });
  }

  const existingCccd = data.members.find(m => m.cccd === newMember.cccd);
  if (existingCccd) {
    return res.status(400).json({ success: false, message: `Số CCCD ${newMember.cccd} đã tồn tại trong cơ sở dữ liệu.` });
  }

  data.members.push(newMember);
  writeData(data);
  res.json({ success: true, member: newMember, total: data.members.length });
});

app.delete('/api/members/:code', (req, res) => {
  const code = req.params.code;
  const { password } = req.body;
  if (password !== 'Toilaso1@') {
    return res.status(403).json({ success: false, message: 'Mật khẩu xác nhận không đúng.' });
  }

  const data = readData();
  const idx = data.members.findIndex(m => m.code === code);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thành viên để xóa.' });
  }

  data.members.splice(idx, 1);
  writeData(data);
  res.json({ success: true, message: `Đã xóa thành viên ${code}.`, total: data.members.length });
});

app.post('/api/incomes', (req, res) => {
  const record: IncomeRecord = req.body;
  if (!record || !record.id || !record.memberCode || !record.product || !record.productIncome) {
    return res.status(400).json({ success: false, message: 'Dữ liệu khoản thu nhập không đầy đủ.' });
  }

  const data = readData();
  data.incomes.push(record);
  writeData(data);
  res.json({ success: true, income: record, total: data.incomes.length });
});

app.delete('/api/incomes/:id', (req, res) => {
  const id = req.params.id;
  const { password } = req.body;
  if (password !== 'Toilaso1@') {
    return res.status(403).json({ success: false, message: 'Mật khẩu xác nhận không đúng.' });
  }

  const data = readData();
  const idx = data.incomes.findIndex(i => i.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy khoản thu nhập cần xóa.' });
  }

  data.incomes.splice(idx, 1);
  writeData(data);
  res.json({ success: true, message: `Đã xóa khoản thu nhập ${id}.`, total: data.incomes.length });
});

app.post('/api/delete-all', (req, res) => {
  const { password } = req.body;
  if (password !== 'Toilaso1@') {
    return res.status(403).json({ success: false, message: 'Mật khẩu xóa toàn bộ không đúng.' });
  }

  writeData({ members: [], incomes: [] });
  res.json({ success: true, message: 'Đã xóa hoàn toàn dữ liệu trong cơ sở dữ liệu máy chủ.' });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GTTN Enterprise Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
