
import React, { useState, useMemo, useEffect } from 'react';
import { ServiceCall, Status, Priority, Technician, Customer, UserAccount, AvailabilityStatus } from './types';
import { analyzeServiceCall } from './services/geminiService';
import { 
  LayoutDashboard, ClipboardList, Plus, Search, Clock, 
  CheckCircle2, AlertCircle, BrainCircuit, User, MapPin, 
  Phone, ChevronLeft, HardHat, Trash2, Edit3, Printer, 
  Calendar, GripVertical, X, FileSpreadsheet,
  UserCog, Users, Loader2, LogOut, BadgeInfo,
  ChevronRight, Save, TrendingUp, Activity, Timer, 
  Zap, Info, Star, Hash, Check, ShieldCheck, Wrench, ArrowUpRight, ListTodo, Building2, Store,
  Plane, Stethoscope, CheckCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const BRAND_RED = '#c61d23';
const COMPLETED_GREEN = '#4CAF50';
const TECH_COLORS = [BRAND_RED, '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

// --- UTILS ---
const generateId = (prefix: string, index: number) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `${prefix}-${year}${month}-${String(index).padStart(3, '0')}`;
};

const isTechAvailableOnDate = (tech: Technician, date: string) => {
  if (tech.availabilityStatus === 'Available') return true;
  if (!tech.statusStartDate || !tech.statusEndDate) return true;
  
  const checkDate = new Date(date);
  const start = new Date(tech.statusStartDate);
  const end = new Date(tech.statusEndDate);
  
  // Set times to midnight for accurate day comparison
  checkDate.setHours(0,0,0,0);
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);

  const isBetween = checkDate >= start && checkDate <= end;
  return !isBetween; // If it is between, they are NOT available
};

// --- MOCK DATA ---
const INITIAL_USERS: UserAccount[] = [
  { id: 'U1', name: 'אורית מנהלת', role: 'מנהלת מוקד', email: 'orit@techflow.ai', avatarColor: BRAND_RED },
  { id: 'U2', name: 'משה מוקדן', role: 'שירות לקוחות', email: 'moshe@techflow.ai', avatarColor: '#475569' }
];

const INITIAL_TECH: Technician[] = [
  { id: 'T1', name: 'יוסי כהן', specialty: 'מיזוג אוויר', phone: '052-1112222', active: true, color: TECH_COLORS[0], availabilityStatus: 'Available' },
  { id: 'T2', name: 'דנה מזרחי', specialty: 'מכשירי חשמל', phone: '054-3334444', active: true, color: TECH_COLORS[3], availabilityStatus: 'Available' },
  { id: 'T3', name: 'אבי לוי', specialty: 'אינסטלציה', phone: '050-9998888', active: true, color: TECH_COLORS[2], availabilityStatus: 'Available' }
];

const INITIAL_CUSTOMERS: Customer[] = [
  { 
    id: 'C-202501-001', 
    companyName: 'יצחק לוי - פרטי', 
    businessId: '052123456', 
    contactPerson: 'יצחק', 
    email: 'isaac@example.com', 
    phone: '052-1234567', 
    address: 'הרצל 12 קומה 4 דירה 18', 
    city: 'תל אביב' 
  },
  { 
    id: 'C-202501-002', 
    companyName: 'בנק הפועלים', 
    businessId: '515123456', 
    branchNumber: '132', 
    branchName: 'סניף ראשי', 
    contactPerson: 'דוד המנהל', 
    email: 'bank@hapoalim.co.il', 
    phone: '03-5555555', 
    address: 'דרך מנחם בגין 132', 
    city: 'תל אביב' 
  }
];

const INITIAL_CALLS: ServiceCall[] = [
  {
    id: 'SC-1001', orderNumber: 'ORD-5500', customerId: 'C-202501-001', customerName: 'יצחק לוי - פרטי', contactPerson: 'יצחק', city: 'תל אביב', address: 'הרצל 12 קומה 4 דירה 18', phone: '052-1234567',
    description: 'תיקון מזגן דולף בסלון.', status: 'Open', priority: 'High', openedByUserId: 'U1', openedByName: 'אורית מנהלת',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledDate: new Date().toISOString().split('T')[0]
  },
  {
    id: 'SC-1002', orderNumber: 'ORD-5501', customerId: 'C-202501-002', customerName: 'בנק הפועלים (סניף 132)', contactPerson: 'דוד המנהל', city: 'תל אביב', address: 'דרך מנחם בגין 132 מגדל עזריאלי קומה 24', phone: '03-5555555 שלוחה 120',
    description: 'קצר בלוח חשמל ראשי', status: 'In Progress', priority: 'Critical', openedByUserId: 'U1', openedByName: 'אורית מנהלת',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledDate: new Date().toISOString().split('T')[0],
    technicianId: 'T1', scheduledTime: '08:00', specialEquipment: 'מולטימטר דיגיטלי, סט מפתחות מבודדים'
  }
];

const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [calls, setCalls] = useState<ServiceCall[]>(INITIAL_CALLS);
  const [techs, setTechs] = useState<Technician[]>(INITIAL_TECH);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calls' | 'techs' | 'customers' | 'users' | 'new-call' | 'calendar'>('dashboard');
  
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('day');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTech, setFilterTech] = useState('All');
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All');
  const [filterPriority, setFilterPriority] = useState<Priority | 'All'>('All');
  const [filterDateMode, setFilterDateMode] = useState<'All' | 'Today'>('All');
  
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [draggedCallId, setDraggedCallId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingItem, setEditingItem] = useState<{type: 'tech' | 'cust' | 'user', data: any} | null>(null);
  const [liveFeed, setLiveFeed] = useState<{ id: string, message: string, time: string, type: 'new' | 'update' | 'done' }[]>([]);

  // Controlled form state for New Call
  const [newCallForm, setNewCallForm] = useState({
    customerId: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    city: '',
    address: '',
    orderNumber: '',
    priority: 'Medium' as Priority,
    description: '',
    specialEquipment: ''
  });

  useEffect(() => {
    const messages = [
      { id: '1', message: 'קריאה חדשה נפתחה ללקוח יצחק לוי', time: '10:15', type: 'new' },
      { id: '2', message: 'טכנאי יוסי כהן התחיל טיפול בקריאה ORD-5501', time: '10:30', type: 'update' },
      { id: '3', message: 'קריאה ORD-1022 הושלמה בהצלחה', time: '11:00', type: 'done' }
    ] as any;
    setLiveFeed(messages);
  }, []);

  const addToFeed = (message: string, type: 'new' | 'update' | 'done') => {
    setLiveFeed(prev => [{ id: Date.now().toString(), message, time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), type }, ...prev].slice(0, 10));
  };

  const updateCall = (updatedCall: ServiceCall) => {
    if (!currentUser) return;
    const callWithAudit = {
      ...updatedCall,
      updatedAt: new Date().toISOString(),
      lastUpdatedByUserId: currentUser.id,
      lastUpdatedByName: currentUser.name
    };
    setCalls(prev => {
      const existing = prev.find(c => c.id === updatedCall.id);
      if (existing && (existing.status !== updatedCall.status || existing.technicianId !== updatedCall.technicianId)) {
        const type = updatedCall.status === 'Completed' ? 'done' : 'update';
        addToFeed(`עודכנה קריאה ${updatedCall.orderNumber} (סטטוס: ${updatedCall.status})`, type);
      }
      return prev.map(c => c.id === callWithAudit.id ? callWithAudit : c);
    });
  };

  const assignCall = (callId: string, techId: string, time: string, date?: string) => {
    const call = calls.find(c => c.id === callId);
    const tech = techs.find(t => t.id === techId);
    const targetDate = date || calendarDate;
    
    if (call && tech) {
      if (!isTechAvailableOnDate(tech, targetDate)) {
        alert(`שים לב: הטכנאי ${tech.name} אינו זמין בתאריך ${targetDate} (${tech.availabilityStatus === 'Vacation' ? 'חופשה' : 'מחלה'})`);
        return;
      }
      updateCall({ 
        ...call, 
        status: 'Scheduled', 
        technicianId: techId, 
        scheduledTime: time, 
        scheduledDate: targetDate 
      });
      addToFeed(`קריאה ${call.orderNumber} שובצה לטכנאי ${tech.name}`, 'update');
    }
    setDraggedCallId(null);
  };

  const unassignCall = (callId: string) => {
    const call = calls.find(c => c.id === callId);
    if (call) {
      updateCall({
        ...call,
        status: 'Open',
        technicianId: undefined,
        scheduledTime: undefined,
        scheduledDate: undefined
      });
      addToFeed(`שיבוץ קריאה ${call.orderNumber} בוטל`, 'update');
    }
    setDraggedCallId(null);
  };

  const handleAIAnalyze = async (id: string) => {
    const call = calls.find(c => c.id === id);
    if (!call) return;
    setIsAnalyzing(true);
    const res = await analyzeServiceCall(call.description);
    if (res) updateCall({ ...call, aiAnalysis: res, priority: res.suggestedPriority });
    setIsAnalyzing(false);
  };

  const drillToCalls = (filters: { status?: Status | 'All', priority?: Priority | 'All', dateMode?: 'All' | 'Today' }) => {
    setFilterStatus(filters.status || 'All');
    setFilterPriority(filters.priority || 'All');
    setFilterDateMode(filters.dateMode || 'All');
    setSearchTerm('');
    setFilterTech('All');
    setActiveTab('calls');
  };

  const filteredCalls = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return calls.filter(c => {
      const s = searchTerm.toLowerCase();
      const matchSearch = 
        c.customerName.toLowerCase().includes(s) || 
        c.city.toLowerCase().includes(s) || 
        c.orderNumber.toLowerCase().includes(s) ||
        (c.customerId && c.customerId.toLowerCase().includes(s));
      
      const matchTech = filterTech === 'All' || c.technicianId === filterTech;
      const matchStatus = filterStatus === 'All' || c.status === filterStatus;
      const matchPriority = filterPriority === 'All' || c.priority === filterPriority;
      const matchDate = filterDateMode === 'All' || c.scheduledDate === today;
      return matchSearch && matchTech && matchStatus && matchPriority && matchDate;
    });
  }, [calls, searchTerm, filterTech, filterStatus, filterPriority, filterDateMode]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const open = calls.filter(c => c.status === 'Open').length;
    const scheduledToday = calls.filter(c => c.scheduledDate === today && c.status !== 'Completed' && c.status !== 'Open').length;
    const completedToday = calls.filter(c => c.scheduledDate === today && c.status === 'Completed').length;
    const critical = calls.filter(c => c.priority === 'Critical' && c.status !== 'Completed').length;

    return { open, scheduledToday, completedToday, critical };
  }, [calls]);

  const printServiceCall = (callId: string) => {
    const call = calls.find(c => c.id === callId);
    if (!call) return;
    const tech = techs.find(t => t.id === call.technicianId);

    const win = window.open('', '_blank');
    if (!win) return;
    const BRAND_RED = '#c61d23';
    
    win.document.write(`
      <html dir="rtl"><head><title>קריאת שירות ${call.orderNumber}</title>
      <style>
        body{font-family:'Assistant',sans-serif;padding:40px;color:#1e293b;line-height:1.5;background:#f8fafc}
        .header{border-bottom:4px solid ${BRAND_RED};padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center}
        .brand-logo{background:${BRAND_RED};color:white;padding:15px 30px;font-weight:900;font-size:32px;border-radius:4px;display:flex;align-items:center;gap:5px;}
        .card{background:#fff; border:1px solid #e2e8f0; border-radius:15px; padding:30px; box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom:20px;}
        .row{display:flex; gap:20px; margin-bottom:15px;}
        .col{flex:1;}
        .label{font-size:14px; font-weight:bold; color:#64748b; margin-bottom:5px;}
        .value{font-size:18px; font-weight:bold; color:#0f172a;}
        .tag{display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:bold; background:#f1f5f9; margin-left:10px;}
        .eq-box{background:#fff1f2; border:2px solid ${BRAND_RED}; color:#7f1d1d; padding:15px; border-radius:10px; font-weight:bold; margin-top:20px;}
        .desc-box{background:#f8fafc; padding:20px; border-radius:10px; border:1px solid #e2e8f0; font-size:18px; margin-top:10px;}
        .footer{margin-top:50px; border-top:2px dashed #cbd5e1; padding-top:30px; display:flex; justify-content:space-between; font-weight:bold; color:#64748b;}
      </style></head>
      <body>
        <div class="header">
          <div class="brand-logo">RAFI SHAPIRA GROUP</div>
          <div>
            <h1 style="margin:0; font-size:24px;">קריאת שירות: ${call.orderNumber}</h1>
            <p style="margin:5px 0 0 0; color:#64748b;">הופק בתאריך: ${new Date().toLocaleDateString('he-IL')} בשעה ${new Date().toLocaleTimeString('he-IL')}</p>
          </div>
        </div>

        <div class="card">
            <h2 style="margin-top:0; color:${BRAND_RED}; font-size:20px; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">פרטי לקוח</h2>
            <div class="row">
                <div class="col"><div class="label">שם הלקוח</div><div class="value">${call.customerName}</div></div>
                <div class="col"><div class="label">איש קשר</div><div class="value">${call.contactPerson}</div></div>
                <div class="col"><div class="label">טלפון</div><div class="value">${call.phone}</div></div>
            </div>
            <div class="row">
                <div class="col"><div class="label">עיר</div><div class="value">${call.city}</div></div>
                <div class="col"><div class="label">כתובת</div><div class="value">${call.address}</div></div>
                <div class="col"><div class="label">מזהה לקוח</div><div class="value">${call.customerId}</div></div>
            </div>
        </div>

        <div class="card">
            <h2 style="margin-top:0; color:${BRAND_RED}; font-size:20px; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">פרטי התקלה והטיפול</h2>
            <div style="margin-bottom:20px;">
                <span class="tag">סטטוס: ${call.status}</span>
                <span class="tag">דחיפות: ${call.priority}</span>
            </div>
            <div class="label">תיאור התקלה:</div>
            <div class="desc-box">${call.description}</div>
            
            ${call.specialEquipment ? `<div class="eq-box">⚠️ ציוד נדרש: ${call.specialEquipment}</div>` : ''}
        </div>

        <div class="card">
             <h2 style="margin-top:0; color:${BRAND_RED}; font-size:20px; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">שיבוץ טכנאי</h2>
             <div class="row">
                <div class="col"><div class="label">טכנאי משובץ</div><div class="value">${tech ? tech.name : 'טרם שובץ'}</div></div>
                <div class="col"><div class="label">תאריך ביצוע</div><div class="value">${call.scheduledDate || '-'}</div></div>
                <div class="col"><div class="label">שעת הגעה</div><div class="value">${call.scheduledTime || '-'}</div></div>
             </div>
        </div>

        <div class="footer">
            <div>חתימת הלקוח: ____________________</div>
            <div>חתימת המתקין: ____________________</div>
        </div>

        <script>window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  const printTechSchedule = (techId: string) => {
    const tech = techs.find(t => t.id === techId);
    if (!tech) return;
    const techCalls = calls.filter(c => c.technicianId === techId && c.status !== 'Completed');
    const win = window.open('', '_blank');
    if (!win) return;
    const BRAND_RED = '#c61d23';
    win.document.write(`
      <html dir="rtl"><head><title>סידור עבודה - ${tech.name}</title>
      <style>
        body{font-family:'Assistant',sans-serif;padding:40px;color:#1e293b;line-height:1.5;background:#f8fafc}
        .header{border-bottom:4px solid ${BRAND_RED};padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center}
        .brand-logo{background:${BRAND_RED};color:white;padding:15px 30px;font-weight:900;font-size:32px;border-radius:4px;display:flex;align-items:center;gap:5px;}
        .call-card{border:1px solid #e2e8f0;padding:25px;margin-bottom:20px;border-radius:15px;background:#fff;page-break-inside:avoid;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1)}
        .equipment-box{margin-top:15px; padding:20px; background:#fff1f2; border:3px solid ${BRAND_RED}; border-radius:12px;}
        .equipment-title{color:${BRAND_RED}; font-size:20px; font-weight:900; display:flex; align-items:center; gap:8px; margin-bottom:10px;}
        .priority-badge{padding:4px 12px; border-radius:20px; font-weight:bold; font-size:12px; background:#f1f5f9;}
      </style></head>
      <body>
        <div class="header">
          <div class="brand-logo">RAFI SHAPIRA GROUP</div>
          <div><h1>סידור עבודה: ${tech.name}</h1><p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p></div>
        </div>
        ${techCalls.map(c => `
          <div class="call-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <b>${c.orderNumber}</b>
              <div style="display:flex;gap:10px;align-items:center;">
                <span class="priority-badge">דחיפות: ${c.priority}</span>
                <span>#${c.customerId}</span>
              </div>
            </div>
            <div style="font-size:28px;margin:15px 0;font-weight:bold;color:#0f172a;">${c.customerName}</div>
            <div style="font-size:18px;"><b>כתובת:</b> ${c.city}, ${c.address}</div>
            <div style="font-size:18px;"><b>איש קשר:</b> ${c.contactPerson || 'לא צוין'}</div>
            <div style="font-size:18px;"><b>טלפון:</b> ${c.phone}</div>
            <div style="margin-top:20px; padding-top:15px; border-top:1px solid #f1f5f9;"><b>תיאור התקלה:</b> ${c.description}</div>
            
            ${c.specialEquipment ? `
            <div class="equipment-box">
              <div class="equipment-title">⚠️ ציוד נדרש לביצוע:</div>
              <div style="font-size:18px; font-weight:bold; color:#450a0a;">${c.specialEquipment}</div>
            </div>` : ''}
          </div>
        `).join('')}
        <script>window.print(); window.close();</script>
      </body></html>`);
    win.document.close();
  };

  const UnscheduledSidebar = () => (
    <div className="w-96 bg-white border-r border-slate-200 flex flex-col no-print shadow-2xl relative z-10 h-full">
      <div className="p-8 border-b border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800">קריאות פתוחות</h3>
          <span className="bg-red-50 text-[#c61d23] px-3 py-1 rounded-full text-xs font-black">{calls.filter(c => c.status === 'Open').length}</span>
        </div>
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="חיפוש קריאה..." className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-2xl border-transparent outline-none font-bold text-sm focus:bg-white focus:border-[#c61d23] transition-all" />
        </div>
      </div>
      <div 
        className={`flex-grow overflow-y-auto p-6 space-y-4 transition-all ${draggedCallId ? 'bg-red-50/50' : ''}`}
        onDragOver={e => e.preventDefault()}
        onDrop={() => draggedCallId && unassignCall(draggedCallId)}
      >
        {calls.filter(c => c.status === 'Open').sort((a,b) => {
          const priorityWeight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        }).map(c => (
          <div 
            key={c.id} 
            draggable 
            onDragStart={() => setDraggedCallId(c.id)}
            onClick={() => setSelectedCallId(c.id)}
            className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm cursor-grab hover:border-[#c61d23] group transition-all active:scale-95 hover:shadow-lg"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-mono font-bold text-slate-300 group-hover:text-[#c61d23]">{c.orderNumber}</span>
              <PriorityBadge priority={c.priority} />
            </div>
            <p className="text-lg font-black text-slate-800 mb-1">{c.customerName}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <MapPin size={12} /> {c.city}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Phone size={12} /> {c.phone}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const CompanyLogo = ({ size = 'normal', className = "", inverted = false }: { size?: 'small' | 'normal' | 'large', className?: string, inverted?: boolean }) => {
    const sizes = {
      small: { container: 'px-2 py-1', main: 'text-[10px]', group: 'text-[4px]' },
      normal: { container: 'px-5 py-2.5', main: 'text-xl', group: 'text-[8px]' },
      large: { container: 'px-10 py-5', main: 'text-4xl', group: 'text-[12px]' }
    };
    const s = sizes[size];
    const bg = inverted ? 'bg-white' : 'bg-[#c61d23]';
    const text = inverted ? 'text-[#c61d23]' : 'text-white';
    
    return (
      <div className={`${bg} ${text} font-black flex items-center justify-center gap-1 leading-none shadow-sm rounded-sm ${s.container} ${className}`} style={{ fontFamily: 'Assistant, sans-serif' }}>
        <span className={s.main}>RAFI SHAPIRA</span>
        <span className={`${s.group} self-start mt-0.5 opacity-90`}>GROUP</span>
      </div>
    );
  };

  const handleNewCallCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    const customer = customers.find(c => c.id === custId);
    if (customer) {
      setNewCallForm(prev => ({
        ...prev,
        customerId: customer.id,
        companyName: customer.companyName,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        city: customer.city,
        address: customer.address
      }));
    } else {
      setNewCallForm(prev => ({
        ...prev,
        customerId: '',
        companyName: '',
        contactPerson: '',
        phone: '',
        city: '',
        address: ''
      }));
    }
  };

  const handleNewCallFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewCallForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNewCallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const opBy = currentUser;
    const newCall: ServiceCall = {
      id: `SC-${Math.floor(1000 + Math.random() * 9000)}`,
      orderNumber: newCallForm.orderNumber,
      customerId: newCallForm.customerId || generateId('C', customers.length + 1),
      customerName: newCallForm.companyName,
      contactPerson: newCallForm.contactPerson,
      city: newCallForm.city,
      phone: newCallForm.phone,
      address: newCallForm.address,
      description: newCallForm.description,
      specialEquipment: newCallForm.specialEquipment,
      priority: newCallForm.priority,
      openedByUserId: opBy.id, 
      openedByName: opBy.name, 
      status: 'Open',
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString()
    };
    setCalls([newCall, ...calls]);
    addToFeed(`קריאה חדשה ${newCall.orderNumber} נפתחה`, 'new');
    
    // Reset form
    setNewCallForm({
      customerId: '',
      companyName: '',
      contactPerson: '',
      phone: '',
      city: '',
      address: '',
      orderNumber: '',
      priority: 'Medium',
      description: '',
      specialEquipment: ''
    });
    
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100 overflow-hidden relative">
        <div className="bg-white p-12 rounded-[60px] shadow-2xl w-full max-w-xl text-center space-y-10 border border-slate-200">
          <CompanyLogo size="large" />
          <h1 className="text-3xl font-black text-slate-800">כניסה למערכת</h1>
          <div className="grid grid-cols-1 gap-4">
             {users.map(u => (
               <button key={u.id} onClick={() => setCurrentUser(u)} className="flex items-center gap-4 p-6 bg-slate-50 border border-slate-200 rounded-3xl hover:border-[#c61d23] hover:bg-red-50 transition-all group">
                 <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg" style={{ backgroundColor: u.avatarColor }}>{u.name[0]}</div>
                 <div className="text-right flex-grow">
                   <p className="text-xl font-black text-slate-800">{u.name}</p>
                   <p className="text-slate-400 font-bold text-sm">{u.role}</p>
                 </div>
                 <ChevronLeft className="text-slate-300 group-hover:text-[#c61d23]" />
               </button>
             ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans rtl text-lg" dir="rtl">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20 no-print transition-all">
        <div className="p-6 bg-slate-950 flex justify-center">
          <CompanyLogo size="small" className="w-full" />
        </div>
        <nav className="flex-grow p-3 space-y-1 overflow-y-auto">
          <SidebarLink active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="לוח בקרה" />
          <SidebarLink active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={20}/>} label="יומן שיבוצים" />
          <SidebarLink active={activeTab === 'calls'} onClick={() => setActiveTab('calls')} icon={<ClipboardList size={20}/>} label="ניהול קריאות" />
          <div className="h-px bg-slate-800/50 my-3 mx-4"></div>
          <SidebarLink active={activeTab === 'techs'} onClick={() => setActiveTab('techs')} icon={<HardHat size={20}/>} label="טכנאים" />
          <SidebarLink active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={20}/>} label="לקוחות" />
          <SidebarLink active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<UserCog size={20}/>} label="משתמשים" />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setCurrentUser(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl flex items-center justify-center gap-2 text-sm"><LogOut size={14} /> התנתקות</button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between no-print">
          <h2 className="text-2xl font-black text-slate-800">
            {activeTab === 'dashboard' ? 'ניהול תפעולי' : activeTab === 'calendar' ? 'יומן עבודה' : activeTab === 'calls' ? 'ניהול קריאות' : activeTab === 'techs' ? 'ניהול צוות טכנאים' : activeTab === 'customers' ? 'מאגר לקוחות' : activeTab === 'users' ? 'משתמשי מערכת' : 'ניהול'}
          </h2>
          <button onClick={() => setActiveTab('new-call')} className="bg-[#c61d23] hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 text-sm"><Plus size={18} /> קריאה חדשה</button>
        </header>

        <div className="flex-grow overflow-hidden relative">
          {activeTab === 'dashboard' && (
            <div className="h-full overflow-y-auto p-6 space-y-6 bg-slate-100/50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard 
                  title="ממתינות לשיבוץ" 
                  value={stats.open} 
                  icon={<AlertCircle className="text-[#c61d23]" size={24} />} 
                  color="bg-white" 
                  textColor="text-[#c61d23]" 
                  onClick={() => drillToCalls({status: 'Open'})}
                />
                <MetricCard 
                  title="קריאות קריטיות" 
                  value={stats.critical} 
                  icon={<Zap className="text-orange-500" size={24} />} 
                  color="bg-white" 
                  textColor="text-orange-600" 
                  onClick={() => drillToCalls({priority: 'Critical'})}
                />
                <MetricCard 
                  title="משימות להיום" 
                  value={stats.scheduledToday} 
                  icon={<ListTodo className="text-blue-500" size={24} />} 
                  color="bg-white" 
                  onClick={() => drillToCalls({dateMode: 'Today', status: 'Scheduled'})}
                />
                <MetricCard 
                  title="בוצע היום" 
                  value={stats.completedToday} 
                  icon={<CheckCircle2 className="text-emerald-500" size={24} />} 
                  color="bg-white" 
                  textColor="text-emerald-600" 
                  onClick={() => drillToCalls({dateMode: 'Today', status: 'Completed'})}
                />
              </div>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <ArrowUpRight className="text-[#c61d23]" size={20} /> קריאות דחופות לשיבוץ
                  </h3>
                  <button onClick={() => drillToCalls({status: 'Open'})} className="text-[#c61d23] font-bold text-xs hover:underline">למעבר לניהול קריאות</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {calls.filter(c => c.status === 'Open').slice(0, 6).map(c => (
                    <div key={c.id} onClick={() => setSelectedCallId(c.id)} className="bg-white p-4 rounded-[24px] border-r-4 border-[#c61d23] shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5">
                       <div className="flex justify-between mb-1">
                          <span className="text-[9px] font-bold text-slate-400">{c.orderNumber}</span>
                          <PriorityBadge priority={c.priority} />
                       </div>
                       <h4 className="font-black text-slate-800 text-lg truncate">{c.customerName}</h4>
                       <p className="text-xs text-slate-500 mb-2 truncate">{c.city}, {c.address}</p>
                       <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-t pt-2 border-slate-50">
                          <span>{new Date(c.createdAt).toLocaleDateString('he-IL')}</span>
                          <span className="flex items-center gap-1"><Phone size={10}/> {c.phone}</span>
                       </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Clock className="text-blue-500" size={20} /> תור עבודה מתוכנן
                </h3>
                <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400">
                      <tr>
                        <th className="px-6 py-3">תאריך ושעה</th>
                        <th className="px-6 py-3">לקוח</th>
                        <th className="px-6 py-3">מתקין</th>
                        <th className="px-6 py-3">סטטוס</th>
                        <th className="px-6 py-3 text-left"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {calls
                        .filter(c => c.status !== 'Open' && c.status !== 'Cancelled')
                        .sort((a,b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))
                        .slice(0, 10)
                        .map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedCallId(c.id)}>
                            <td className="px-6 py-3">
                               <div className="font-bold text-slate-800">{c.scheduledDate}</div>
                               <div className="text-[10px] text-slate-400">{c.scheduledTime}</div>
                            </td>
                            <td className="px-6 py-3 font-black text-slate-800">{c.customerName}</td>
                            <td className="px-6 py-3">
                               <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                                 {techs.find(t => t.id === c.technicianId)?.name || 'לא משובץ'}
                               </span>
                            </td>
                            <td className="px-6 py-3"><StatusBadge status={c.status} size="small" /></td>
                            <td className="px-6 py-3 text-left"><ChevronLeft className="text-slate-300" size={16} /></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="p-6 space-y-4 overflow-y-auto h-full">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center no-print">
                 <div className="relative flex-grow min-w-[200px]">
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input type="text" placeholder="חפש לפי לקוח, עיר, הזמנה..." className="w-full pr-10 pl-3 py-3 bg-slate-50 rounded-xl border-transparent outline-none font-bold text-sm focus:bg-white focus:border-[#c61d23] transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 </div>
                 <div className="flex gap-2">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | 'All')} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none">
                       <option value="All">סטטוס</option>
                       <option value="Open">פתוח</option>
                       <option value="Scheduled">משובץ</option>
                       <option value="In Progress">בטיפול</option>
                       <option value="Completed">בוצע</option>
                    </select>
                    <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | 'All')} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none">
                       <option value="All">דחיפות</option>
                       <option value="Critical">קריטי</option>
                       <option value="High">גבוה</option>
                       <option value="Medium">בינוני</option>
                       <option value="Low">נמוך</option>
                    </select>
                    <select value={filterDateMode} onChange={e => setFilterDateMode(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none">
                       <option value="All">תאריך</option>
                       <option value="Today">היום</option>
                    </select>
                 </div>
              </div>
              <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400">
                    <tr>
                      <th className="px-6 py-4">הזמנה</th>
                      <th className="px-6 py-4">לקוח</th>
                      <th className="px-6 py-4">טלפון</th>
                      <th className="px-6 py-4">מתקין</th>
                      <th className="px-6 py-4">תאריך</th>
                      <th className="px-6 py-4">סטטוס</th>
                      <th className="px-6 py-4 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCalls.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedCallId(c.id)}>
                        <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">{c.orderNumber}</td>
                        <td className="px-6 py-4 font-black text-slate-800">{c.customerName}<p className="text-[10px] text-slate-400 font-bold">{c.city}</p></td>
                        <td className="px-6 py-4 font-bold text-slate-600">{c.phone}</td>
                        <td className="px-6 py-4">
                           <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                             {techs.find(t => t.id === c.technicianId)?.name || 'לא שובץ'}
                           </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-500">{c.scheduledDate || '--'}</td>
                        <td className="px-6 py-4"><StatusBadge status={c.status} size="small" /></td>
                        <td className="px-6 py-4 text-left"><ChevronLeft className="text-slate-300" size={16} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {['techs', 'customers', 'users'].includes(activeTab) && (
            <ManagementView 
              items={activeTab === 'techs' ? techs : activeTab === 'customers' ? customers : users}
              type={activeTab === 'techs' ? 'tech' : activeTab === 'customers' ? 'cust' : 'user'}
              onAdd={() => setEditingItem({type: activeTab === 'techs' ? 'tech' : activeTab === 'customers' ? 'cust' : 'user', data: null})}
              onEdit={item => setEditingItem({type: activeTab === 'techs' ? 'tech' : activeTab === 'customers' ? 'cust' : 'user', data: item})}
              onDelete={id => {
                if(!confirm('בטוח שברצונך למחוק?')) return;
                if(activeTab === 'techs') setTechs(prev => prev.filter(x => x.id !== id));
                if(activeTab === 'customers') setCustomers(prev => prev.filter(x => x.id !== id));
                if(activeTab === 'users') setUsers(prev => prev.filter(x => x.id !== id));
              }}
              onPrint={printTechSchedule}
            />
          )}

          {activeTab === 'calendar' && (
            <div className="flex h-full overflow-hidden">
              <div className="flex-grow flex flex-col h-full bg-slate-100 overflow-hidden">
                <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between no-print">
                  <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                      <button onClick={() => setCalendarView('day')} className={`px-3 py-1 rounded text-xs font-bold ${calendarView === 'day' ? 'bg-white shadow text-[#c61d23]' : 'text-slate-500'}`}>יום</button>
                      <button onClick={() => setCalendarView('week')} className={`px-3 py-1 rounded text-xs font-bold ${calendarView === 'week' ? 'bg-white shadow text-[#c61d23]' : 'text-slate-500'}`}>שבוע</button>
                      <button onClick={() => setCalendarView('month')} className={`px-3 py-1 rounded text-xs font-bold ${calendarView === 'month' ? 'bg-white shadow text-[#c61d23]' : 'text-slate-500'}`}>חודש</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => {
                          const d = new Date(calendarDate);
                          if(calendarView === 'day') d.setDate(d.getDate()-1);
                          else if(calendarView === 'week') d.setDate(d.getDate()-7);
                          else d.setMonth(d.getMonth()-1);
                          setCalendarDate(d.toISOString().split('T')[0]);
                      }} className="p-1 hover:bg-slate-200 rounded text-slate-400"><ChevronRight size={14} /></button>
                      <input type="date" value={calendarDate} onChange={e => setCalendarDate(e.target.value)} className="font-black text-slate-800 text-sm outline-none bg-transparent cursor-pointer" />
                      <button onClick={() => {
                          const d = new Date(calendarDate);
                          if(calendarView === 'day') d.setDate(d.getDate()+1);
                          else if(calendarView === 'week') d.setDate(d.getDate()+7);
                          else d.setMonth(d.getMonth()+1);
                          setCalendarDate(d.toISOString().split('T')[0]);
                      }} className="p-1 hover:bg-slate-200 rounded text-slate-400"><ChevronLeft size={14} /></button>
                    </div>
                  </div>
                </div>
                <div className="flex-grow bg-white overflow-auto relative">
                   {calendarView === 'week' && (
                    <div className="grid grid-cols-7 h-full divide-x divide-x-reverse divide-slate-100">
                      {Array.from({length: 7}, (_, i) => {
                        const startOfWeek = new Date(calendarDate);
                        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                        const curDay = new Date(startOfWeek);
                        curDay.setDate(startOfWeek.getDate() + i);
                        const dStr = curDay.toISOString().split('T')[0];
                        const dayCalls = calls.filter(c => c.scheduledDate === dStr);
                        return (
                          <div 
                            key={i} 
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => {
                              if (draggedCallId) {
                                const call = calls.find(c => c.id === draggedCallId);
                                if (call) {
                                  assignCall(draggedCallId, call.technicianId || techs[0].id, call.scheduledTime || '08:00', dStr);
                                }
                              }
                            }}
                            className={`flex flex-col border-l border-slate-100 min-h-[500px] transition-colors ${draggedCallId ? 'bg-red-50/20' : ''}`}
                          >
                            <div className={`p-3 text-center border-b ${dStr === new Date().toISOString().split('T')[0] ? 'bg-red-50' : 'bg-slate-50'}`}>
                              <p className="text-[9px] font-black text-slate-400 uppercase">{curDay.toLocaleDateString('he-IL', {weekday: 'short'})}</p>
                              <p className={`text-xl font-black ${dStr === new Date().toISOString().split('T')[0] ? 'text-[#c61d23]' : 'text-slate-800'}`}>{curDay.getDate()}</p>
                            </div>
                            <div className="flex-grow p-1 space-y-1">
                              {dayCalls.map(c => {
                                const tech = techs.find(t => t.id === c.technicianId);
                                return (
                                  <div 
                                    key={c.id} 
                                    draggable
                                    onDragStart={() => setDraggedCallId(c.id)}
                                    onClick={() => setSelectedCallId(c.id)} 
                                    className={`p-2 rounded-lg border-r-2 shadow-sm text-right cursor-grab hover:shadow-md transition-all ${c.status === 'Completed' ? 'grayscale-[0.3]' : ''}`}
                                    style={{ 
                                      backgroundColor: c.status === 'Completed' ? '#E8F5E9' : (tech ? `${tech.color}15` : '#f8fafc'),
                                      borderColor: c.status === 'Completed' ? COMPLETED_GREEN : (tech ? tech.color : '#e2e8f0') 
                                    }}
                                  >
                                    <div className="flex justify-between items-center mb-0.5">
                                      <p className="text-[8px] font-black" style={{ color: tech?.color || '#64748b' }}>{c.scheduledTime || '00:00'}</p>
                                      {c.status === 'Completed' && <Check size={8} className="text-green-600" />}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-800 truncate">{c.customerName}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {calendarView === 'day' && (
                    <div className="flex flex-col h-full min-w-max">
                       <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                        <div className="w-16 border-l border-slate-200"></div>
                        {techs.map(t => {
                          const isAvailable = isTechAvailableOnDate(t, calendarDate);
                          return (
                            <div key={t.id} className={`w-48 py-2 border-l border-slate-200 text-center font-bold text-sm flex items-center justify-center gap-2 ${!isAvailable ? 'bg-slate-100 text-slate-400' : 'text-slate-700'}`}>
                              {t.name}
                              {!isAvailable && (
                                <span className="opacity-60">
                                  {t.availabilityStatus === 'Vacation' ? <Plane size={14}/> : <Stethoscope size={14}/>}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex-grow flex">
                        <div className="w-16 flex-shrink-0 bg-slate-50/50">
                          {TIME_SLOTS.map(time => <div key={time} className="h-20 border-b border-slate-100 p-1 text-right"><span className="text-[9px] font-bold text-slate-400">{time}</span></div>)}
                        </div>
                        {techs.map(t => {
                          const isAvailable = isTechAvailableOnDate(t, calendarDate);
                          return (
                            <div key={t.id} className={`w-48 relative border-l border-slate-100 ${!isAvailable ? 'bg-slate-50/50' : ''}`}>
                                {TIME_SLOTS.map(time => (
                                  <div 
                                    key={time} 
                                    onDragOver={e => e.preventDefault()} 
                                    onDrop={() => draggedCallId && assignCall(draggedCallId, t.id, time)} 
                                    className={`h-20 border-b border-slate-100 ${draggedCallId && isAvailable ? 'bg-red-50/20 border-dashed border-[#c61d23] cursor-pointer' : ''}`}
                                  ></div>
                                ))}
                                {calls.filter(c => c.technicianId === t.id && c.scheduledTime && c.scheduledDate === calendarDate).map(c => (
                                  <div key={c.id} draggable={c.status !== 'Completed'} onDragStart={() => setDraggedCallId(c.id)} onClick={() => setSelectedCallId(c.id)} className={`absolute right-1 left-1 rounded-xl p-2 shadow-lg border-r-2 z-10 cursor-grab transition-all hover:scale-105 ${c.status === 'Completed' ? 'opacity-80 grayscale-[0.5]' : ''}`} style={{ top: `${TIME_SLOTS.indexOf(c.scheduledTime!) * 80 + 2}px`, height: '76px', backgroundColor: c.status === 'Completed' ? '#E8F5E9' : `${t.color}15`, borderColor: c.status === 'Completed' ? COMPLETED_GREEN : t.color }}>
                                    <div className="flex justify-between items-start mb-0.5 text-[8px] font-black uppercase" style={{ color: c.status === 'Completed' ? COMPLETED_GREEN : t.color }}>
                                      {c.scheduledTime} 
                                      <PriorityBadge priority={c.priority} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-800 truncate">{c.customerName}</p>
                                  </div>
                                ))}
                                {!isAvailable && (
                                  <div className="absolute inset-0 bg-slate-100/30 backdrop-blur-[1px] flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                                    <div className="bg-white/80 p-2 rounded-lg shadow-sm font-black text-[10px] uppercase border">
                                      {t.availabilityStatus === 'Vacation' ? 'בחופשה' : 'מחלה'}
                                    </div>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <UnscheduledSidebar />
            </div>
          )}

          {activeTab === 'new-call' && (
            <div className="p-6 h-full overflow-y-auto bg-slate-100/30">
               <div className="max-w-4xl mx-auto bg-white p-6 rounded-[32px] shadow-2xl border border-slate-200">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-slate-900">פתיחת קריאה חדשה</h3>
                    <button onClick={() => setActiveTab('dashboard')} className="p-2 hover:bg-slate-100 rounded-full"><X size={24}/></button>
                 </div>
                 <form className="space-y-6" onSubmit={handleNewCallSubmit}>
                    <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                        <Users className="text-[#c61d23]" size={24} />
                        <h4 className="text-lg font-black text-slate-800">פרטי לקוח</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-sm font-black text-slate-400 uppercase pr-2">בחר לקוח מהמאגר</label>
                          <select 
                            name="customerId" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold bg-white outline-none text-base shadow-sm"
                            value={newCallForm.customerId}
                            onChange={handleNewCallCustomerSelect}
                          >
                            <option value="">-- בחר לקוח --</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>{c.companyName} ({c.city})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-black text-slate-400 uppercase pr-2">שם הלקוח / העסק</label>
                          <input 
                            type="text" 
                            name="companyName" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold bg-white shadow-sm text-base" 
                            placeholder="למשל: בנק לאומי"
                            value={newCallForm.companyName}
                            onChange={handleNewCallFormChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-sm font-black text-slate-400 uppercase pr-2">איש קשר בשטח</label>
                          <input 
                            type="text" 
                            name="contactPerson" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold bg-white shadow-sm text-base" 
                            placeholder="שם איש הקשר"
                            value={newCallForm.contactPerson}
                            onChange={handleNewCallFormChange}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-black text-slate-400 uppercase pr-2 flex items-center gap-2"><Phone size={14} className="text-[#c61d23]"/> טלפון לתיאום</label>
                          <input 
                            type="text" 
                            name="phone" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold bg-white shadow-sm text-base" 
                            placeholder="05X-XXXXXXX"
                            value={newCallForm.phone}
                            onChange={handleNewCallFormChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1 space-y-1">
                          <label className="text-sm font-black text-slate-400 uppercase pr-2">עיר</label>
                          <input 
                            type="text" 
                            name="city" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold bg-white shadow-sm text-base" 
                            placeholder="תל אביב"
                            value={newCallForm.city}
                            onChange={handleNewCallFormChange}
                            required
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-sm font-black text-slate-400 uppercase pr-2 flex items-center gap-2"><MapPin size={14} className="text-[#c61d23]"/> כתובת מלאה</label>
                          <input 
                            type="text" 
                            name="address" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold bg-white shadow-sm text-base" 
                            placeholder="רחוב, מספר, קומה"
                            value={newCallForm.address}
                            onChange={handleNewCallFormChange}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-[24px] border border-slate-100 space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                        <ClipboardList className="text-[#c61d23]" size={24} />
                        <h4 className="text-lg font-black text-slate-800">תיאור התקלה</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-sm font-black text-slate-400 uppercase pr-2">מספר הזמנה</label>
                          <input 
                            type="text" 
                            name="orderNumber" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold bg-white shadow-sm text-base" 
                            placeholder="ORD-XXXX"
                            value={newCallForm.orderNumber}
                            onChange={handleNewCallFormChange}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                           <label className="text-sm font-black text-slate-400 uppercase pr-2">רמת דחיפות</label>
                           <select 
                            name="priority" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold bg-white outline-none text-base shadow-sm"
                            value={newCallForm.priority}
                            onChange={handleNewCallFormChange}
                           >
                              <option value="Low">נמוכה</option>
                              <option value="Medium">בינונית</option>
                              <option value="High">גבוהה</option>
                              <option value="Critical">קריטית</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-black text-slate-400 uppercase pr-2">מזהה פנימי</label>
                          <input 
                            type="text" 
                            name="internalId" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold bg-white shadow-sm text-base" 
                            placeholder="אופציונלי"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-sm font-black text-slate-400 uppercase pr-2">תיאור התקלה המפורט</label>
                         <textarea 
                          name="description" 
                          rows={3} 
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none font-bold bg-white shadow-sm resize-none text-base" 
                          placeholder="פרטי התקלה..."
                          value={newCallForm.description}
                          onChange={handleNewCallFormChange}
                          required
                         ></textarea>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-[#c61d23] hover:bg-red-700 text-white py-6 rounded-[32px] font-black text-xl shadow-xl transition-all transform active:scale-95">יצירת קריאה ושליחה</button>
                 </form>
               </div>
            </div>
          )}
        </div>

        {/* --- MANAGEMENT EDIT MODAL --- */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
             <div className="bg-white rounded-[40px] shadow-2xl p-8 w-full max-w-3xl animate-in zoom-in-95 duration-200 h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2 border-b">
                  <h3 className="text-2xl font-black text-slate-900">ניהול {editingItem.type === 'tech' ? 'טכנאי' : editingItem.type === 'cust' ? 'לקוח' : 'משתמש'}</h3>
                  <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-300" /></button>
                </div>
                <form className="space-y-8" onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  if(editingItem.type === 'tech') {
                    const t = { 
                      id: editingItem.data?.id || `T${Date.now()}`, 
                      name: fd.get('n') as string, 
                      specialty: fd.get('s') as string, 
                      phone: fd.get('p') as string, 
                      active: true, 
                      color: editingItem.data?.color || TECH_COLORS[techs.length%6],
                      availabilityStatus: fd.get('as') as AvailabilityStatus,
                      statusStartDate: fd.get('ssd') as string || undefined,
                      statusEndDate: fd.get('sed') as string || undefined
                    };
                    setTechs(prev => editingItem.data ? prev.map(x => x.id === t.id ? t : x) : [...prev, t]);
                  } else if(editingItem.type === 'user') {
                    const u = { id: editingItem.data?.id || `U${Date.now()}`, name: fd.get('n') as string, role: fd.get('r') as string, email: fd.get('e') as string, avatarColor: editingItem.data?.avatarColor || TECH_COLORS[users.length%6] };
                    setUsers(prev => editingItem.data ? prev.map(x => x.id === u.id ? u : x) : [...prev, u]);
                  } else if(editingItem.type === 'cust') {
                    const c = { 
                      id: editingItem.data?.id || generateId('C', customers.length + 1), 
                      companyName: fd.get('n') as string, 
                      businessId: fd.get('hp') as string,
                      branchNumber: fd.get('bn') as string,
                      branchName: fd.get('bm') as string,
                      email: fd.get('e') as string, 
                      phone: fd.get('p') as string, 
                      city: fd.get('c') as string, 
                      address: fd.get('a') as string, 
                      contactPerson: fd.get('cp') as string 
                    };
                    setCustomers(prev => editingItem.data ? prev.map(x => x.id === editingItem.data.id ? c : x) : [...prev, c]);
                  }
                  setEditingItem(null);
                }}>
                   {editingItem.type === 'tech' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputEditGroup label="שם טכנאי" name="n" defaultValue={editingItem.data?.name} required />
                        <InputEditGroup label="התמחות מקצועית" name="s" defaultValue={editingItem.data?.specialty} required />
                        <InputEditGroup label="מספר טלפון" name="p" defaultValue={editingItem.data?.phone} required />
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase pr-1">סטטוס זמינות</label>
                           <select 
                            name="as" 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 font-bold bg-white text-sm outline-none shadow-sm"
                            defaultValue={editingItem.data?.availabilityStatus || 'Available'}
                           >
                              <option value="Available">זמין לשיבוץ</option>
                              <option value="Vacation">חופשה</option>
                              <option value="Sick">מחלה</option>
                           </select>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
                          <Calendar size={14}/> טווח תאריכים לחופשה / מחלה
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <InputEditGroup label="תאריך התחלה" name="ssd" type="date" defaultValue={editingItem.data?.statusStartDate} />
                          <InputEditGroup label="תאריך סיום" name="sed" type="date" defaultValue={editingItem.data?.statusEndDate} />
                        </div>
                        <p className="text-[9px] text-slate-400">בתום התאריך הנבחר, הטכנאי יחזור להופיע כזמין לשיבוץ באופן אוטומטי.</p>
                      </div>
                    </div>
                   ) : editingItem.type === 'user' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputEditGroup label="שם משתמש" name="n" defaultValue={editingItem.data?.name} required />
                      <InputEditGroup label="תפקיד במערכת" name="r" defaultValue={editingItem.data?.role} required />
                      <InputEditGroup label="אימייל" name="e" defaultValue={editingItem.data?.email} required />
                    </div>
                   ) : (
                    <div className="space-y-10">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2"><Building2 className="text-[#c61d23]" size={18}/><h4 className="text-base font-black">פרטי חברה</h4></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InputEditGroup label="שם הלקוח / חברה" name="n" defaultValue={editingItem.data?.companyName} required />
                          <InputEditGroup label="ח.פ. / ע.מ. / ת.ז." name="hp" defaultValue={editingItem.data?.businessId} required />
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2"><Store className="text-blue-500" size={18}/><h4 className="text-base font-black">סניף</h4></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InputEditGroup label="מספר סניף" name="bn" defaultValue={editingItem.data?.branchNumber} placeholder="למשל: 132" />
                          <InputEditGroup label="שם סניף" name="bm" defaultValue={editingItem.data?.branchName} placeholder="למשל: סניף מרכז" />
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2"><User className="text-emerald-500" size={18}/><h4 className="text-base font-black">איש קשר ודרכי התקשרות</h4></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InputEditGroup label="איש קשר" name="cp" defaultValue={editingItem.data?.contactPerson} required />
                          <InputEditGroup label="טלפון" name="p" defaultValue={editingItem.data?.phone} required />
                          <InputEditGroup label="אימייל" name="e" defaultValue={editingItem.data?.email} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <InputEditGroup label="עיר" name="c" defaultValue={editingItem.data?.city} required />
                          <div className="md:col-span-3">
                            <InputEditGroup label="כתובת" name="a" defaultValue={editingItem.data?.address} required />
                          </div>
                        </div>
                      </div>
                    </div>
                   )}
                   <div className="sticky bottom-0 bg-white pt-4 border-t mt-8 pb-2">
                    <button type="submit" className="w-full bg-[#c61d23] text-white py-4 rounded-2xl font-black text-xl shadow-xl hover:bg-red-700 transition-all transform active:scale-95">שמור שינויים</button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {selectedCallId && (
          <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-sm no-print" onClick={() => setSelectedCallId(null)}>
             <div className="w-1/2 bg-white h-full shadow-2xl p-10 overflow-y-auto animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
                <DetailPanel 
                  call={calls.find(c => c.id === selectedCallId)!} 
                  techs={techs} 
                  users={users} 
                  onUpdate={updateCall} 
                  onAnalyze={handleAIAnalyze} 
                  isAnalyzing={isAnalyzing} 
                  onClose={() => setSelectedCallId(null)} 
                  onPrint={() => printServiceCall(selectedCallId)}
                />
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const ManagementView = ({ items, type, onAdd, onEdit, onDelete, onPrint }: any) => (
  <div className="p-6 space-y-6 overflow-y-auto h-full bg-slate-100/30">
    <div className="flex justify-between items-center no-print">
      <h3 className="text-2xl font-black text-slate-900">
        {type === 'tech' ? 'ניהול צוות טכנאים' : type === 'user' ? 'משתמשי המערכת' : 'ניהול מאגר לקוחות'}
      </h3>
      <button onClick={onAdd} className="bg-[#c61d23] text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95 text-sm"><Plus size={18} /> הוסף חדש</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((it: any) => {
        const isUnavailable = type === 'tech' && !isTechAvailableOnDate(it, new Date().toISOString().split('T')[0]);
        return (
          <div key={it.id} className={`bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all relative group overflow-hidden ${isUnavailable ? 'opacity-90' : ''}`}>
            <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: it.color || it.avatarColor || '#334155' }}></div>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center text-xl font-black shadow-lg relative`} style={{ backgroundColor: it.color || it.avatarColor || '#334155' }}>
                {(it.companyName || it.name)[0]}
                {type === 'tech' && isUnavailable && (
                  <div className="absolute -top-1 -right-1 bg-white p-1 rounded-full shadow-md text-[#c61d23]">
                    {it.availabilityStatus === 'Vacation' ? <Plane size={10}/> : <Stethoscope size={10}/>}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(it)} className="p-2 bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 shadow-sm transition-colors"><Edit3 size={14} /></button>
                <button onClick={() => onDelete(it.id)} className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl border border-slate-100 shadow-sm transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
            
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800 mb-0.5 leading-tight">{it.companyName || it.name}</h3>
                {type === 'tech' && (
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${it.availabilityStatus === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-[#c61d23]'}`}>
                    {it.availabilityStatus === 'Available' ? 'זמין' : it.availabilityStatus === 'Vacation' ? 'חופשה' : 'מחלה'}
                  </span>
                )}
              </div>
              {type === 'cust' && it.businessId && <p className="text-[10px] font-bold text-slate-400">ח.פ. / ע.מ. {it.businessId}</p>}
            </div>

            <p className="text-slate-400 text-[10px] font-black uppercase mb-3 tracking-wider">
              {type === 'cust' && it.branchNumber ? `סניף ${it.branchNumber} - ${it.branchName || ''}` : (it.specialty || it.role || it.city)}
            </p>
            
            {type === 'tech' && !isTechAvailableOnDate(it, new Date().toISOString().split('T')[0]) && (
              <div className="bg-red-50 p-2 rounded-xl mb-3 text-[10px] font-bold text-[#c61d23] flex items-center gap-2">
                <Info size={12}/> לא זמין עד: {it.statusEndDate}
              </div>
            )}

            <div className="space-y-2 pt-3 border-t border-slate-50 text-xs">
              <div className="flex items-center gap-2 text-slate-600 font-bold"><User size={12} className="text-[#c61d23]" /> {it.contactPerson || it.role || 'ללא איש קשר'}</div>
              <div className="flex items-center gap-2 text-slate-600 font-bold"><Phone size={12} className="text-[#c61d23]" /> {it.phone || it.email}</div>
            </div>
            
            {type === 'tech' && (
              <button onClick={() => onPrint(it.id)} className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-black transition-colors text-xs">
                <Printer size={16} /> הדפס סידור עבודה
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const MetricCard = ({ title, value, icon, color, textColor, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`${color} p-6 rounded-[32px] shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 group active:scale-95`}
  >
    <div className="mb-2 transition-transform group-hover:scale-110">{icon}</div>
    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{title}</h4>
    <div className={`text-3xl font-black ${textColor || 'text-slate-800'}`}>{value}</div>
  </div>
);

const InputEditGroup = ({ label, name, defaultValue, required, placeholder, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase pr-1">{label}</label>
    <input 
      type={type} 
      name={name} 
      defaultValue={defaultValue} 
      required={required} 
      placeholder={placeholder}
      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none font-bold bg-white text-sm shadow-sm focus:ring-4 focus:ring-red-500/5 transition-all" 
    />
  </div>
);

const SidebarLink = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all ${active ? 'bg-[#c61d23] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon} <span className="text-base">{label}</span>
  </button>
);

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const map: any = { Critical: 'bg-red-100 text-[#c61d23]', High: 'bg-orange-100 text-orange-600', Medium: 'bg-blue-100 text-blue-600', Low: 'bg-slate-100 text-slate-500' };
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${map[priority]}`}>{priority}</span>;
};

const StatusBadge = ({ status, size = 'normal' }: { status: Status, size?: 'small' | 'normal' }) => {
  const map: any = { Open: 'bg-orange-100 text-orange-600', Scheduled: 'bg-purple-100 text-purple-700', 'In Progress': 'bg-blue-100 text-blue-700', Completed: 'bg-emerald-500 text-white' };
  return <span className={`${size === 'small' ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-xs'} rounded-full font-black ${map[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>;
};

const InputGroup = ({ label, name, placeholder, required, value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-black text-slate-400 uppercase pr-2">{label}</label>
    <input 
      type="text" 
      name={name} 
      required={required} 
      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold bg-white shadow-sm focus:ring-4 focus:ring-red-500/5 text-base" 
      placeholder={placeholder} 
      value={value}
      onChange={onChange}
    />
  </div>
);

const DetailPanel = ({ call, techs, onUpdate, onAnalyze, isAnalyzing, onClose, onPrint }: any) => {
  const assignedTech = techs.find((t: Technician) => t.id === call.technicianId);
  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-between items-center no-print">
         <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={32} className="text-slate-300 hover:text-slate-800" /></button>
         <button className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 text-sm" onClick={() => onPrint(call.id)}><Printer size={20} /> הדפס</button>
      </div>

      <div>
        <h3 className="text-4xl font-black text-slate-900 mb-1">{call.customerName}</h3>
        <div className="flex items-center gap-4 text-slate-400 font-bold text-base">
          <span>#{call.orderNumber}</span>
          <PriorityBadge priority={call.priority} />
          <StatusBadge status={call.status} size="small" />
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">עיר</p><p className="text-lg font-bold text-slate-800">{call.city}</p></div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">כתובת</p><p className="text-lg font-bold text-slate-800">{call.address}</p></div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">איש קשר</p><p className="text-lg font-bold text-slate-800">{call.contactPerson}</p></div>
           <div className="flex items-center gap-3">
              <div><p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">טלפון</p><p className="text-lg font-bold text-[#c61d23]">{call.phone}</p></div>
              <button className="p-2 bg-red-50 text-[#c61d23] rounded-full hover:bg-red-100 transition-colors"><Phone size={18}/></button>
           </div>
        </div>
      </div>

      {assignedTech && (
        <div className="flex items-center gap-6 bg-white p-6 rounded-[24px] border border-slate-100 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: assignedTech.color }}></div>
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white text-2xl font-black shadow-lg" style={{ backgroundColor: assignedTech.color }}>{assignedTech.name[0]}</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">מתקין</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{assignedTech.name}</p>
            <div className="flex items-center gap-4 mt-2 text-slate-500 font-bold text-xs">
              <span className="flex items-center gap-1"><Calendar size={14} className="text-[#c61d23]"/> {call.scheduledDate}</span>
              <span className="flex items-center gap-1"><Clock size={14} className="text-[#c61d23]"/> {call.scheduledTime}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
         <h4 className="text-xl font-black text-slate-900 flex items-center gap-2"><ClipboardList size={24} className="text-[#c61d23]"/> תיאור התקלה</h4>
         <div className="bg-slate-50 p-6 rounded-[24px] italic text-slate-600 leading-relaxed border border-slate-100 text-lg">"{call.description}"</div>
      </div>

      <div className="bg-slate-950 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><BrainCircuit size={120} /></div>
         <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4"><BrainCircuit size={28} className="text-blue-400"/><h4 className="text-2xl font-black">ניתוח טכני AI</h4></div>
            {!call.aiAnalysis ? (
              <button onClick={() => onAnalyze(call.id)} disabled={isAnalyzing} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95">
                 {isAnalyzing ? <Loader2 className="animate-spin" /> : <Plus size={24} />} בצע ניתוח טכני
              </button>
            ) : (
              <div className="space-y-6">
                 <div>
                    <p className="text-blue-400 text-[10px] font-black uppercase mb-1 tracking-widest">סיכום</p>
                    <p className="text-lg leading-relaxed text-slate-300 font-bold">{call.aiAnalysis.summary}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-blue-400 text-[10px] font-black mb-1 uppercase tracking-widest">זמן משוער</p><p className="text-base font-black">{call.aiAnalysis.estimatedDuration}</p></div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-blue-400 text-[10px] font-black mb-1 uppercase tracking-widest">דחיפות</p><p className="text-base font-black">{call.aiAnalysis.suggestedPriority}</p></div>
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default App;
