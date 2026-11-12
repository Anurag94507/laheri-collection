import { getSettings } from './settings.js';
import { roundMoney } from '../utils/validate.js';

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);
const startOfDay = (offsetDays = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
};

export async function buildDashboard(db) {
  const settings = await getSettings(db);
  const [bills, orders, customers, products, campaigns, chatLogs] = await Promise.all([
    db.collection('bills').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection('orders').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection('customers').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection('products').find({}).toArray(),
    db.collection('campaigns').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection('chatLogs').find({}).toArray(),
  ]);

  const today = dayKey(new Date());
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const weekAgo = startOfDay(-6).toISOString();

  const revenueOf = (doc) => Number(doc.grandTotal || 0);
  const todaySales = [...bills, ...orders].filter((doc) => dayKey(doc.createdAt) === today).reduce((sum, doc) => sum + revenueOf(doc), 0);
  const monthOrders = orders.filter((order) => order.createdAt >= monthStart).length;
  const monthRevenue = [...bills, ...orders].filter((doc) => doc.createdAt >= monthStart).reduce((sum, doc) => sum + revenueOf(doc), 0);
  const newCustomersWeek = customers.filter((customer) => customer.createdAt >= weekAgo).length;

  const weeklyRevenue = Array.from({ length: 7 }).map((_, index) => {
    const date = startOfDay(index - 6);
    const key = dayKey(date);
    const total = [...bills, ...orders]
      .filter((doc) => dayKey(doc.createdAt) === key)
      .reduce((sum, doc) => sum + revenueOf(doc), 0);
    return { day: date.toLocaleDateString('en-IN', { weekday: 'short' }), date: key, total: roundMoney(total) };
  });

  const categoryTotals = {};
  for (const doc of [...bills, ...orders]) {
    for (const item of doc.items || []) {
      const key = item.category || 'Other';
      categoryTotals[key] = (categoryTotals[key] || 0) + Number(item.totalPrice || 0);
    }
  }
  const categorySales = Object.entries(categoryTotals)
    .map(([name, total]) => ({ name, total: roundMoney(total) }))
    .sort((a, b) => b.total - a.total);

  const acquisition = Array.from({ length: 8 }).map((_, index) => {
    const end = startOfDay((index - 7) * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const count = customers.filter((customer) => customer.createdAt >= start.toISOString() && customer.createdAt < end.toISOString()).length;
    return { label: `W${8 - index}`, count };
  });
  const acquisitionThisWeek = customers.filter((customer) => customer.createdAt >= startOfDay(-6).toISOString()).length;
  if (!acquisition.length) acquisition.push({ label: 'W1', count: acquisitionThisWeek });

  const lowStock = products
    .filter((product) => Number(product.stock) < 5)
    .sort((a, b) => Number(a.stock) - Number(b.stock))
    .slice(0, 6)
    .map((product) => ({ id: product._id, name: product.name, stock: product.stock, image: product.images?.[0] }));

  const recent = [
    ...bills.map((bill) => ({
      id: bill._id,
      kind: 'Offline bill',
      reference: bill.billNumber,
      name: bill.customer?.name || 'Walk-in',
      amount: bill.grandTotal,
      createdAt: bill.createdAt,
    })),
    ...orders.map((order) => ({
      id: order._id,
      kind: 'Online order',
      reference: order.orderId,
      name: order.customer?.name || 'Guest',
      amount: order.grandTotal,
      createdAt: order.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const messagesThisMonth = campaigns
    .filter((campaign) => campaign.createdAt >= monthStart)
    .reduce((sum, campaign) => sum + Number(campaign.sentCount || 0), 0);

  const todaySessions = new Set(chatLogs.filter((log) => dayKey(log.createdAt) === today).map((log) => log.sessionId));

  return {
    stats: {
      todaySales: roundMoney(todaySales),
      todayBillCount: bills.filter((bill) => dayKey(bill.createdAt) === today).length,
      todayOrderCount: orders.filter((order) => dayKey(order.createdAt) === today).length,
      monthOrders,
      monthRevenue: roundMoney(monthRevenue),
      newCustomersWeek,
      totalCustomers: customers.length,
      lowStockCount: products.filter((product) => Number(product.stock) < 5).length,
      messagesThisMonth,
      chatbotToday: todaySessions.size,
      gstPercent: settings.shop.gstPercent,
    },
    weeklyRevenue,
    categorySales,
    acquisition,
    lowStock,
    recent,
  };
}
