// src/components/dashboard/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign, faClipboardCheck, faBoxOpen,
  faArrowUp, faSyncAlt, faChevronDown,
  faInbox, faTriangleExclamation, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/api';
import { extractArray } from '../../utils/extractArray';
import type { Order, Product } from '../../types';
import { useAuth } from '../../context/AuthContext';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
type TabType = 'Theo ngày' | 'Theo giờ' | 'Theo thứ';
const PERIODS = ['Hôm nay','Hôm qua','7 ngày qua','Tháng này'];
const HOURS = Array.from({length:18},(_,i)=>i+6);

interface ChartBar { label: string; value: number; }

function BarChart({ bars, maxVal }: { bars: ChartBar[]; maxVal: number }) {
  if (bars.every(b => b.value === 0)) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',padding:'48px 0',gap:8,color:'#9ca3af'}}>
      <FontAwesomeIcon icon={faInbox} style={{fontSize:32}}/>
      <p style={{margin:0,fontSize:13}}>Không có giao dịch</p>
    </div>
  );
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:4,height:160,padding:'0 4px',overflowX:'auto'}}>
      {bars.map(bar => {
        const pct = maxVal > 0 ? (bar.value/maxVal)*100 : 0;
        return (
          <div key={bar.label} title={`${bar.label}: ${fmt(bar.value)}`}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,flex:'1 0 28px',minWidth:28}}>
            <div style={{width:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end',height:130}}>
              <div style={{width:'100%',borderRadius:'4px 4px 0 0',
                background:pct>0?'#16a34a':'#f3f4f6',
                height:`${Math.max(pct,pct>0?4:0)}%`,
                transition:'height 0.4s ease',minHeight:pct>0?4:0}}/>
            </div>
            <span style={{fontSize:10,color:'#9ca3af',whiteSpace:'nowrap',
              writingMode:bars.length>14?'vertical-rl':'horizontal-tb',
              transform:bars.length>14?'rotate(180deg)':'none'}}>
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('Theo giờ');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Hôm nay');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const tabs: TabType[] = ['Theo ngày','Theo giờ','Theo thứ'];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, activeRes, productsRes] = await Promise.allSettled([
        api.get('/orders', { params: { status: 'completed' } }),
        api.get('/orders', { params: { status: 'pending' } }),
        api.get('/products', { params: { status: 'active' } }),
      ]);

      // extractArray xử lý mọi dạng response: [], {data:[]}, {data:{data:[]}}
      const orders = ordersRes.status==='fulfilled'
        ? extractArray<Order>(ordersRes.value.data) : [];
      const active = activeRes.status==='fulfilled'
        ? extractArray<Order>(activeRes.value.data) : [];
      const products = productsRes.status==='fulfilled'
        ? extractArray<Product>(productsRes.value.data) : [];

      setAllOrders(orders);
      setActiveOrders(active);
      setLowStock(products.filter(p => p.stock > 0 && p.stock <= p.minStock).slice(0,5));
    } catch(e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Lọc orders theo period ───────────────────────────────
  const filteredOrders = React.useMemo(() => {
    const now = new Date();
    return allOrders.filter(o => {
      const d = new Date(o.createdAt);
      switch(selectedPeriod) {
        case 'Hôm nay':    return d.toDateString() === now.toDateString();
        case 'Hôm qua': {
          const y = new Date(now); y.setDate(y.getDate()-1);
          return d.toDateString() === y.toDateString();
        }
        case '7 ngày qua': {
          const w = new Date(now); w.setDate(w.getDate()-6); w.setHours(0,0,0,0);
          return d >= w;
        }
        case 'Tháng này':
          return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
        default: return true;
      }
    });
  }, [allOrders, selectedPeriod]);

  const todayOrders = React.useMemo(() => {
    const now = new Date();
    return allOrders.filter(o => new Date(o.createdAt).toDateString() === now.toDateString());
  }, [allOrders]);

  const yesterdayOrders = React.useMemo(() => {
    const y = new Date(); y.setDate(y.getDate()-1);
    return allOrders.filter(o => new Date(o.createdAt).toDateString() === y.toDateString());
  }, [allOrders]);

  const revenue = filteredOrders.reduce((s,o) => s+Number(o.subtotal), 0);
  const todayRevenue = todayOrders.reduce((s,o) => s+Number(o.subtotal), 0);
  const yesterdayRevenue = yesterdayOrders.reduce((s,o) => s+Number(o.subtotal), 0);

  // ─── Chart bars ───────────────────────────────────────────
  const chartBars = React.useMemo((): ChartBar[] => {
    if (activeTab === 'Theo giờ') {
      const map: Record<number,number> = {};
      HOURS.forEach(h => { map[h]=0; });
      filteredOrders.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        if (h>=6) map[h] = (map[h]??0)+Number(o.subtotal);
      });
      return HOURS.map(h => ({ label:`${h}h`, value:map[h] }));
    }
    if (activeTab === 'Theo thứ') {
      const days = ['CN','T2','T3','T4','T5','T6','T7'];
      const map: Record<number,number> = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
      filteredOrders.forEach(o => {
        const d = new Date(o.createdAt).getDay();
        map[d] = (map[d]??0)+Number(o.subtotal);
      });
      return days.map((label,i) => ({ label, value:map[i] }));
    }
    // Theo ngày — 30 ngày
    const bars: ChartBar[] = [];
    for (let i=29;i>=0;i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const val = allOrders
        .filter(o => new Date(o.createdAt).toDateString()===d.toDateString())
        .reduce((s,o) => s+Number(o.subtotal), 0);
      bars.push({ label:`${d.getDate()}/${d.getMonth()+1}`, value:val });
    }
    return bars;
  }, [filteredOrders, allOrders, activeTab]);

  const maxVal = Math.max(...chartBars.map(b=>b.value), 1);

  const pctChange = (cur: number, prev: number) => {
    if (prev===0) return cur>0?'+100%':null;
    const p = Math.round(((cur-prev)/prev)*100);
    return `${p>=0?'+':''}${p}%`;
  };

  const STATS = [
    {
      icon:faDollarSign, iconBg:'#3b82f6',
      label:`${todayOrders.length} đơn hoàn thành`,
      value: isAdmin ? fmt(todayRevenue) : `${todayOrders.length} đơn`,
      change: isAdmin
        ? pctChange(todayRevenue, yesterdayRevenue)
        : pctChange(todayOrders.length, yesterdayOrders.length),
      sub: isAdmin
        ? `Hôm qua ${fmt(yesterdayRevenue)}`
        : `Hôm qua ${yesterdayOrders.length} đơn`,
    },
    {
      icon:faClipboardCheck, iconBg:'#14b8a6',
      label:'Đang phục vụ',
      value:String(activeOrders.length),
      change:null, sub:'Đơn đang mở bàn',
    },
    {
      icon:faBoxOpen, iconBg:lowStock.length>0?'#f59e0b':'#8b5cf6',
      label:'Sắp hết hàng',
      value:String(lowStock.length),
      change:null,
      sub:lowStock.length>0?'Cần nhập thêm':'Tồn kho ổn định',
    },
  ];

  return (
    <div style={{display:'flex',gap:16,padding:16,background:'#f3f4f6',
      minHeight:'calc(100vh - 92px)',fontFamily:'Segoe UI, sans-serif'}}>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:16,minWidth:0}}>

        {/* Stats card */}
        <div style={{background:'#fff',borderRadius:10,padding:'18px 20px',
          boxShadow:'0 1px 3px rgba(0,0,0,0.07)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <h2 style={{fontSize:12,fontWeight:700,color:'#374151',letterSpacing:'0.5px',margin:0}}>
              KẾT QUẢ BÁN HÀNG — {selectedPeriod.toUpperCase()}
            </h2>
            <button onClick={() => setRefreshKey(k=>k+1)}
              style={{background:'none',border:'none',cursor:'pointer',color:'#3b82f6',fontSize:13,padding:4}}
              title="Làm mới">
              <FontAwesomeIcon icon={faSyncAlt} spin={loading}/>
            </button>
          </div>

          {loading ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',
              padding:'24px 0',gap:8,color:'#9ca3af'}}>
              <FontAwesomeIcon icon={faSpinner} spin/>
              <span style={{fontSize:13}}>Đang tải...</span>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center'}}>
              {STATS.map((s,i) => (
                <React.Fragment key={s.label}>
                  {i>0 && <div style={{width:1,height:50,background:'#e5e7eb',margin:'0 4px'}}/>}
                  <div style={{display:'flex',alignItems:'center',gap:12,flex:1,
                    padding:'0 16px',...(i===0?{paddingLeft:0}:{})}}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:s.iconBg,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:'#fff',flexShrink:0}}>
                      <FontAwesomeIcon icon={s.icon}/>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:2}}>
                      <span style={{fontSize:12,color:'#6b7280'}}>{s.label}</span>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:22,fontWeight:700,color:'#111827',lineHeight:1}}>
                          {s.value}
                        </span>
                        {s.change && (
                          <span style={{fontSize:12,fontWeight:600,color:'#22c55e',
                            display:'flex',alignItems:'center',gap:2}}>
                            <FontAwesomeIcon icon={faArrowUp}/> {s.change}
                          </span>
                        )}
                      </div>
                      <span style={{fontSize:11,color:'#9ca3af'}}>{s.sub}</span>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Chart card */}
        <div style={{background:'#fff',borderRadius:10,padding:'18px 20px',
          boxShadow:'0 1px 3px rgba(0,0,0,0.07)',flex:1}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <h2 style={{fontSize:12,fontWeight:700,color:'#374151',letterSpacing:'0.5px',margin:0}}>
                DOANH SỐ {selectedPeriod.toUpperCase()}
              </h2>
              {isAdmin && !loading && (
                <span style={{fontSize:16,fontWeight:700,color:'#111827'}}>{fmt(revenue)}</span>
              )}
            </div>
            <div style={{position:'relative'}}>
              <button
                style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',
                  border:'1px solid #e5e7eb',background:'#fff',borderRadius:6,
                  fontSize:13,color:'#374151',cursor:'pointer',fontFamily:'inherit'}}
                onClick={() => setShowPeriodMenu(v=>!v)}>
                {selectedPeriod} <FontAwesomeIcon icon={faChevronDown} style={{fontSize:10}}/>
              </button>
              {showPeriodMenu && (
                <div style={{position:'absolute',top:36,right:0,width:150,background:'#fff',
                  border:'1px solid #e5e7eb',borderRadius:8,
                  boxShadow:'0 4px 12px rgba(0,0,0,0.1)',zIndex:10}}>
                  {PERIODS.map(p => (
                    <div key={p}
                      style={{padding:'10px 12px',cursor:'pointer',fontSize:13,
                        color:p===selectedPeriod?'#16a34a':'#374151',
                        fontWeight:p===selectedPeriod?600:400,
                        background:p===selectedPeriod?'#f0fdf4':'transparent'}}
                      onClick={() => { setSelectedPeriod(p); setShowPeriodMenu(false); }}>
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',borderBottom:'2px solid #e5e7eb',marginBottom:16}}>
            {tabs.map(tab => (
              <button key={tab}
                style={{padding:'8px 16px',background:'transparent',border:'none',
                  borderBottom:activeTab===tab?'2px solid #16a34a':'2px solid transparent',
                  marginBottom:-2,cursor:'pointer',fontSize:13.5,
                  color:activeTab===tab?'#16a34a':'#6b7280',
                  fontWeight:activeTab===tab?600:400,fontFamily:'inherit'}}
                onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>

          {loading
            ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',
                height:160,color:'#9ca3af',gap:8}}>
                <FontAwesomeIcon icon={faSpinner} spin/>
                <span style={{fontSize:13}}>Đang tải...</span>
              </div>
            : <BarChart bars={chartBars} maxVal={maxVal}/>
          }
        </div>
      </div>

      {/* Sidebar */}
      <aside style={{width:280,flexShrink:0,display:'flex',flexDirection:'column',gap:12}}>

        {lowStock.length > 0 && (
          <div style={{background:'#fff',borderRadius:10,padding:'14px 16px',
            boxShadow:'0 1px 3px rgba(0,0,0,0.07)',borderLeft:'4px solid #f59e0b'}}>
            <h3 style={{fontSize:12,fontWeight:700,color:'#92400e',
              margin:'0 0 10px',display:'flex',alignItems:'center',gap:6,letterSpacing:'0.5px'}}>
              <FontAwesomeIcon icon={faTriangleExclamation} style={{color:'#f59e0b'}}/>
              SẮP HẾT HÀNG
            </h3>
            {lowStock.map(p => (
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',
                alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:13,color:'#374151',overflow:'hidden',
                  textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:170}}>{p.name}</span>
                <span style={{fontSize:12,fontWeight:700,
                  color:p.stock===0?'#ef4444':'#f59e0b',
                  background:p.stock===0?'#fef2f2':'#fffbeb',
                  padding:'2px 8px',borderRadius:4}}>
                  {p.stock===0?'Hết':`Còn ${p.stock}`}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{background:'#fff',borderRadius:10,padding:'14px 16px',
          boxShadow:'0 1px 3px rgba(0,0,0,0.07)'}}>
          <h3 style={{fontSize:12,fontWeight:700,color:'#374151',
            margin:'0 0 10px',letterSpacing:'0.5px',display:'flex',alignItems:'center',gap:6}}>
            <FontAwesomeIcon icon={faClipboardCheck} style={{color:'#14b8a6'}}/>
            TÌNH TRẠNG HÔM NAY
          </h3>
          {loading
            ? <div style={{height:60,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <FontAwesomeIcon icon={faSpinner} spin style={{color:'#9ca3af'}}/>
              </div>
            : <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {[
                  {label:'Đơn hoàn thành', val:todayOrders.length, color:'#16a34a'},
                  {label:'Đang phục vụ',   val:activeOrders.length, color:'#14b8a6'},
                  ...(isAdmin?[{label:'Doanh thu hôm nay', val:fmt(todayRevenue), color:'#3b82f6'}]:[]),
                ].map(item => (
                  <div key={item.label} style={{display:'flex',justifyContent:'space-between',
                    alignItems:'center',padding:'6px 10px',background:'#f9fafb',borderRadius:6}}>
                    <span style={{fontSize:13,color:'#6b7280'}}>{item.label}</span>
                    <span style={{fontSize:14,fontWeight:700,color:item.color}}>{item.val}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </aside>
    </div>
  );
};

export default Dashboard;