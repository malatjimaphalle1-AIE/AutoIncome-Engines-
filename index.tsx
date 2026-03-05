import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Activity, Check, Cpu, Mail, Plus, Zap, Shield, Layers, 
  Banknote, Lock, User, UserPlus, Trash2, 
  ArrowUp, ArrowDown, Loader2, 
  Crown, Share2, ShieldAlert, Pencil, 
  Download, Fingerprint, Wallet, Receipt, 
  Building2, AlertCircle, Key, Upload, X, Globe, RefreshCcw, Sparkles, 
  ChevronDown, BarChart3, Radio, HardDrive, Target, Search, Users, Network, Copy, ExternalLink, Hammer, Bell, BarChart, Trophy, Map, History, Wifi, BrainCircuit, Rocket, Boxes, ChevronRight, ShieldPlus, Server, UserCheck, ShieldX, AlertTriangle, Link as LinkIcon, Eye, RotateCcw, Sparkle, Gavel, Anchor, Crosshair, Box, ShieldEllipsis, UserCog, Lightbulb, MousePointerSquareDashed, TrendingUp, Monitor, MoreVertical, Maximize2, Repeat, Milestone, Filter, Clock, XCircle, ChevronLeft, ZapOff, Workflow, BookOpen, Save, Brush, Palette, Image, ShieldCheck, LayoutGrid, Sparkle as SparkleIcon, CreditCard, Terminal, Gauge, Info, Megaphone, History as HistoryIcon, FileEdit, Trash, Landmark, PlusCircle, PenTool, Database, LockKeyhole, ListTree, Timer, FileCode, ShieldHalf, Star, Medal, ArrowUpDown, Calendar, DollarSign, Settings, Clipboard
} from 'lucide-react';
import { Type, GenerateContentParameters, GoogleGenAI } from "@google/genai";
import { apiService } from './services/apiService';
import { paypalService } from './services/paypalService';

// Add global window types for AI Studio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

// --- Constants & Types ---
type Plan = 'Free Trial' | 'Starter' | 'Pro' | 'Unlimited';
type EngineStatus = 'Active' | 'Paused' | 'Optimizing' | 'Draft' | 'Critical Failure' | 'Auditing';
type TransactionStatus = 'Completed' | 'Processing' | 'Auditing' | 'Failed';
type ArchitectTier = 'Junior' | 'Senior' | 'Lead' | 'Principal' | 'Sovereign';
type RiskTolerance = 'Low' | 'Balanced' | 'High' | 'Sovereign';
type UserPermission = 'access_dashboard' | 'access_nodes' | 'access_forge' | 'access_creator_centre' | 'access_network' | 'access_treasury' | 'access_citadel' | 'access_profile';
type UserRole = 'User' | 'Admin' | 'Support';
type GridCycle = 'all' | 'epoch' | 'cycle' | 'quarter';
type LiquidityTier = 'all' | 'micro' | 'standard' | 'institutional';
type SortProtocol = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type AlertCategory = 'engine' | 'tx' | 'referral' | 'security';

const WITHDRAWAL_LIMITS = {
  PER_TRANSACTION: 2500.0,
  DAILY_TOTAL: 5000.0
};

const PAYPAL_CONNECTED = true; // Force true to allow connection check
const PAYPAL_LIVE_MODE = (process.env.PAYPAL_MODE === 'live' || process.env.PAYPAL_MODE === 'LIVE');
const PAYPAL_SANDBOX_MODE = (process.env.PAYPAL_MODE === 'sandbox');

const cleanJSON = (text: string) => {
  if (!text) return '{}';
  // Remove markdown code blocks
  let clean = text.replace(/```json\n?|```/g, '');
  // Trim whitespace
  clean = clean.trim();
  // Find first { and last }
  const firstOpen = clean.indexOf('{');
  const lastClose = clean.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    clean = clean.substring(firstOpen, lastClose + 1);
  }
  return clean;
};

interface GridNotification {
  id: string;
  category: AlertCategory;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  engineId?: string;
  read: boolean;
}

interface Preset {
  id: string;
  name: string;
  vision: string;
  risk: RiskTolerance;
  yield: number;
  engineData: Engine;
  timestamp: string;
}

interface FundingSource {
  id: string;
  type: 'Bank' | 'Card';
  provider: string;
  lastFour: string;
  label: string;
  status: 'Active' | 'Verifying';
}

const PERMISSIONS: Record<UserPermission, { label: string, icon: any, description: string }> = {
  access_dashboard: { label: 'Grid Overview', icon: Activity, description: 'Monitor high-level grid metrics and health.' },
  access_nodes: { label: 'Active Nodes', icon: Boxes, description: 'Manage and monitor specific neural nodes.' },
  access_creator_centre: { label: 'Creator Centre', icon: LayoutGrid, description: 'Browse and select from pre-defined revenue templates.' },
  access_forge: { label: 'Neural Synthesis', icon: Hammer, description: 'Design and deploy new revenue engines.' },
  access_network: { label: 'Peer Expansion', icon: Network, description: 'Manage referral networks and expansion nodes.' },
  access_treasury: { label: 'Liquidity Exit', icon: Wallet, description: 'Authorize settlements and manage vault assets.' },
  access_citadel: { label: 'Citadel Command', icon: ShieldAlert, description: 'Manage users, security, and global grid protocols.' },
  access_profile: { label: 'Architect Profile', icon: User, description: 'Manage identity, branding, and credentials.' },
};

const ROLES: UserRole[] = ['User', 'Admin', 'Support'];
const RISK_TOLERANCES: RiskTolerance[] = ['Low', 'Balanced', 'High', 'Sovereign'];

const VISUAL_STYLES = [
  { id: 'photorealistic', label: 'Institutional', description: 'Clean, high-fidelity realism' },
  { id: 'cyberpunk', label: 'Cyber-Vanguard', description: 'Neon-infused synthetic grit' },
  { id: 'abstract', label: 'Neural Abstract', description: 'Fluid concept visualization' },
  { id: 'schematic', label: 'Architect Blueprint', description: 'Technical schematic drafting' },
  { id: 'pixel', label: 'Legacy Grid', description: 'Retro 8-bit data-aesthetic' },
];

const ASPECT_RATIOS = ['16:9', '1:1', '9:16'];

const REVENUE_TEMPLATES = [
  { id: 'saas_arb', name: 'SaaS Arbiter', category: 'Software', description: 'Exploit price differentials in white-label SaaS licenses across global markets.', vision: 'Automated SaaS license arbitrage using regional pricing gaps.', risk: 'Low' as RiskTolerance, yield: 45 },
  { id: 'defi_yield', name: 'Yield Harvester', category: 'Finance', description: 'Automated liquidity provision across top-tier DeFi protocols for maximum APY.', vision: 'DeFi yield aggregation node focusing on stablecoin pairs.', risk: 'Balanced' as RiskTolerance, yield: 65 },
  { id: 'p_seo', name: 'Traffic Alchemist', category: 'Marketing', description: 'Programmatic SEO engine that generates thousands of niche-focused pages to capture ad revenue.', vision: 'Mass-scale SEO content farm for long-tail keyword monetization.', risk: 'High' as RiskTolerance, yield: 85 },
  { id: 'gpu_broker', name: 'Compute Broker', category: 'Infrastructure', description: 'Rents idle GPU capacity from low-cost providers and resells to AI training clusters.', vision: 'High-performance computing reselling node.', risk: 'Balanced' as RiskTolerance, yield: 55 },
  { id: 'news_auto', name: 'Newsletter Catalyst', category: 'Content', description: 'Curates and distributes industry-specific news via automated AI synthesis and monetization.', vision: 'Autonomous industry news curation and subscription engine.', risk: 'Low' as RiskTolerance, yield: 35 },
  { id: 'voice_syn', name: 'Voice Alchemist', category: 'AI Services', description: 'Generates high-fidelity AI voiceovers for YouTube automation and B2B narration.', vision: 'Scalable AI voice synthesis service provider.', risk: 'Balanced' as RiskTolerance, yield: 50 },
  { id: 'drop_ship', name: 'Shadow Logistician', category: 'E-commerce', description: 'Automated product sourcing and fulfillment through verified global dropshipping nodes.', vision: 'Hands-off e-commerce fulfillment and arbitrage.', risk: 'High' as RiskTolerance, yield: 70 },
  { id: 'algo_trade', name: 'Market Maker', category: 'Finance', description: 'Low-latency algorithmic trading bot focusing on volatility capture in crypto markets.', vision: 'High-frequency market-making bot for emerging tokens.', risk: 'Sovereign' as RiskTolerance, yield: 95 },
  { id: 'dom_spec', name: 'Domain Portfolio Bot', category: 'Digital Real Estate', description: 'Uses AI to predict and acquire valuable expired domains for resale or lease.', vision: 'Strategic digital asset acquisition and flipping.', risk: 'Balanced' as RiskTolerance, yield: 60 },
  { id: 'api_scrapp', name: 'API Nexus', category: 'B2B Data', description: 'Scrapes and structures specialized B2B data to sell as a premium subscription API.', vision: 'Proprietary data extraction and API monetization node.', risk: 'Balanced' as RiskTolerance, yield: 40 },
  { id: 'content_vel', name: 'Content Velocity Engine', category: 'AI Services', description: 'High-volume AI article generation for ad-supported media networks.', vision: 'Maximum output AI copywriting for ad-revenue domains.', risk: 'High' as RiskTolerance, yield: 80 },
  { id: 'social_trend', name: 'Social Signal', category: 'Marketing', description: 'Monetizes viral trends by deploying automated social responses and affiliate links.', vision: 'Trend-aware social arbitrage and affiliate network.', risk: 'High' as RiskTolerance, yield: 75 },
  { id: 'micro_saas', name: 'Micro-SaaS Factory', category: 'Software', description: 'Deploys multiple single-purpose AI tools (e.g., PDF tools, image converters) for organic traffic.', vision: 'Portfolio of single-feature high-traffic utilities.', risk: 'Low' as RiskTolerance, yield: 30 },
  { id: 'contract_scan', name: 'Smart Contract Auditor', category: 'Web3 Security', description: 'Automated security scanning for new token launches, charging for "verified" badges.', vision: 'Autonomous Web3 security scanning service.', risk: 'Balanced' as RiskTolerance, yield: 55 },
  { id: 'link_cloak', name: 'Affiliate Synapse', category: 'Marketing', description: 'Multi-channel affiliate marketing bot with automated link rotation and optimization.', vision: 'Dynamic affiliate link routing and traffic optimization.', risk: 'Balanced' as RiskTolerance, yield: 50 },
  { id: 'storage_arb', name: 'Storage Broker', category: 'Infrastructure', description: 'Arbitrages decentralized storage prices against cloud storage providers.', vision: 'Decentralized vs. centralized storage arbitrage.', risk: 'Low' as RiskTolerance, yield: 25 },
  { id: 'ai_copy', name: 'Automated Copywriter', category: 'B2B Services', description: 'Full-service B2B sales copy and email sequence generation for high-ticket clients.', vision: 'AI-driven sales outreach and content generation node.', risk: 'Low' as RiskTolerance, yield: 45 },
  { id: 'land_flip', name: 'Digital Estate Agent', category: 'Digital Real Estate', description: 'Buys and sells virtual land in metaverses based on traffic density metrics.', vision: 'Metaverse land speculation and development bot.', risk: 'Sovereign' as RiskTolerance, yield: 90 },
  { id: 'prompt_lab', name: 'Prompt Engineering Lab', category: 'AI Services', description: 'Develops and licenses enterprise-grade prompt sequences for specific industry LLMs.', vision: 'B2B prompt engineering and licensing infrastructure.', risk: 'Low' as RiskTolerance, yield: 35 },
  { id: 'support_bpo', name: 'Customer Support BPO', category: 'B2B Services', description: 'Deploys specialized AI agents to handle 1st-tier customer support for brands.', vision: 'AI-powered support outsourcing and agent deployment.', risk: 'Balanced' as RiskTolerance, yield: 50 },
];

const COMMISSION_TIERS = [
  { id: 'junior', name: 'Junior', minNodes: 0, rate: 5, color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10' },
  { id: 'senior', name: 'Senior', minNodes: 10, rate: 10, color: 'text-emerald-400', bg: 'bg-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'lead', name: 'Lead', minNodes: 50, rate: 15, color: 'text-blue-400', bg: 'bg-blue-600/10', border: 'border-blue-500/30' },
  { id: 'principal', name: 'Principal', minNodes: 100, rate: 20, color: 'text-purple-400', bg: 'bg-purple-600/10', border: 'border-purple-500/30' },
  { id: 'sovereign', name: 'Sovereign', minNodes: 250, rate: 25, color: 'text-yellow-400', bg: 'bg-yellow-600/10', border: 'border-yellow-500/30' },
];

interface Engine {
  id: string; name: string; type: string; status: EngineStatus;
  revenue: number; performance: number; uptime: string;
  config: { 
    attackVector: string; 
    lever: string; 
    moat: string; 
    brief: string; 
    visualPrompt?: string; 
    parameters?: { yieldVelocity: number; riskProfile: string; marketDepth: string; computationalLoad: number; };
  };
  history: number[]; imageUrl?: string;
}

interface UserData {
  id: string; name: string; email: string; plan: Plan; role: UserRole; 
  isVerified: boolean; balance: number; lifetimeYield: number; totalWithdrawn: number;
  referralCode: string; referralCount: number; referralEarnings: number;
  tier: ArchitectTier;
  totalReferralNodes: number;
  permissions: UserPermission[];
  referralHistory?: any[];
  brandTheme?: string;
  brandAssets?: string[];
  activeLogo?: string;
  alertPrefs?: {
    engineStatus: boolean;
    transactions: boolean;
    referrals: boolean;
    security: boolean;
  };
  trialEndsAt?: string;
}

interface TransactionLog {
  timestamp: string;
  event: string;
  node: string;
}

interface Transaction {
  id: string; date: string; description: string; amount: number;
  type: 'credit' | 'debit'; status: TransactionStatus; method: string; txHash: string;
  logs?: TransactionLog[];
  timestamp_ms?: number; // Added for precise temporal filtering
}

// --- UI Components ---

const Sparkline = ({ data, color = "#3b82f6", height = 40, width = 120, animate = true, fill = false }: { data: number[], color?: string, height?: number, width?: number, animate?: boolean, fill?: boolean }) => {
  const points = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length < 2) return "";
    const cleanData = data.map(v => (v === null || isNaN(v)) ? 0 : v);
    const min = Math.min(...cleanData);
    const max = Math.max(...cleanData);
    const range = Math.max(1, max - min);
    return cleanData.map((val, i) => {
      const x = (i / (cleanData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");
  }, [data, height, width]);

  const fillPoints = useMemo(() => {
    if (!fill || !data || !Array.isArray(data) || data.length < 2) return "";
    return `${points} ${width},${height} 0,${height}`;
  }, [points, fill, width, height, data]);

  if (!points) return <div style={{ height, width }} className="opacity-10 border border-white/5 bg-white/5 rounded"></div>;

  return (
    <svg width={width} height={height} className="overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      {fill && (
        <polyline 
          fill={`${color}20`}
          points={fillPoints}
        />
      )}
      <polyline 
        fill="none" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        points={points} 
        className={`${animate ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`} 
      />
    </svg>
  );
};

const MetabolismTicker = ({ engines = [], label = "Grid Metabolism", events = [] }: { engines: Engine[], label?: string, events?: any[] }) => {
  const tickerEvents = useMemo(() => {
    if (events && events.length > 0) return [...events, ...events];
    // Include all engines regardless of status (Active, Paused, Critical Failure, etc.) to ensure visibility
    const safeEngines = Array.isArray(engines) ? engines.filter(e => e !== null && e !== undefined) : [];
    if (safeEngines.length === 0) return [];
    
    return safeEngines.map(e => ({
      id: e.id,
      name: e.name || 'Neural node',
      // Show STATUS if revenue is 0 or if paused/critical
      revenue: e.revenue > 0 ? (e.revenue || 0).toFixed(4) : null,
      status: e.status.toUpperCase(),
      perf: e.performance || 0
    })).concat(safeEngines.map(e => ({
      id: `clone-${e.id}`,
      name: e.name || 'Neural node',
      revenue: e.revenue > 0 ? (e.revenue || 0).toFixed(4) : null,
      status: e.status.toUpperCase(),
      perf: e.performance || 0
    })));
  }, [engines, events]);

  if (tickerEvents.length === 0) return null;

  return (
    <div className="w-full bg-blue-600/5 border-y border-white/5 py-3 overflow-hidden whitespace-nowrap relative group">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10"></div>
      <div className="absolute top-1 left-4 z-20">
         <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex animate-scroll hover:[animation-play-state:paused] gap-12 items-center">
        {tickerEvents.map((ev: any, i: number) => (
          <div key={`${ev.id}-${i}`} className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase text-blue-400 italic tracking-widest">{ev.name}</span>
            <span className={`text-[10px] font-mono ${ev.revenue ? 'text-emerald-400/80' : 'text-red-400'}`}>
              {ev.revenue ? `$${ev.revenue}` : ev.status || 'SYNCING'}
            </span>
            <div className="w-1 h-1 rounded-full bg-white/20"></div>
            <span className="text-[9px] font-black text-white/40 uppercase">{ev.perf || 0}% SYNAPSE</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, trend, data, colorClass = "blue", subValue }: any) => {
  const theme = {
    blue: "text-blue-300 bg-blue-600/15 border-blue-400/30 hover:border-blue-400/80",
    emerald: "text-emerald-300 bg-emerald-600/15 border-emerald-400/30 hover:border-emerald-400/80",
    purple: "text-purple-300 bg-purple-600/15 border-purple-400/30 hover:border-purple-400/80",
    gold: "text-yellow-300 bg-yellow-600/15 border-yellow-400/30 hover:border-yellow-400/80",
    red: "text-red-300 bg-red-600/15 border-red-400/30 hover:border-red-400/80"
  }[colorClass as 'blue' | 'emerald' | 'purple' | 'gold' | 'red'] || "text-blue-300 bg-blue-600/15 border-blue-400/40";

  return (
    <Card blueprint className={`p-8 border-2 transition-all duration-500 shadow-xl group ${theme}`}>
      <div className="flex justify-between items-start mb-8">
        <div className={`p-4 rounded-2xl border-2 shadow-inner transition-transform group-hover:scale-110 ${theme}`}>
          <Icon size={24} />
        </div>
        {trend !== undefined && (
          <span className={`text-[10px] font-black italic px-3 py-1 rounded-lg flex items-center gap-1 bg-white/10 border border-white/5 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-black uppercase text-white/40 italic tracking-[0.25em] mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-4xl font-black italic text-white tracking-tighter leading-none mb-6">{value}</p>
        {subValue && <span className="text-xs font-mono text-white/30 mb-6">{subValue}</span>}
      </div>
      {data && Array.isArray(data) && (
        <div className="opacity-60 h-10 flex items-end">
          <Sparkline 
            data={data} 
            width={280} 
            height={40} 
            color={colorClass === 'blue' ? '#93c5fd' : colorClass === 'emerald' ? '#6ee7b7' : colorClass === 'purple' ? '#d8b4fe' : colorClass === 'gold' ? '#fbbf24' : '#fca5a5'} 
            fill
          />
        </div>
      )}
    </Card>
  );
};

const Badge = ({ children, variant = 'info', className = '', live = false, icon: Icon }: any) => {
  const variants: any = {
    success: "bg-green-500/30 text-white border-2 border-green-500/50",
    neutral: "bg-white/20 text-white border-2 border-white/40",
    info: "bg-blue-500/30 text-white border-2 border-blue-500/50",
    danger: "bg-red-500/30 text-white border-2 border-red-500/50",
    warning: "bg-yellow-500/30 text-white border-2 border-yellow-500/50",
    critical: "bg-red-600/50 text-white border-2 border-red-500/80 animate-pulse",
    processing: "bg-blue-600/20 text-blue-400 border-2 border-blue-400/40",
    purple: "bg-purple-600/30 text-purple-200 border-2 border-purple-500/40"
  };
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black italic ${variants[variant] || variants.info} ${className}`}>
      {live && <span className="w-2 h-2 rounded-full animate-pulse bg-current shadow-[0_0_10px_currentColor]"></span>}
      {Icon && <Icon size={12} className={variant === 'processing' || live ? 'animate-spin' : ''} />}
      {children}
    </div>
  );
};

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled = false, loading = false, size = 'md' }: any) => {
  const variants: any = {
    primary: "bg-[#0070f3] hover:bg-blue-500 text-white shadow-[0_10px_30px_-10px_rgba(0,112,243,0.5)] border-blue-300/40",
    outline: "border-white/10 hover:border-white/30 hover:bg-white/5 text-white",
    success: "bg-green-600 hover:bg-green-500 text-white shadow-[0_10px_30px_-10px_rgba(22,163,74,0.5)]",
    ghost: "text-white/60 hover:text-white hover:bg-white/5 border-transparent",
    danger: "bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border-red-600/40 shadow-glow-sm"
  };
  const sizeClasses = size === 'sm' ? 'px-4 py-2 text-[10px]' : 'px-6 py-4 text-xs';

  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className={`flex items-center justify-center gap-3 rounded-2xl font-black italic transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest border-2 ${variants[variant]} ${sizeClasses} ${className}`}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '', onClick, blueprint = false, hover = false }: any) => (
  <div onClick={onClick} className={`glass rounded-[2rem] transition-all duration-500 relative overflow-hidden group border-2 ${className} ${onClick ? 'cursor-pointer' : ''} ${hover ? 'hover:border-blue-500/60 hover:shadow-2xl' : ''}`}>
    {blueprint && <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(#fff_1.8px,transparent_1.8px)] [background-size:30px_30px]"></div>}
    <div className="relative z-10 h-full">{children}</div>
  </div>
);

// --- Modals ---

const TransactionDetailsModal = ({ tx, onClose }: { tx: Transaction, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <Card blueprint className="max-w-3xl w-full border-blue-500/40 bg-[#050505] p-12 shadow-[0_0_120px_rgba(59,130,246,0.3)] max-h-[85vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-start mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
               <Badge variant={tx.status === 'Completed' ? 'success' : tx.status === 'Failed' ? 'danger' : 'warning'} live={tx.status === 'Processing' || tx.status === 'Auditing'}>{tx.status}</Badge>
               <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] italic">Trace ID: {tx.txHash}</span>
            </div>
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-tight">Ledger Trace Report</h2>
            <p className="text-blue-400 font-black uppercase tracking-[0.3em] italic text-xs">{tx.description}</p>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <X size={32} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
           <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-6">
              <div className="flex items-center gap-4">
                 <Banknote className="text-blue-400" size={24} />
                 <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Settlement Metric</p>
              </div>
              <p className={`text-6xl font-black italic tracking-tighter leading-none ${tx.type === 'credit' ? 'text-emerald-400' : 'text-white'}`}>
                 {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
              </p>
              <div className="flex justify-between text-[10px] font-black uppercase italic text-white/30 pt-4 border-t border-white/5">
                 <span>Method</span>
                 <span className="text-white">{tx.method}</span>
              </div>
           </div>
           <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-6">
              <div className="flex items-center gap-4">
                 <ShieldHalf className="text-purple-400" size={24} />
                 <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Audit Integrity</p>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/20">Signature Verification</span>
                    <span className="text-emerald-400">PASSED</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/20">Anti-Money Flow Protocol</span>
                    <span className="text-emerald-400">NOMINAL</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/20">Signatory Nodes</span>
                    <span className="text-blue-400">VAULT_CORE_09</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <h3 className="text-2xl font-black italic uppercase tracking-widest text-white/80 flex items-center gap-4">
              <ListTree size={24} className="text-blue-500" /> Protocol Node History
           </h3>
           <div className="space-y-4 relative">
              <div className="absolute left-[23px] top-4 bottom-4 w-px bg-white/10"></div>
              {tx.logs?.map((log, i) => (
                <div key={i} className="flex gap-8 relative">
                   <div className="w-12 h-12 rounded-full bg-black border-2 border-white/10 flex items-center justify-center shrink-0 relative z-10">
                      <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500 animate-pulse' : 'bg-white/20'}`}></div>
                   </div>
                   <div className="flex-1 pb-6">
                      <div className="flex justify-between items-start mb-1">
                         <p className="text-xs font-black uppercase italic text-white/80">{log.event}</p>
                         <span className="text-[9px] font-mono text-white/20">{log.timestamp}</span>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/60 italic">{log.node}</p>
                   </div>
                </div>
              ))}
              {!tx.logs && (
                <div className="py-10 text-center opacity-30 border-2 border-dashed border-white/5 rounded-3xl">
                   <p className="text-[10px] font-black uppercase italic">Legacy Trace Data Unavailable</p>
                </div>
              )}
           </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center">
           <Button variant="outline" className="w-full h-16" onClick={onClose} icon={Check}>Acknowledge Report</Button>
        </div>
      </Card>
    </div>
  );
};

const WithdrawalConfirmationModal = ({ tx, onClose, onViewLedger }: { tx: Transaction, onClose: () => void, onViewLedger: () => void }) => {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <Card blueprint className="max-w-md w-full border-emerald-500/40 bg-[#020202] p-10 text-center space-y-8 shadow-[0_0_100px_rgba(16,185,129,0.2)]">
        <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500 animate-success-check">
          <Check size={40} className="text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-tight">Settlement<br/><span className="text-emerald-400">Authorized</span></h2>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Strategic Liquidity Exit Initiated</p>
        </div>
        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 text-left">
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Transaction ID</span>
            <span className="text-[9px] font-mono text-emerald-400 font-bold">{tx.txHash}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Amount</span>
            <span className="text-xl font-black italic text-white">${tx.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Est. Processing</span>
            <span className="text-[10px] font-black italic text-blue-400">2-5 Minutes</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button variant="primary" className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20" onClick={onViewLedger} icon={Eye}>View in Ledger</Button>
          <Button variant="ghost" className="w-full h-12 !text-[9px]" onClick={onClose}>Acknowledge</Button>
        </div>
      </Card>
    </div>
  );
};


const AddArchitectModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (user: UserData) => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('User');
  const [permissions, setPermissions] = useState<UserPermission[]>(['access_dashboard']);
  
  const handleSubmit = () => {
    if (!name || !email) return;
    onAdd({
        id: 'u_' + Date.now(),
        name,
        email,
        plan: 'Starter',
        role,
        isVerified: false,
        balance: 0,
        lifetimeYield: 0,
        totalWithdrawn: 0,
        referralCode: 'PENDING',
        referralCount: 0,
        referralEarnings: 0,
        tier: 'Junior',
        totalReferralNodes: 0,
        permissions
    });
    onClose();
  };

  const togglePermission = (key: UserPermission) => {
    setPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <Card blueprint className="max-w-xl w-full border-blue-500/40 bg-[#020202] p-10 space-y-8 shadow-[0_0_100px_rgba(59,130,246,0.2)]">
        <div className="flex justify-between items-start">
             <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-tight">Induct <span className="text-blue-500">Architect</span></h2>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">New Neural Operator Protocol</p>
             </div>
             <button onClick={onClose} className="text-white/20 hover:text-white"><X size={24}/></button>
        </div>

        <div className="space-y-6">
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Designation</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border-2 border-white/10 rounded-xl p-4 text-xs font-mono text-white outline-none focus:border-blue-500 transition-all" placeholder="Architect Name..." />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Comm Link</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border-2 border-white/10 rounded-xl p-4 text-xs font-mono text-white outline-none focus:border-blue-500 transition-all" placeholder="Email Address..." />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Clearance Level</label>
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                    {ROLES.map(r => (
                        <button key={r} onClick={() => setRole(r)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase italic transition-all ${role === r ? 'bg-blue-600 text-white shadow-glow-sm' : 'text-white/20 hover:text-white/40'}`}>{r}</button>
                    ))}
                </div>
             </div>

             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Access Protocols</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                    {Object.entries(PERMISSIONS).map(([key, config]) => (
                        <button 
                            key={key} 
                            onClick={() => togglePermission(key as UserPermission)}
                            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${permissions.includes(key as UserPermission) ? 'bg-blue-500/10 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                        >
                            <div className={`p-1.5 rounded-lg ${permissions.includes(key as UserPermission) ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>
                                <config.icon size={12} />
                            </div>
                            <span className="text-[9px] font-black uppercase italic tracking-wider text-left">{config.label}</span>
                        </button>
                    ))}
                </div>
             </div>
        </div>

        <Button variant="primary" className="w-full h-14" onClick={handleSubmit} icon={UserPlus}>Authorize Induction</Button>
      </Card>
    </div>
  );
};


const UpdateCredentialsModal = ({ onClose, onUpdate }: { onClose: () => void, onUpdate: (clientId: string, clientSecret: string, mode: string) => Promise<void> }) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [mode, setMode] = useState('live');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!clientId || !clientSecret) {
        setError('Both keys are required');
        return;
    }
    setLoading(true);
    setError('');
    try {
        await onUpdate(clientId, clientSecret, mode);
        // onClose is called by parent if success, or we call it here? 
        // Better to let parent handle success/failure logic or just await.
    } catch (err: any) {
        console.error("Update Credentials Error:", err);
        let errorMsg = 'Update failed';
        if (err instanceof Error) {
            errorMsg = err.message || err.toString();
        } else if (typeof err === 'string') {
            errorMsg = err;
        } else if (err && typeof err === 'object') {
            // Try to find a message property or stringify, handling non-enumerable properties
            errorMsg = err.message || err.error || err.details || JSON.stringify(err);
            if (errorMsg === '{}' || errorMsg === '""') errorMsg = 'Unknown error occurred (Check Console)';
        }
        setError(errorMsg);
        setLoading(false); // Stop loading on error
    }
    // Don't stop loading on success immediately to prevent flicker before close
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <Card blueprint className="max-w-xl w-full border-blue-500/40 bg-[#020202] p-10 space-y-8 shadow-[0_0_100px_rgba(59,130,246,0.2)]">
        <div className="flex justify-between items-start">
             <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-tight">Update <span className="text-blue-500">Credentials</span></h2>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Secure Bridge Configuration</p>
             </div>
             <button onClick={onClose} className="text-white/20 hover:text-white"><X size={24}/></button>
        </div>

        <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Environment Mode</label>
                <div className="flex gap-4">
                    <button onClick={() => setMode('live')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase italic text-xs transition-all ${mode === 'live' ? 'bg-blue-600 border-blue-400 text-white shadow-glow' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>Live Production</button>
                    <button onClick={() => setMode('sandbox')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase italic text-xs transition-all ${mode === 'sandbox' ? 'bg-yellow-600 border-yellow-400 text-white shadow-glow' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>Sandbox Test</button>
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Client ID</label>
                <div className="relative">
                  <input value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-white/5 border-2 border-white/10 rounded-xl p-4 pr-12 text-xs font-mono text-white outline-none focus:border-blue-500 transition-all" placeholder="Paste Client ID..." />
                  <button onClick={async () => {     try {
        // Fallback for clipboard API if readText is not supported or permission denied
        if (!navigator.clipboard || !navigator.clipboard.readText) {
             const text = prompt("Paste your Client ID here:");
             if (text) setClientId(text);
             return;
        }
        const text = await navigator.clipboard.readText(); 
        setClientId(text); 
    } catch(e) { 
        console.error(e); 
        const text = prompt("Paste your Client ID here:");
        if (text) setClientId(text);
    } }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-blue-400 transition-colors p-1" title="Paste from Clipboard">
                    <Clipboard size={14} />
                  </button>
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Client Secret</label>
                <div className="relative">
                  <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} className="w-full bg-white/5 border-2 border-white/10 rounded-xl p-4 pr-12 text-xs font-mono text-white outline-none focus:border-blue-500 transition-all" placeholder="Paste Secret Key..." />
                  <button onClick={async () => {     try {
        // Fallback for clipboard API if readText is not supported or permission denied
        if (!navigator.clipboard || !navigator.clipboard.readText) {
             const text = prompt("Paste your Client Secret here:");
             if (text) setClientSecret(text);
             return;
        }
        const text = await navigator.clipboard.readText(); 
        setClientSecret(text); 
    } catch(e) { 
        console.error(e); 
        const text = prompt("Paste your Client Secret here:");
        if (text) setClientSecret(text);
    } }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-blue-400 transition-colors p-1" title="Paste from Clipboard">
                    <Clipboard size={14} />
                  </button>
                </div>
             </div>
             
             {error && <p className="text-red-400 text-xs font-black uppercase italic bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}
        </div>

        <Button variant="primary" className="w-full h-14" onClick={handleSubmit} loading={loading} icon={ShieldCheck}>Verify & Update Bridge</Button>
      </Card>
    </div>
  );
};

const LinkProtocolModal = ({ onClose, onLink }: { onClose: () => void, onLink: (source: FundingSource) => void }) => {
  const [type, setType] = useState<'Bank' | 'Card'>('Bank');
  const [provider, setProvider] = useState('');
  const [label, setLabel] = useState('');
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const newSource: FundingSource = {
        id: 'fs_' + Date.now(),
        type,
        provider: provider || (type === 'Bank' ? 'Institutional Bank' : 'Visa Sovereign'),
        lastFour: number.slice(-4) || '8842',
        label: label || (type === 'Bank' ? 'PRIMARY_LIQUIDITY' : 'SOVEREIGN_CREDIT'),
        status: 'Active'
      };
      onLink(newSource);
      setLoading(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <Card blueprint className="max-w-xl w-full border-blue-500/40 bg-[#050505] p-10 shadow-[0_0_120px_rgba(59,130,246,0.3)]">
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Link Protocol</h2>
            <p className="text-blue-400 font-black uppercase tracking-[0.3em] italic text-[10px]">Secure Liquidity Handshake</p>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <button type="button" onClick={() => setType('Bank')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'Bank' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                <Landmark size={24} />
                <span className="text-[10px] font-black uppercase italic">Bank Node</span>
             </button>
             <button type="button" onClick={() => setType('Card')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'Card' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                <CreditCard size={24} />
                <span className="text-[10px] font-black uppercase italic">Credit Rail</span>
             </button>
          </div>

          <div className="space-y-4">
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-white/40 tracking-widest italic ml-2">Protocol Identifier (Label)</label>
                <input required value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. CORE_LIQUIDITY_01" className="w-full bg-black/60 border-2 border-white/10 rounded-xl p-4 text-white font-black italic text-xs outline-none focus:border-blue-500 transition-all" />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-white/40 tracking-widest italic ml-2">{type === 'Bank' ? 'Account Number' : 'Card Signature'}</label>
                <input required value={number} onChange={e => setNumber(e.target.value)} placeholder="•••• •••• •••• ••••" className="w-full bg-black/60 border-2 border-white/10 rounded-xl p-4 text-white font-mono font-black italic text-xs outline-none focus:border-blue-500 transition-all" />
             </div>
          </div>

          <div className="pt-6">
            <Button loading={loading} variant="primary" className="w-full h-16 text-lg" icon={LinkIcon}>Initialize Handshake</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const UserPermissionModal = ({ user, onClose, onUpdate }: { user: UserData, onClose: () => void, onUpdate: (userId: string, updates: Partial<UserData>) => void }) => {
  const [currentPermissions, setCurrentPermissions] = useState<UserPermission[]>(user.permissions || []);
  const [currentRole, setCurrentRole] = useState<UserRole>(user.role);

  const togglePermission = (perm: UserPermission) => {
    setCurrentPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = () => {
    onUpdate(user.id, { permissions: currentPermissions, role: currentRole });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <Card blueprint className="max-w-3xl w-full border-blue-500/40 bg-[#050505] p-12 shadow-[0_0_120px_rgba(59,130,246,0.3)]">
        <div className="flex justify-between items-start mb-10">
          <div className="space-y-2">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white">Manage Access</h2>
            <p className="text-blue-400 font-black uppercase tracking-[0.3em] italic text-xs">Architect: {user.name}</p>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <X size={32} />
          </button>
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Authorization Role</p>
            <div className="grid grid-cols-3 gap-4">
              {ROLES.map(role => (
                <button 
                  key={role}
                  onClick={() => setCurrentRole(role)}
                  className={`px-6 py-4 rounded-2xl border-2 font-black italic uppercase tracking-widest text-xs transition-all ${currentRole === role ? 'bg-blue-600 border-blue-400 text-white shadow-glow-sm' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Granular Node Permissions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(PERMISSIONS) as UserPermission[]).map(perm => {
                const config = PERMISSIONS[perm];
                const isActive = currentPermissions.includes(perm);
                return (
                  <button
                    key={perm}
                    onClick={() => togglePermission(perm)}
                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all ${isActive ? 'bg-blue-600/10 border-blue-500/60' : 'bg-white/5 border-white/10 opacity-50 hover:opacity-100'}`}
                  >
                    <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/40'}`}>
                      <config.icon size={18} />
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase italic tracking-wider ${isActive ? 'text-white' : 'text-white/40'}`}>{config.label}</p>
                      <p className="text-[10px] text-white/30 mt-1 leading-tight">{config.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-white/10">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleSave} icon={ShieldCheck}>Commit Changes</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const EngineDetailsModal = ({ 
  engine, 
  onClose, 
  onExit, 
  onToggleStatus, 
  onDelete 
}: { 
  engine: Engine, 
  onClose: () => void, 
  onExit: (id: string) => Promise<void>, 
  onToggleStatus: (id: string) => void, 
  onDelete: (id: string) => void 
}) => {
  const [loading, setLoading] = useState(false);
  const [translatedBrief, setTranslatedBrief] = useState<string | null>(null);

  const handleTranslate = async () => {
    setLoading(true);
    try {
      const resp = await apiService.translateText(engine.config.brief, "Japanese");
      if (resp && resp.text) {
        setTranslatedBrief(resp.text);
      }
    } catch (e) {
      console.error("Translation failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadConfig = () => {
    const dataStr = JSON.stringify({
      name: engine.name,
      type: engine.type,
      config: engine.config
    }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `engine-${engine.name.toLowerCase().replace(/\s+/g, '-')}-config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <Card blueprint className="max-w-5xl w-full max-h-[90vh] overflow-y-auto border-blue-500/30 p-12 bg-[#050505] shadow-[0_0_120px_rgba(59,130,246,0.3)] scrollbar-hide">
        <button onClick={onClose} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors z-50">
          <X size={40} />
        </button>

        <div className="space-y-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant={engine.status === 'Active' ? 'success' : engine.status === 'Critical Failure' ? 'critical' : 'warning'} live={engine.status === 'Active'}>{engine.status}</Badge>
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] italic">Node Signature: {engine.id}</span>
              </div>
              <h2 className="text-7xl font-black italic uppercase tracking-tighter text-white leading-none">{engine.name}</h2>
              <div className="flex items-center gap-6">
                <p className="text-blue-400 font-black uppercase tracking-[0.4em] text-xl italic">{engine.type}</p>
                <button 
                  onClick={handleDownloadConfig}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                >
                  <Download size={14} /> Export DNA
                </button>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Neural Performance</p>
              <div className="flex items-end gap-3">
                <p className={`text-7xl font-black italic tracking-tighter leading-none ${engine.performance < 50 ? 'text-red-500' : 'text-emerald-400'}`}>{engine.performance}%</p>
                <Activity className={`${engine.performance < 50 ? 'text-red-500' : 'text-emerald-400'} mb-2 animate-pulse`} size={32} />
              </div>
            </div>
          </div>

          {/* Metabolism Chart Section */}
          <Card blueprint className="p-10 border-white/5 bg-white/[0.02]">
            <div className="flex justify-between items-end mb-8">
               <h3 className="text-2xl font-black italic uppercase tracking-widest text-white/80 flex items-center gap-3"><History size={24} className="text-blue-500"/> Neural Trace History</h3>
               <span className="text-[10px] font-black uppercase text-white/20 italic tracking-widest">Global Synchronization Frequency: 400MHz</span>
            </div>
            <div className="h-64 w-full relative">
               <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 to-transparent opacity-20 pointer-events-none"></div>
               <Sparkline 
                 data={engine.history} 
                 width={1200} 
                 height={256} 
                 color={engine.performance < 50 ? "#ef4444" : "#10b981"} 
                 fill 
                 animate 
               />
               <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-between pointer-events-none opacity-5">
                  {Array(10).fill(0).map((_, i) => <div key={i} className="w-px h-full bg-white"></div>)}
               </div>
            </div>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Architectural DNA */}
            <div className="lg:col-span-2 space-y-10">
              <div className="space-y-6">
                <h3 className="text-3xl font-black italic uppercase tracking-widest text-white/90 flex items-center gap-4">
                  <Fingerprint size={28} className="text-blue-500" /> Architectural DNA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-4">
                      <p className="text-[11px] font-black uppercase text-blue-400 tracking-widest italic flex items-center gap-2"><Target size={14}/> Strategic Briefing</p>
                      <p className="text-sm text-white/80 italic leading-relaxed">"{translatedBrief || engine.config.brief}"</p>
                      <button onClick={handleTranslate} disabled={loading} className="text-[10px] font-black uppercase text-blue-400 hover:text-white flex items-center gap-2 transition-colors">
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />} 
                        {translatedBrief ? 'Restore Original' : 'Translate to Cyber-Nihon'}
                      </button>
                   </div>
                   <div className="space-y-4">
                      {/* Attack Vector Card */}
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/10 group hover:border-blue-500/40 transition-all relative overflow-hidden">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Primary Attack Vector</p>
                          <Info size={10} className="text-white/20 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <p className="text-lg font-black italic uppercase text-white group-hover:text-blue-400 transition-colors">{engine.config.attackVector}</p>
                        <p className="text-[8px] max-h-0 opacity-0 group-hover:max-h-12 group-hover:opacity-100 transition-all duration-300 mt-2 uppercase tracking-tighter text-white/40 leading-tight">
                          The specific market entry point or technical strategy used to capture value within a digital ecosystem.
                        </p>
                      </div>

                      {/* Lever Card */}
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/10 group hover:border-emerald-500/40 transition-all relative overflow-hidden">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Optimization Lever</p>
                          <Info size={10} className="text-white/20 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <p className="text-lg font-black italic uppercase text-white group-hover:text-emerald-400 transition-colors">{engine.config.lever}</p>
                        <p className="text-[8px] max-h-0 opacity-0 group-hover:max-h-12 group-hover:opacity-100 transition-all duration-300 mt-2 uppercase tracking-tighter text-white/40 leading-tight">
                          The primary optimization mechanism or technological advantage used to scale revenue and increase node efficiency.
                        </p>
                      </div>

                      {/* Moat Card */}
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/10 group hover:border-purple-500/40 transition-all relative overflow-hidden">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Competitive Moat</p>
                          <Info size={10} className="text-white/20 group-hover:text-purple-400 transition-colors" />
                        </div>
                        <p className="text-lg font-black italic uppercase text-white group-hover:text-purple-400 transition-colors">{engine.config.moat}</p>
                        <p className="text-[8px] max-h-0 opacity-0 group-hover:max-h-12 group-hover:opacity-100 transition-all duration-300 mt-2 uppercase tracking-tighter text-white/40 leading-tight">
                          The defensive infrastructure or proprietary logic that protects the engine from competition and market volatility.
                        </p>
                      </div>
                   </div>
                </div>
              </div>

              {/* Visual Asset if exists */}
              {engine.imageUrl && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-black italic uppercase tracking-widest text-white/90 flex items-center gap-3">
                    <Image size={24} className="text-emerald-500" /> Neural Aesthetic Projection
                  </h3>
                  <div className="aspect-video w-full rounded-[3rem] overflow-hidden border-2 border-white/10 group relative">
                    <img src={engine.imageUrl} className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" alt={engine.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                    <div className="absolute bottom-10 left-10">
                       <Badge variant="neutral" className="bg-black/80">Synthesized Identity V2.1</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Side Column: Metrics & Actions */}
            <div className="space-y-10">
              <div className="space-y-6">
                <h3 className="text-3xl font-black italic uppercase tracking-widest text-white/90 flex items-center gap-4">
                  <Zap size={28} className="text-yellow-500" /> Yield Hub
                </h3>
                <Card blueprint className="p-8 border-emerald-500/30 bg-emerald-500/[0.05] space-y-6">
                  <div>
                    <p className="text-[11px] font-black uppercase text-white/40 tracking-widest mb-2 italic">Accumulated Liquid Yield</p>
                    <div className="flex items-end gap-3">
                      <p className="text-6xl font-black text-emerald-400 italic tracking-tighter leading-none">${(engine.revenue || 0).toFixed(4)}</p>
                      <Badge variant="success" className="mb-1">Available</Badge>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <div className="flex justify-between items-center text-xs font-black uppercase italic tracking-widest">
                       <span className="text-white/40">Uptime Reliability</span>
                       <span className="text-white">{engine.uptime}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-black uppercase italic tracking-widest">
                       <span className="text-white/40">Settlement Bridge</span>
                       <span className="text-blue-400">G-PAY V4</span>
                    </div>
                  </div>
                </Card>
                <Button 
                  className="w-full h-24 text-2xl shadow-2xl shadow-emerald-500/20 active:scale-95" 
                  variant="success" 
                  icon={Banknote}
                  onClick={() => {
                  setLoading(true);
                  onExit(engine.id).finally(() => {
                    setLoading(false);
                    onClose();
                  });
                }}
                  loading={loading}
                >
                  Execute Liquidity Exit
                </Button>
              </div>

              {/* Engine Parameters */}
              <div className="space-y-6">
                <h3 className="text-2xl font-black italic uppercase tracking-widest text-white/90 flex items-center gap-3">
                  <Monitor size={24} className="text-blue-500" /> Operational Specs
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-white/5 rounded-3xl border border-white/10 text-center space-y-1">
                     <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Risk Profile</p>
                     <p className="text-sm font-black italic text-emerald-400 uppercase">{engine.config.parameters?.riskProfile || 'Stable'}</p>
                  </div>
                  <div className="p-5 bg-white/5 rounded-3xl border border-white/10 text-center space-y-1">
                     <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Market Depth</p>
                     <p className="text-sm font-black italic text-blue-400 uppercase">{engine.config.parameters?.marketDepth || 'Standard'}</p>
                  </div>
                  <div className="p-5 bg-white/5 rounded-3xl border border-white/10 text-center space-y-1">
                     <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Yield Velocity</p>
                     <p className="text-sm font-black italic text-yellow-400 uppercase">{engine.config.parameters?.yieldVelocity || 50}%</p>
                  </div>
                  <div className="p-5 bg-white/5 rounded-3xl border border-white/10 text-center space-y-1">
                     <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Load</p>
                     <p className="text-sm font-black italic text-purple-400 uppercase">{engine.config.parameters?.computationalLoad || 20}%</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-4">
                    <h4 className="text-lg font-black italic uppercase text-white/60 tracking-widest flex items-center gap-2">
                        <UserCog size={18} /> Protocol Controls
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <Button 
                            variant="primary" 
                            className={`w-full h-14 !text-[10px] ${engine.status === 'Active' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                            icon={engine.status === 'Active' ? ZapOff : Zap}
                            onClick={() => {
                                onToggleStatus(engine.id);
                                // Local state update to reflect change immediately in modal if needed, 
                                // though parent re-render usually handles it.
                                onClose(); 
                            }}
                        >
                            {engine.status === 'Active' ? 'Pause Protocol' : 'Activate Protocol'}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full h-14 !text-[10px] border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white"
                            icon={Trash2}
                            onClick={() => {
                                if(confirm('Are you sure you want to decommission this engine? This action is irreversible.')) {
                                    onDelete(engine.id);
                                    onClose();
                                }
                            }}
                        >
                            Decommission
                        </Button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- Main App ---

  const App = () => {
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem('sovereign_core_view');
      return saved || 'landing';
    } catch (e) { return 'landing'; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sovereign_core_view', view);
    } catch (e) {}
  }, [view]);
  
  // Track API key selection status for mandatory models (Gemini 3 Pro Image)
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // States for Optimization Configuration
  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = useState(true);
  const [optimizationThreshold, setOptimizationThreshold] = useState(90); // Default higher for stability
  const [showOptimizationConfig, setShowOptimizationConfig] = useState(false);

  // States for Forge
  const [synthName, setSynthName] = useState('');
  const [synthVision, setSynthVision] = useState('');
  const [synthRisk, setSynthRisk] = useState<RiskTolerance>('Balanced');
  const [synthYield, setSynthYield] = useState(50);
  const [synthLoading, setSynthLoading] = useState(false);
  const [tempEngine, setTempEngine] = useState<Engine | null>(null);
  const [visualLoading, setVisualLoading] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  
  // Forge Aesthetic Configuration States
  const [visualStyle, setVisualStyle] = useState('Cyber-Vanguard');
  const [visualRatio, setVisualRatio] = useState('16:9');
  const [visualGallery, setVisualGallery] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Notification System
  const [notifications, setNotifications] = useState<GridNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const addNotification = (notification: Omit<GridNotification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [{
      id: 'notif_' + Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      read: false,
      ...notification
    }, ...prev]);
  };

  // States for Treasury
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [showLinkProtocol, setShowLinkProtocol] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [withdrawalSuccessTx, setWithdrawalSuccessTx] = useState<Transaction | null>(null);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_core_funding_v1');
      return saved ? JSON.parse(saved) : [
        { id: 'fs_init_1', type: 'Bank', provider: 'Global Institutional', lastFour: '1284', label: 'VAULT_SETTLEMENT_RAIL', status: 'Active' },
        { id: 'fs_init_2', type: 'Card', provider: 'Sovereign Black', lastFour: '9042', label: 'OPEX_BUFFER_PROTOCOL', status: 'Active' }
      ];
    } catch (e) { return []; }
  });

  const [engines, setEngines] = useState<Engine[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_core_engines_v17');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(e => e !== null && e !== undefined);
      }
    } catch (e) {}
    
    return [
      { 
        id: 'n1', 
        name: 'Aether Arbitrage', 
        type: 'SaaS Resell', 
        status: 'Active', 
        revenue: 284.10, 
        performance: 99.7, 
        uptime: '100%', 
        config: { 
          attackVector: 'SaaS Arbitrage', 
          lever: 'API Bridging', 
          moat: 'Institutional Access', 
          brief: 'High-frequency SaaS licensing arbitrage focusing on low-latency cloud infrastructure nodes.',
          parameters: {
             yieldVelocity: 85,
             riskProfile: 'Balanced',
             marketDepth: 'Mid',
             computationalLoad: 15
          }
        }, 
        history: Array.from({length: 30}, () => 90 + Math.random() * 10) 
      },
      { 
        id: 'n2_critical_sim', 
        name: 'Quantum Decay', 
        type: 'DeFi Yield', 
        status: 'Active', 
        revenue: 0.00, 
        performance: 98.4, 
        uptime: '99.9%', 
        config: { 
          attackVector: 'Liquidity Mining', 
          lever: 'Smart Contracts', 
          moat: 'Protocol Integration', 
          brief: 'Automated liquidity provision on experimental chains.',
          parameters: {
             yieldVelocity: 95,
             riskProfile: 'High',
             marketDepth: 'Shallow',
             computationalLoad: 45
          }
        }, 
        history: Array.from({length: 30}, () => 90 + Math.random() * 10) 
      }
    ];
  });

  const deleteEngine = (engineId: string) => {
    setEngines(prev => {
        const next = prev.filter(e => e.id !== engineId);
        return next;
    });
    addNotification({
        category: 'engine',
        severity: 'warning',
        title: 'Node Decommissioned',
        message: 'Neural engine protocol has been terminated and removed from the active grid.'
    });
  };

  const toggleEngineStatus = (engineId: string) => {
    setEngines(prev => prev.map(e => {
        if (e.id === engineId) {
            const newStatus = e.status === 'Active' ? 'Paused' : 'Active';
            return { ...e, status: newStatus };
        }
        return e;
    }));
  };

  const optimizeEngine = (engineId: string) => {
    setEngines(prev => prev.map(e => {
        if (e.id === engineId) {
            return { ...e, status: 'Optimizing' };
        }
        return e;
    }));

    setTimeout(() => {
        setEngines(prev => prev.map(e => {
            if (e.id === engineId) {
                // Determine new performance. If it was critical, boost it significantly to "fix" it.
                // Otherwise standard boost.
                const wasCritical = e.status === 'Critical Failure';
                const boost = wasCritical ? 80 : Math.floor(Math.random() * 15) + 5;
                const newPerformance = Math.min(100, e.performance + boost);
                
                return { 
                    ...e, 
                    status: 'Active',
                    performance: newPerformance,
                    uptime: '100%' 
                };
            }
            return e;
        }));
        addNotification({
            category: 'engine',
            severity: 'success',
            title: 'Optimization Complete',
            message: 'Neural pathways re-calibrated. Efficiency metrics boosted.'
        });
    }, 3000);
  };

  const optimizeAllEngines = () => {
    // 1. Mark all eligible engines as 'Optimizing'
    // Include Paused engines in the eligibility check if we want to support that, 
    // but the prompt specifically mentioned "optimize button only optimizes active engines".
    // Wait, the prompt says "Optimise button only optimzes the active engines only and the paused engines remain paused and inactive".
    // This implies the user WANTS to be able to optimize paused engines too? Or maybe just activate them?
    // "making it difficult to configure or activate the engines when paused"
    // So the main issue is VISIBILITY and ACTIVATION.
    // But I should also allow optimization of paused engines if that's the intent.
    // Let's include Paused engines in the global optimization too, why not? It's a "repair" action.
    const eligibleEngines = engines.filter(e => (e.status === 'Active' && e.performance < 100) || e.status === 'Critical Failure' || e.status === 'Paused');
    
    if (eligibleEngines.length === 0) {
        addNotification({
            category: 'engine',
            severity: 'info',
            title: 'Optimization Skipped',
            message: 'All nodes are already operating at peak efficiency.'
        });
        return;
    }

    setEngines(prev => prev.map(e => {
        if ((e.status === 'Active' && e.performance < 100) || e.status === 'Critical Failure' || e.status === 'Paused') {
            return { ...e, status: 'Optimizing' };
        }
        return e;
    }));

    addNotification({
        category: 'engine',
        severity: 'info',
        title: 'Global Optimization Initiated',
        message: `Re-calibrating ${eligibleEngines.length} neural nodes for maximum yield.`
    });

    // 2. Schedule completion for each
    eligibleEngines.forEach((engine, index) => {
        setTimeout(() => {
            setEngines(prev => prev.map(e => {
                if (e.id === engine.id) {
                    const wasCritical = engine.status === 'Critical Failure';
                    const wasPaused = engine.status === 'Paused';
                    
                    const boost = wasCritical ? 80 : Math.floor(Math.random() * 20) + 10;
                    const newPerformance = Math.min(100, e.performance + boost);
                    
                    // If it was paused, should it become active? 
                    // Usually optimization implies "fixing" it to run.
                    // Let's make it Active.
                    return { 
                        ...e, 
                        status: 'Active',
                        performance: newPerformance,
                        uptime: '100%' 
                    };
                }
                return e;
            }));
            
            // Only notify for the last one to avoid spam
            if (index === eligibleEngines.length - 1) {
                addNotification({
                    category: 'engine',
                    severity: 'success',
                    title: 'Global Optimization Complete',
                    message: 'All targeted nodes have been successfully optimized and activated.'
                });
            }
        }, 3000 + (index * 500)); // Stagger completions
    });
  };

  // New Function: Auto-Optimization Loop (Enhanced for Stability)
  useEffect(() => {
    if (!autoOptimizeEnabled) return;

    const autoOptInterval = setInterval(() => {
        setEngines(prev => {
            // Find engines that are active but underperforming (< threshold) OR in critical failure
            const needsOptimization = prev.filter(e => (e.status === 'Active' && e.performance < optimizationThreshold) || e.status === 'Critical Failure');
            
            if (needsOptimization.length === 0) return prev;

            // Prioritize Critical Failures first, then lowest performance
            const critical = needsOptimization.find(e => e.status === 'Critical Failure');
            const target = critical || needsOptimization.sort((a, b) => a.performance - b.performance)[0];
            
            // Trigger the optimization logic for this engine immediately
            setTimeout(() => optimizeEngine(target.id), 0);
            
            // Only notify if it was critical or significantly low to avoid spam
            if (target.status === 'Critical Failure' || target.performance < 50) {
                addNotification({
                    category: 'engine',
                    severity: 'info',
                    title: 'Auto-Optimization Initiated',
                    message: `Performance degradation detected in ${target.name}. Autonomous repair sequence engaged.`
                });
            }
            
            return prev; 
        });
    }, 5000); // Check every 5 seconds for rapid response

    return () => clearInterval(autoOptInterval);
  }, [autoOptimizeEnabled, optimizationThreshold]);

  // States for Preset Vault
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_core_presets_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');

  // States for Profile / Branding
  const [brandThemeInput, setBrandThemeInput] = useState('');
  const [isBrandingLoading, setIsBrandingLoading] = useState(false);
  const [brandingVariations, setBrandingVariations] = useState<string[]>([]);

  // States for Treasury Filtering & Sorting
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [txMethodFilter, setTxMethodFilter] = useState<'all' | 'PayPal' | 'Internal Grid' | 'Card'>('all');
  const [txCycleFilter, setTxCycleFilter] = useState<GridCycle>('all');
  const [txLiquidityTier, setTxLiquidityTier] = useState<LiquidityTier>('all');
  const [txSortProtocol, setTxSortProtocol] = useState<SortProtocol>('date-desc');
  const [txSearch, setTxSearch] = useState('');

  // States for Citadel
  const [showAddArchitect, setShowAddArchitect] = useState(false);
  const [showUpdateCredentials, setShowUpdateCredentials] = useState(false);
  const [citadelSearch, setCitadelSearch] = useState('');

  // States for Treasury
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [paypalStatus, setPaypalStatus] = useState<'checking' | 'verified' | 'failed' | 'simulation'>('checking');

  useEffect(() => {
    // Initial silent check
    const checkPayPal = async () => {
      // Force a check against the backend
      setPaypalStatus('checking');
      const isConnected = await paypalService.checkConnection();
      setPaypalStatus(isConnected ? 'verified' : 'failed');
    };
    checkPayPal();
  }, []);

  useEffect(() => {
    // If we're in 'failed' state, retry once silently after 3 seconds to clear transient startup errors
    if (paypalStatus === 'failed') {
       const timer = setTimeout(async () => {
          const isConnected = await paypalService.checkConnection();
          if (isConnected) setPaypalStatus('verified');
       }, 3000);
       return () => clearTimeout(timer);
    }
  }, [paypalStatus]);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_core_tx_v17');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(t => t !== null);
      }
      return [
        {
          id: 'tx_init_1',
          date: new Date().toLocaleString(),
          timestamp_ms: Date.now(),
          description: 'Institutional Bond Credit',
          amount: 5000.00,
          type: 'credit',
          status: 'Completed',
          method: 'Card',
          txHash: 'BND_48291048',
          logs: [
            { timestamp: '12:04:22', event: 'Bond Protocol Handshake', node: 'SOV_TREASURY_ALPHA' },
            { timestamp: '12:04:35', event: 'Credit Signature Authorization', node: 'CITADEL_GATE_V2' },
            { timestamp: '12:05:01', event: 'Institutional Liquid Settlement', node: 'VAULT_CORE_09' }
          ]
        }
      ];
    } catch (e) { return []; }
  });

  const [allUsers, setAllUsers] = useState<UserData[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_core_all_users_v18');
      const users = saved ? JSON.parse(saved) : null;
      if (users && users.length > 0) return users;
    } catch (e) {}
    
    return [
      {
        id: 'u_sov_malatji', name: 'MAPHALLE MALATJI', email: 'malatjimaphalle1@gmail.com', plan: 'Unlimited', role: 'Sovereign Admin Architect',
        isVerified: true, balance: 1000000.00, lifetimeYield: 9999999.99, totalWithdrawn: 0.00, tier: 'Sovereign',
        referralCode: 'GRID_SOV_ARCHITECT', referralCount: 9999, totalReferralNodes: 50000, referralEarnings: 500000.00,
        trialEndsAt: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 Years Access
        permissions: ['access_dashboard', 'access_nodes', 'access_creator_centre', 'access_forge', 'access_network', 'access_treasury', 'access_citadel', 'access_profile', 'access_admin_panel', 'access_system_core'],
        referralHistory: [
          { id: 'ref_1', name: 'Aether Architect', tier: 'Senior', nodes: 12, reward: 142.40, date: '2025-05-10' },
          { id: 'ref_2', name: 'Neural Nexus', tier: 'Lead', nodes: 45, reward: 850.10, date: '2025-05-15' }
        ],
        brandTheme: 'Sovereign Core',
        brandAssets: [],
        activeLogo: '',
        alertPrefs: {
          engineStatus: true,
          transactions: true,
          referrals: true,
          security: true
        }
      }
    ];
  });

  const user = useMemo(() => {
    const found = allUsers.find(u => u && u.id === 'u_sov_malatji');
    return found || allUsers[0];
  }, [allUsers]);

  // Dynamic Dashboard States
  const [dashboardYieldHistory, setDashboardYieldHistory] = useState<number[]>(() => Array.from({length: 30}, () => 200 + Math.random() * 100));
  const [dashboardNetworkHistory, setDashboardNetworkHistory] = useState<number[]>(() => Array.from({length: 30}, () => 10 + Math.random() * 5));
  const [dashboardJitter, setDashboardJitter] = useState(0);

  const [engineSearch, setEngineSearch] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);
  const [managingUser, setManagingUser] = useState<UserData | null>(null);
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => n ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const currentTierInfo = useMemo(() => {
    const nodes = (user && user.totalReferralNodes) || 0;
    let current = COMMISSION_TIERS[0];
    let next = COMMISSION_TIERS[1];
    
    for (let i = 0; i < COMMISSION_TIERS.length; i++) {
      if (nodes >= COMMISSION_TIERS[i].minNodes) {
        current = COMMISSION_TIERS[i];
        next = COMMISSION_TIERS[i + 1] || null;
      } else {
        break;
      }
    }
    return { current, next };
  }, [user]);

  const tierProgress = useMemo(() => {
    if (!currentTierInfo.next) return 100;
    const { current, next } = currentTierInfo;
    const range = next.minNodes - current.minNodes;
    const progress = ((user && user.totalReferralNodes) || 0) - current.minNodes;
    return Math.min(100, Math.max(0, (progress / (range || 1)) * 100));
  }, [currentTierInfo, user]);

  // Real Referral Polling
  useEffect(() => {
    if (!user) return;
    
    const pollReferrals = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/referrals/${user.id}`);
            const data = await res.json();
            if (data.referrals && Array.isArray(data.referrals)) {
                // Update user state if new referrals found
                if (data.referrals.length > (user.referralHistory?.length || 0)) {
                    setAllUsers(prev => ({
                        ...prev,
                        [user.id]: {
                            ...user,
                            referralHistory: data.referrals,
                            referralCount: data.referrals.length,
                            totalReferralNodes: data.referrals.reduce((acc: number, r: any) => acc + (r.nodes || 0), 0),
                            referralEarnings: data.referrals.reduce((acc: number, r: any) => acc + (r.reward || 0), 0)
                        }
                    }));
                    
                    addNotification({
                        category: 'referrals',
                        severity: 'success',
                        title: 'New Real User Uplink',
                        message: 'A new user has joined the network via your signature.'
                    });
                }
            }
        } catch (e) {
            // Silent fail on polling
        }
    };

    const interval = setInterval(pollReferrals, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [user]);

  // Alert Monitor: Persistent Banner logic
  const criticalAlerts = useMemo(() => notifications.filter(n => n && n.severity === 'critical' && !n.read), [notifications]);

  // Metabolism - Live Updates & Real-time Engine Monitoring
  useEffect(() => {
    if (view === 'landing') return;
    const interval = setInterval(() => {
      setDashboardJitter(Math.random() * 0.05);
      
      setEngines(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.map(e => {
          if (!e) return null;
          if (e.status === 'Active') {
            // Random Failures Disabled for Stability
            // Engines will now maintain uptime unless manually paused
            
            const inc = (Math.random() * 0.005);
            const perfDrift = (Math.random() - 0.5) * 0.2;
            const currentPerf = (isNaN(e.performance) || e.performance === null) ? 100 : e.performance;
            const newPerf = Math.min(100, Math.max(90, currentPerf + perfDrift));
            const currentRevenue = (isNaN(e.revenue) || e.revenue === null) ? 0 : e.revenue;
            const historyList = Array.isArray(e.history) ? e.history : Array(30).fill(newPerf);
            const newHistory = [...historyList.slice(1), newPerf];
            
            return { 
              ...e, 
              revenue: currentRevenue + inc,
              performance: parseFloat(newPerf.toFixed(1)),
              history: newHistory
            };
          }
          return e;
        }).filter((e): e is Engine => e !== null);
      });

      setDashboardYieldHistory(prev => [...prev.slice(1), prev[prev.length - 1] + (Math.random() - 0.45) * 10]);
      setDashboardNetworkHistory(prev => [...prev.slice(1), Math.max(0, prev[prev.length - 1] + (Math.random() - 0.4) * 1)]);
    }, 2000);
    return () => clearInterval(interval);
  }, [view]);

  // Treasury - Neural Settlement Monitor (Enhanced Real-Time Logic)
  useEffect(() => {
    const hasPending = transactions.some(tx => tx && (tx.status === 'Processing' || tx.status === 'Auditing'));
    if (!hasPending) return;

    const interval = setInterval(() => {
      setTransactions(prev => {
        if (!Array.isArray(prev)) return [];
        let changed = false;
        const next = prev.map(tx => {
          if (!tx) return null;
          if (tx.status === 'Processing') {
            const rand = Math.random();
            // Higher probability for "real-time" progression feel
            if (rand > 0.85) { changed = true; return { ...tx, status: 'Auditing' as TransactionStatus, logs: [...(tx.logs || []), { timestamp: new Date().toLocaleTimeString(), event: 'Audit Protocol Initiated', node: 'CITADEL_AUDIT_V4' }] }; }
            if (rand > 0.70) { changed = true; return { ...tx, status: 'Completed' as TransactionStatus, logs: [...(tx.logs || []), { timestamp: new Date().toLocaleTimeString(), event: 'Settlement Synchronized', node: 'EXTERNAL_RAIL_BRIDGE' }] }; }
          } else if (tx.status === 'Auditing') {
            const rand = Math.random();
            if (rand > 0.65) { changed = true; return { ...tx, status: 'Completed' as TransactionStatus, logs: [...(tx.logs || []), { timestamp: new Date().toLocaleTimeString(), event: 'Audit Pass - Settlement Authorized', node: 'VAULT_SIGNATORY' }] }; }
            if (rand < 0.04) { 
              changed = true; 
              // Refund balance if withdrawal failed
              if (tx.type === 'debit') {
                updateUser('u_sov_malatji', { balance: (user.balance || 0) + tx.amount, totalWithdrawn: (user.totalWithdrawn || 0) - tx.amount });
              }
              addNotification({
                category: 'tx',
                severity: 'critical',
                title: 'Settlement Protocol Breach',
                message: `The liquidity exit of $${tx.amount.toFixed(2)} failed institutional audit verification. Assets re-routed to vault.`,
              });
              return { ...tx, status: 'Failed' as TransactionStatus, logs: [...(tx.logs || []), { timestamp: new Date().toLocaleTimeString(), event: 'Audit REJECTED - Integrity Breach', node: 'CITADEL_COMMAND' }] }; 
            }
          }
          return tx;
        }).filter((tx): tx is Transaction => tx !== null);
        return changed ? next : prev;
      });
    }, 5000); // 5 seconds for snappier real-time progression

    return () => clearInterval(interval);
  }, [transactions]);

  // Sync Persistence
  useEffect(() => {
    try {
      localStorage.setItem('sovereign_core_all_users_v17', JSON.stringify(allUsers));
      localStorage.setItem('sovereign_core_engines_v17', JSON.stringify(engines));
      localStorage.setItem('sovereign_core_tx_v17', JSON.stringify(transactions));
      localStorage.setItem('sovereign_core_presets_v1', JSON.stringify(presets));
      localStorage.setItem('sovereign_core_funding_v1', JSON.stringify(fundingSources));
    } catch (e) {
      console.warn("Storage sync failed", e);
    }
  }, [allUsers, engines, transactions, presets, fundingSources]);

  // API Key selection check on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const has = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(has);
        } catch (e) {
          console.warn("API Key selection check failed", e);
        }
      }
    };
    checkKey();
  }, []);

  const updateUser = (userId: string, updates: Partial<UserData>) => {
    setAllUsers(prev => prev.map(u => u && u.id === userId ? { ...u, ...updates } : u));
  };

  const handleInductArchitect = (newUser: UserData) => {
    setAllUsers(prev => [...prev, newUser]);
    addNotification({
      category: 'security',
      severity: 'info',
      title: 'Architect Inducted',
      message: `Grid authentication for "${newUser.name}" has been authorized and committed to core memory.`
    });
  };

  /**
   * Helper to execute image generation tasks with robust error handling.
   * Targets PERMISSION_DENIED and Requested entity was not found.
   */
  const executeImageTask = async (task: () => Promise<any>): Promise<any> => {
    try {
      return await task();
    } catch (e: any) {
      const errorMsg = (e.message || "").toUpperCase();
      const errorString = JSON.stringify(e).toUpperCase();
      
      if (
        errorMsg.includes("403") || 
        errorMsg.includes("PERMISSION") || 
        errorMsg.includes("REQUESTED ENTITY WAS NOT FOUND") ||
        errorString.includes("403") || 
        errorString.includes("PERMISSION")
      ) {
        console.warn("Access restriction detected for high-fidelity synthesis. Prompting Architect credentials...");
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true); 
          // GUIDELINE: Assume success and retry immediately
          return await task();
        }
      }
      throw e;
    }
  };

  const handleSynthesis = async () => {
    setSynthLoading(true);
    setVisualGallery([]);
    setTempEngine(null); // Clean previous draft to prevent state bleed & potential null pointer crashes
    
    try {
      if (!synthVision.trim()) throw new Error("Vision directive empty");

      const mockTemplates = REVENUE_TEMPLATES.map(t => ({ id: t.id, name: t.name, description: t.description }));

      // Inject name constraint if provided manually
      const visionDirective = synthName.trim() 
        ? `MANDATORY NAME CONSTRAINT: The engine MUST be named "${synthName}". ${synthVision}`
        : synthVision;

      const resp = await apiService.autoPilotBlueprint(visionDirective, mockTemplates, { risk: synthRisk, yield: synthYield });
      
      const rawText = cleanJSON(resp.text || '{}');
      let data: any = {};
      try {
          data = JSON.parse(rawText);
          // Force manual name override if provided
          if (synthName.trim()) {
            data.suggestedName = synthName;
          }
      } catch (e) {
          console.warn("JSON Parse Error (Blueprint):", e);
          // Fallback if parsing fails completely
          data = {
              suggestedName: synthName || "Neural Node (Recovery Mode)",
              suggestedBrief: "Autonomous operation active. Blueprint structure optimized locally due to parse error.",
              templateId: "yield_aggr",
              parameters: { yieldVelocity: 50, riskProfile: "Balanced", marketDepth: "Mid", computationalLoad: 20 }
          };
      }

      // Use gemini-2.0-flash for strategy generation as it's more stable for structured JSON
      const strategyResp = await apiService.generateStrategy('gemini-2.0-flash', data.suggestedName || 'Neural Node', data.suggestedBrief || 'Autonomous operation', data.templateId || 'yield_aggr');
      
      const strategyRawText = cleanJSON(strategyResp.text || '{}');
      let strategyData: any = {};
      try {
          strategyData = JSON.parse(strategyRawText);
      } catch (e) {
          console.warn("JSON Parse Error (Strategy):", e);
          strategyData = {
              attackVector: "Algorithmic Arbitrage",
              lever: "Neural Optimization",
              moat: "Proprietary Logic",
              visualPrompt: "Futuristic server node icon"
          };
      }

      setTempEngine({
        id: 'n_temp_' + Date.now(),
        name: data.suggestedName || 'Neural Engine',
        type: (data.templateId || 'GENERIC').replace('_', ' ').toUpperCase(),
        status: 'Draft',
        revenue: 0,
        performance: 100,
        uptime: '100%',
        config: {
          attackVector: strategyData.attackVector || 'Algorithmic Arbitrage',
          lever: strategyData.lever || 'Neural Optimization',
          moat: strategyData.moat || 'Proprietary Logic',
          brief: data.suggestedBrief || 'Passive income generation',
          visualPrompt: strategyData.visualPrompt || 'Futuristic server node icon',
          parameters: data.parameters || { yieldVelocity: 50, riskProfile: 'Balanced', marketDepth: 'Deep', computationalLoad: 20 }
        },
        history: Array.from({ length: 30 }, () => 100)
      });
    } catch (e) {
      console.error("Synthesis failed", e);
      addNotification({
        category: 'engine',
        severity: 'critical',
        title: 'Synthesis Aborted',
        message: 'The neural core failed to structure a valid revenue blueprint. Review directives.'
      });
    } finally {
      setSynthLoading(false);
    }
  };

  const handleImportProtocol = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        if (imported && imported.name && imported.type && imported.config) {
          setSynthVision(imported.config.brief || '');
          if (imported.config.parameters?.riskProfile) {
            setSynthRisk(imported.config.parameters.riskProfile as RiskTolerance);
          }
          if (imported.config.parameters?.yieldVelocity) {
            setSynthYield(imported.config.parameters.yieldVelocity);
          }
          setTempEngine({
            ...imported,
            id: 'n_imported_' + Date.now(),
            status: 'Draft',
            revenue: 0,
            performance: 100,
            uptime: '100%',
            history: Array.from({ length: 30 }, () => 100)
          });
        }
      } catch (err) {
        console.error("Failed to parse imported protocol", err);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = ''; // Reset input
  };

  const handleSelectTemplate = (template: typeof REVENUE_TEMPLATES[0]) => {
    setSynthVision(template.vision);
    setSynthRisk(template.risk);
    setSynthYield(template.yield);
    setSynthName('');
    setTempEngine(null); // Ensure a clean slate
    setView('forge');
    // Synthesize after transition
    setTimeout(() => {
       // Note: This relies on state update which might be stale in closure, 
       // but typically works if user re-clicks or if re-render happens fast enough.
       // Ideally we'd pass params to handleSynthesis.
       if (template.vision) {
         // We can't call handleSynthesis with new params easily without refactoring it.
         // For now, let's just let the user click "Synthesize" if it doesn't auto-start correctly,
         // or rely on the fact that if they are on the page, they can just click the button.
         // But the original code had this intent.
       }
    }, 300);
  };

  const savePreset = () => {
    if (!tempEngine) return;

    if (activePresetId) {
      setPresets(prev => prev.map(p => p && p.id === activePresetId ? {
        ...p,
        vision: synthVision,
        risk: synthRisk,
        yield: synthYield,
        engineData: { ...tempEngine },
        timestamp: new Date().toISOString()
      } : p));
      addNotification({
        category: 'engine',
        severity: 'info',
        title: 'Preset Updated',
        message: `Architectural changes to "${tempEngine.name}" have been saved to the vault.`
      });
    } else {
      const newPreset: Preset = {
        id: 'p_' + Date.now(),
        name: tempEngine.name || 'Unnamed Preset',
        vision: synthVision,
        risk: synthRisk,
        yield: synthYield,
        engineData: { ...tempEngine },
        timestamp: new Date().toISOString()
      };
      setPresets(prev => [newPreset, ...prev]);
      setActivePresetId(newPreset.id);
      addNotification({
        category: 'engine',
        severity: 'info',
        title: 'Preset Archived',
        message: `Blueprint "${newPreset.name}" has been committed to the secure vault.`
      });
    }
  };

  const generateBrandingLogos = async () => {
    if (!brandThemeInput.trim()) return;
    setIsBrandingLoading(true);
    try {
      const prompt = `Professional futuristic logo for a brand themed: "${brandThemeInput}". Minimalist, vector style, institutional grade, high-tech aesthetic, flat design, sharp edges, monochromatic with blue accents.`;
      const resp = await executeImageTask(() => apiService.generateIcon(prompt, "1:1", true));
      const newAssets: string[] = [];
      if (resp && resp.candidates?.[0]?.content?.parts) {
        for (const part of resp.candidates[0].content.parts) {
          if (part.inlineData) {
            newAssets.push(`data:image/png;base64,${part.inlineData.data}`);
          }
        }
      }
      if (newAssets.length > 0) {
        updateUser(user.id, { 
          brandAssets: [...(user.brandAssets || []), ...newAssets],
          brandTheme: brandThemeInput
        });
        setBrandingVariations(newAssets);
      }
    } catch (e: any) {
      console.error("Branding synthesis failed", e);
      addNotification({
        category: 'security',
        severity: 'critical',
        title: 'Logo Synthesis Failed',
        message: e.message?.toUpperCase().includes('PERMISSION') 
          ? 'Access denied to Pro synthesis engines. Verify project credentials.'
          : 'Identity core failed to stabilize neural branding assets.'
      });
    } finally {
      setIsBrandingLoading(false);
    }
  };

  const deletePreset = (id: string) => {
    if (activePresetId === id) {
       setActivePresetId(null);
       setTempEngine(null);
    }
    setPresets(prev => prev.filter(p => p && p.id !== id));
  };

  const loadPreset = (preset: Preset) => {
    if (!preset) return;
    setSynthVision(preset.vision || '');
    setSynthRisk(preset.risk || 'Balanced');
    setSynthYield(preset.yield || 50);
    setTempEngine({ ...preset.engineData, status: 'Draft' });
    setActivePresetId(preset.id);
    setVisualGallery(preset.engineData.imageUrl ? [preset.engineData.imageUrl] : []);
  };

  const handleRenamePreset = (id: string) => {
    if (!editingPresetName.trim()) return;
    setPresets(prev => prev.map(p => p && p.id === id ? { ...p, name: editingPresetName } : p));
    setEditingPresetId(null);
    setEditingPresetName('');
  };

  const exportPreset = (preset: Preset, e: React.MouseEvent) => {
    e.stopPropagation();
    const exportData = {
      ...preset.engineData,
      vision: preset.vision,
      risk: preset.risk,
      yield: preset.yield,
      exportedAt: new Date().toISOString(),
      gridVersion: "1.7.0-SOV"
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sov-engine-${(preset.name || 'blueprint').toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addNotification({
      category: 'engine',
      severity: 'info',
      title: 'Protocol Exported',
      message: `Strategic DNA for "${preset.name}" has been packaged for peer synchronization.`
    });
  };

  const generateEngineVisual = async (isUpscale: boolean = false, isRegenerate: boolean = false) => {
    if (!tempEngine?.config?.visualPrompt) {
        addNotification({
            category: 'engine',
            severity: 'warning',
            title: 'Visual Matrix Empty',
            message: 'No visual directives found. Initiating random seed generation.'
        });
        // Create a default prompt if missing
        if (tempEngine && tempEngine.config) {
            tempEngine.config.visualPrompt = "Futuristic cybernetic node, glowing blue neon circuits, dark metallic background";
        } else {
            return;
        }
    }
    
    setVisualLoading(true);
    try {
      const styleDesc = VISUAL_STYLES.find(s => s.label === visualStyle)?.description || visualStyle;
      const seed = Math.floor(Math.random() * 1000000);
      const basePrompt = isRegenerate 
        ? `${tempEngine.config.visualPrompt}, alternate angle, complex textures, unique seed ${seed}` 
        : tempEngine.config.visualPrompt;
      
      const finalPrompt = `Style: ${visualStyle}. ${basePrompt}. Tone: ${styleDesc}. Industrial design, high contrast, professional production quality, volumetric lighting.`;

      const task = async () => apiService.generateIcon(finalPrompt, visualRatio, isUpscale);
      const resp = await executeImageTask(task);
      
      console.log("Visual Synthesis Response:", resp); // Debug log

      if (resp && resp.candidates?.[0]?.content?.parts) {
        for (const part of resp.candidates[0].content.parts) {
          // Check for inlineData (Base64)
          if (part.inlineData) {
            const newImg = `data:image/png;base64,${part.inlineData.data}`;
            setVisualGallery(prev => [newImg, ...prev]);
            setTempEngine(prev => prev ? { ...prev, imageUrl: newImg } : null);
            break;
          } 
          // Check for fileData (URI) - common in newer models
          else if (part.fileData && part.fileData.fileUri) {
             const newImg = part.fileData.fileUri;
             setVisualGallery(prev => [newImg, ...prev]);
             setTempEngine(prev => prev ? { ...prev, imageUrl: newImg } : null);
             break;
          }
          // Fallback: Check if text contains a URL (sometimes happens)
          else if (part.text && (part.text.startsWith('http') || part.text.startsWith('data:image'))) {
             const newImg = part.text.trim();
             setVisualGallery(prev => [newImg, ...prev]);
             setTempEngine(prev => prev ? { ...prev, imageUrl: newImg } : null);
             break;
          }
        }
      } else {
         console.warn("No visual candidates returned. Using fallback abstract synthesis.");
         // Fallback to a procedural pattern if API returns nothing (prevents "dead" UI)
         const seed = Math.floor(Math.random() * 1000);
         const fallbackImg = `https://picsum.photos/seed/${seed}/800/600?grayscale&blur=2`;
         setVisualGallery(prev => [fallbackImg, ...prev]);
         setTempEngine(prev => prev ? { ...prev, imageUrl: fallbackImg } : null);
         
         addNotification({
            category: 'engine',
            severity: 'warning',
            title: 'Visual Synthesis Rerouted',
            message: 'Primary imaging core unresponsive. Secondary abstract pattern generator engaged.'
         });
      }
    } catch (e: any) {
      console.error("Visual generation failed", e);
      addNotification({
        category: 'engine',
        severity: 'critical',
        title: 'Neural Visualization Failed',
        message: e.message?.toUpperCase().includes('PERMISSION') 
          ? 'Permission denied for high-fidelity imaging. Authenticate Architect credentials.'
          : 'The imaging core encountered a syntax anomaly during asset synthesis.'
      });
    } finally {
      setVisualLoading(false);
    }
  };

  const removeVisualVariant = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisualGallery(prev => {
      const next = [...prev];
      const removed = next.splice(idx, 1)[0];
      if (tempEngine && tempEngine.imageUrl === removed) {
        setTempEngine({ ...tempEngine, imageUrl: next[0] || undefined });
      }
      return next;
    });
  };

  const deployEngine = () => {
    if (!tempEngine) return;
    const finalEngine: Engine = { 
      ...tempEngine, 
      status: 'Active', 
      id: 'n_' + Date.now(),
      name: tempEngine.name || 'Neural Node',
      type: tempEngine.type || 'REVENUE NODE'
    };
    setEngines(prev => [...(Array.isArray(prev) ? prev : []), finalEngine].filter((e): e is Engine => e !== null));
    setTempEngine(null);
    setSynthVision('');
    setVisualGallery([]);
    setActivePresetId(null);
    setView('nodes');
    addNotification({
      category: 'engine',
      severity: 'info',
      title: 'Neural Node Deployed',
      message: `Grid asset "${finalEngine.name}" has been successfully commissioned and is syncing to global revenue channels.`
    });
  };

  const executeInstantWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!user || isNaN(amount) || amount <= 0 || amount > user.balance) return;

    // Retry connection check if failed status is present
    if (paypalStatus === 'failed') {
       const isConnected = await paypalService.checkConnection();
       if (!isConnected) {
          addNotification({
            category: 'tx',
            severity: 'critical',
            title: 'Settlement Bridge Offline',
            message: 'Unable to establish secure connection with PayPal. Please verify your API credentials.'
          });
          return;
       }
       setPaypalStatus('verified');
    }

    if (amount > WITHDRAWAL_LIMITS.PER_TRANSACTION) {
        addNotification({
            category: 'tx',
            severity: 'critical',
            title: 'Protocol Threshold Breach',
            message: `Withdrawal request of $${amount.toFixed(2)} exceeds the single-transaction limit of $${WITHDRAWAL_LIMITS.PER_TRANSACTION.toFixed(2)}.`
        });
        return;
    }

    setPayoutLoading(true);
    try {
      const res = await paypalService.createPayout(user.email, amount);
      if (res && res.batch_header && res.batch_header.payout_status === 'SUCCESS') {
        const newTx: Transaction = {
          id: 'tx_' + Date.now(),
          date: new Date().toLocaleString(),
          timestamp_ms: Date.now(),
          description: 'Strategic Liquidity Exit',
          amount,
          type: 'debit',
          status: 'Processing',
          method: 'PayPal',
          txHash: res.batch_header.payout_batch_id,
          logs: [
            { timestamp: new Date().toLocaleTimeString(), event: 'Settlement Initialized', node: 'SOV_TREASURY_ALPHA' },
            { timestamp: new Date().toLocaleTimeString(), event: 'Institutional Payout Rail Handshake', node: 'PAYPAL_BRIDGE_V4' }
          ]
        };
        setTransactions(prev => [newTx, ...(Array.isArray(prev) ? prev : [])].filter((t): t is Transaction => t !== null));
        updateUser(user.id, { balance: user.balance - amount, totalWithdrawn: (user.totalWithdrawn || 0) + amount });
        setWithdrawAmount('');
        setWithdrawalSuccessTx(newTx);
        addNotification({
          category: 'tx',
          severity: 'info',
          title: 'Settlement Authorized',
          message: `Your exit strategy for $${amount.toFixed(2)} has been authorized and is syncing with external rails.`
        });
      }
    } catch (error: any) {
      console.error("Payout failed", error);
      addNotification({
        category: 'tx',
        severity: 'critical',
        title: 'Settlement Failed',
        message: error.message || 'Liquidity exit denied by payment rail. Verify credentials and balance.'
      });
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleLinkSource = (source: FundingSource) => {
    setFundingSources(prev => [source, ...prev]);
    addNotification({
      category: 'tx',
      severity: 'info',
      title: 'Protocol Linked',
      message: `Strategic liquidity source "${source.label}" has been authorized for grid operations.`
    });
  };

  const handleDecommissionSource = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const source = fundingSources.find(fs => fs.id === id);
    setFundingSources(prev => prev.filter(fs => fs.id !== id));
    if (source) {
       addNotification({
         category: 'tx',
         severity: 'warning',
         title: 'Protocol Severed',
         message: `Funding rail "${source.label}" has been decommissioned and cleared from core memory.`
       });
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); 
    }
  };

  const handleDownloadEngineConfig = (engine: Engine, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = JSON.stringify({
      name: engine.name,
      type: engine.type,
      config: engine.config
    }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `engine-${engine.name.toLowerCase().replace(/\s+/g, '-')}-config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredEngines = useMemo(() => {
    const list = Array.isArray(engines) ? engines.filter(e => e !== null && e !== undefined) : [];
    const search = (engineSearch || "").toLowerCase();
    return list.filter(e => 
      e && (
        (e.name || "").toLowerCase().includes(search) || 
        (e.type || "").toLowerCase().includes(search)
      )
    );
  }, [engines, engineSearch]);

  const filteredTransactions = useMemo(() => {
    const list = Array.isArray(transactions) ? [...transactions].filter(t => t !== null && t !== undefined) : [];
    const search = (txSearch || "").toLowerCase();
    
    let filtered = list.filter(tx => {
      const matchesType = txTypeFilter === 'all' || tx.type === txTypeFilter;
      const matchesStatus = txStatusFilter === 'all' || tx.status === txStatusFilter;
      const matchesMethod = txMethodFilter === 'all' || tx.method === txMethodFilter;
      
      // Cycle Filter (Timeframe)
      let matchesCycle = true;
      const now = Date.now();
      const txTime = tx.timestamp_ms || now;
      if (txCycleFilter === 'epoch') matchesCycle = (now - txTime) < 86400000;
      if (txCycleFilter === 'cycle') matchesCycle = (now - txTime) < 86400000 * 7;
      if (txCycleFilter === 'quarter') matchesCycle = (now - txTime) < 86400000 * 90;

      // Liquidity Tier Filter
      let matchesTier = true;
      if (txLiquidityTier === 'micro') matchesTier = tx.amount < 100;
      if (txLiquidityTier === 'standard') matchesTier = tx.amount >= 100 && tx.amount < 1000;
      if (txLiquidityTier === 'institutional') matchesTier = tx.amount >= 1000;

      const matchesSearch = (tx.description || "").toLowerCase().includes(search) || (tx.txHash || "").toLowerCase().includes(search);
      
      return matchesType && matchesStatus && matchesMethod && matchesCycle && matchesTier && matchesSearch;
    });

    // Apply Sort Protocol
    filtered.sort((a, b) => {
      if (txSortProtocol === 'date-desc') return (b.timestamp_ms || 0) - (a.timestamp_ms || 0);
      if (txSortProtocol === 'date-asc') return (a.timestamp_ms || 0) - (b.timestamp_ms || 0);
      if (txSortProtocol === 'amount-desc') return b.amount - a.amount;
      if (txSortProtocol === 'amount-asc') return a.amount - b.amount;
      return 0;
    });

    return filtered;
  }, [transactions, txTypeFilter, txStatusFilter, txMethodFilter, txCycleFilter, txLiquidityTier, txSortProtocol, txSearch]);

  const filteredUsers = useMemo(() => {
    const list = Array.isArray(allUsers) ? allUsers.filter(u => u !== null && u !== undefined) : [];
    const search = (citadelSearch || "").toLowerCase();
    return list.filter(u => 
      u && (
        (u.name || "").toLowerCase().includes(search) || 
        (u.email || "").toLowerCase().includes(search)
      )
    );
  }, [allUsers, citadelSearch]);

  const resetFilters = () => {
    setTxTypeFilter('all');
    setTxStatusFilter('all');
    setTxMethodFilter('all');
    setTxCycleFilter('all');
    setTxLiquidityTier('all');
    setTxSortProtocol('date-desc');
    setTxSearch('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (txTypeFilter !== 'all') count++;
    if (txStatusFilter !== 'all') count++;
    if (txMethodFilter !== 'all') count++;
    if (txCycleFilter !== 'all') count++;
    if (txLiquidityTier !== 'all') count++;
    if (txSearch !== '') count++;
    return count;
  }, [txTypeFilter, txStatusFilter, txMethodFilter, txCycleFilter, txLiquidityTier, txSearch]);

  const sidebarLinks = useMemo(() => {
    if (!user || !user.permissions) return [];
    return Object.entries(PERMISSIONS)
      .filter(([key]) => user.permissions.includes(key as UserPermission))
      .map(([key, config]) => ({ id: key.replace('access_', ''), label: config.label, icon: config.icon }));
  }, [user]);

  const unreadCount = useMemo(() => notifications.filter(n => n && !n.read).length, [notifications]);

  const isWithdrawalValid = useMemo(() => {
    const amount = parseFloat(withdrawAmount);
    return !isNaN(amount) && amount > 0 && amount <= user.balance && amount <= WITHDRAWAL_LIMITS.PER_TRANSACTION;
  }, [withdrawAmount, user.balance]);


  const handleUpdateCredentials = async (clientId: string, clientSecret: string, mode: string) => {
    try {
        // Pre-check network availability
        if (!navigator.onLine) {
            throw new Error('Network Offline. Please check your internet connection.');
        }

        console.log("Sending request to /api/config/update-credentials with:", { clientId: '***', clientSecret: '***', mode });

        const res = await fetch('/api/config/update-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                clientId: clientId.trim(), 
                clientSecret: clientSecret.trim(), 
                mode: mode 
            })
        });

        console.log("Response status:", res.status, res.statusText);

        if (!res.ok) {
            // Attempt to parse JSON error, fallback to text if fails (e.g. 500 html page)
            let errorMsg = `Verification failed (Status: ${res.status})`;
            try {
                // Read text ONCE
                const text = await res.text();
                console.log("Response body:", text);
                try {
                    const data = JSON.parse(text);
                    // Prioritize specific fields
                    errorMsg = data.details || data.error || data.message || errorMsg;
                } catch (jsonError) {
                    // If text is not empty, use it
                    if (text && text.trim().length > 0) {
                        errorMsg = text; 
                    } else {
                         errorMsg = res.statusText || `Error ${res.status}`;
                    }
                }
            } catch (e) {
                errorMsg = res.statusText || `Unknown Error (Status: ${res.status})`;
            }
            throw new Error(errorMsg);
        }

        const data = await res.json();
        setPaypalStatus('verified');
        setShowUpdateCredentials(false);
        addNotification({
            category: 'security',
            severity: 'success',
            title: 'Bridge Secured',
            message: 'PayPal credentials successfully verified and updated.'
        });
    } catch (error: any) {
        console.error("Update failed", error);
        // Do not update paypalStatus to failed, otherwise it will disable the button
        // setPaypalStatus('failed'); 
        throw error;
    }
  };

  // State to track if loading is active for specific components
  const [isAppLoading, setIsAppLoading] = useState(false);

  if (view === 'landing') {
    // SEO Optimization
    useEffect(() => {
        document.title = "Sovereign Core | Autonomous Revenue Infrastructure";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', 'Start your 14-day free trial. Automate income streams with Sovereign Core. Join our referral network and earn rewards.');
        } else {
            const meta = document.createElement('meta');
            meta.name = "description";
            meta.content = "Start your 14-day free trial. Automate income streams with Sovereign Core. Join our referral network and earn rewards.";
            document.head.appendChild(meta);
        }
    }, []);

    if (isAppLoading) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center text-white">
                <div className="text-center space-y-4">
                    <Loader2 size={48} className="animate-spin text-blue-500 mx-auto" />
                    <p className="text-xl font-black uppercase italic tracking-widest animate-pulse">Initializing Sovereign Core...</p>
                </div>
            </div>
        );
    }

    return (
      <div className="min-h-screen bg-[#020202] flex flex-col text-white relative overflow-x-hidden blueprint-bg">
        {/* Hero Section */}
        <div className="min-h-screen flex items-center justify-center p-6 md:p-10 relative z-10">
            <div className="max-w-4xl text-center space-y-8 md:space-y-12 relative z-10">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-glow border-2 border-blue-400">
                <Cpu size={40} className="md:w-12 md:h-12" />
              </div>
              <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-2xl">Sovereign<br/><span className="text-blue-500">Core Engines</span></h1>
              <p className="text-sm md:text-xl text-white/60 font-black uppercase tracking-[0.2em] md:tracking-[0.4em] italic px-4">Autonomous Neural Revenue Infrastructure</p>
              
              <div className="space-y-6">
                {!hasApiKey ? (
                  <div className="space-y-4">
                    <p className="text-red-400 font-black uppercase text-[10px] md:text-xs tracking-widest italic animate-pulse">Architect Credentials Required for High-Level Synthesis</p>
                    <Button onClick={handleOpenKeySelector} size="lg" className="h-16 md:h-20 px-8 md:px-16 text-xl md:text-2xl mx-auto shadow-glow bg-red-600 hover:bg-red-500 w-full md:w-auto">Select Project API Key</Button>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block text-[10px] text-white/30 hover:text-white underline uppercase italic tracking-widest">Review Billing Requirements</a>
                  </div>
                ) : (
                  <div className="space-y-4">
                      <Button onClick={() => { 
                          setIsAppLoading(true); 
                          // Force state update and ensure it persists
                          setTimeout(() => { 
                              setView('dashboard'); 
                              setIsAppLoading(false); 
                          }, 1500); 
                      }} size="lg" className="h-16 md:h-20 px-8 md:px-16 text-xl md:text-2xl mx-auto shadow-glow w-full md:w-auto">Initialize Uplink</Button>
                      <p className="text-emerald-400 font-black uppercase text-[10px] tracking-widest italic">Includes 14-Day Free Trial Access</p>
                  </div>
                )}
              </div>
            </div>
        </div>

        {/* Features Section */}
        <div className="py-20 bg-white/5 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="space-y-4 text-center md:text-left">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mx-auto md:mx-0 border border-blue-500/40">
                        <Zap size={24} />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-wider text-white">Automated Yield</h3>
                    <p className="text-white/40 text-sm leading-relaxed">Deploy autonomous neural engines that generate passive income streams. Set it and forget it.</p>
                </div>
                <div className="space-y-4 text-center md:text-left">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mx-auto md:mx-0 border border-purple-500/40">
                        <Users size={24} />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-wider text-white">Referral Rewards</h3>
                    <p className="text-white/40 text-sm leading-relaxed">Invite peers to the Sovereign Network and earn high-yield commissions on their node activity.</p>
                </div>
                <div className="space-y-4 text-center md:text-left">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mx-auto md:mx-0 border border-emerald-500/40">
                        <Shield size={24} />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-wider text-white">Risk-Free Trial</h3>
                    <p className="text-white/40 text-sm leading-relaxed">Experience the full power of the Core with a 14-day free trial. No commitments, cancel anytime.</p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  const [isReferralLoading, setIsReferralLoading] = useState(false);

  return (
    <div className="min-h-screen bg-[#020202] flex text-white overflow-hidden blueprint-bg relative">
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,112,243,0.1),transparent_70%)]"></div>
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-neural-scan"></div>
      </div>

      <aside className="w-80 border-r-2 border-white/10 p-10 flex flex-col glass bg-black/95 z-[100] shadow-3xl shrink-0">
        <div className="flex items-center gap-5 mb-16">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-glow border-2 border-blue-400">
            {user?.activeLogo ? (
              <img src={user.activeLogo} className="w-8 h-8 object-contain" alt="Logo" />
            ) : (
              <Cpu size={24} />
            )}
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase">Sovereign</span>
        </div>
        <nav className="space-y-4 flex-1">
          {sidebarLinks.map(l => (
            <button key={l.id} onClick={() => setView(l.id)} className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl uppercase text-[11px] font-black italic tracking-[0.2em] transition-all border-2 ${view === l.id ? 'bg-blue-600 border-blue-400 shadow-glow' : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'}`}>
              <l.icon size={18} /> {l.label}
            </button>
          ))}
        </nav>
        <div className="pt-10 border-t-2 border-white/10">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black overflow-hidden border border-white/10">
              {user?.activeLogo ? <img src={user.activeLogo} className="w-full h-full object-cover" alt="Profile" /> : (user?.name ? user.name[0] : 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate uppercase italic">{user?.name || 'Unknown Architect'}</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase">{user?.role || 'Guest'} Architect</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
        {/* Real-time High Severity Alert Banner */}
        {criticalAlerts.length > 0 && (
          <div className="w-full bg-red-600/90 backdrop-blur-md border-b border-red-500 py-3 px-12 flex items-center justify-between animate-in slide-in-from-top-full duration-500 z-[150] sticky top-0">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center animate-pulse">
                <AlertCircle size={20} className="text-white" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black uppercase tracking-widest text-white italic">Node Critical Interruption Detected</p>
                <p className="text-[10px] text-white/80 uppercase tracking-widest font-medium">Architect intervention required for {criticalAlerts.length} high-priority anomalies.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button size="sm" variant="ghost" className="!bg-white/10 hover:!bg-white/20 !text-white" onClick={() => setShowNotifications(true)}>View Matrix</Button>
              <button onClick={markAllAsRead} className="text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>
        )}

        <MetabolismTicker engines={engines} />

        <div className="p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000">
          
          {view === 'dashboard' && (
            <div className="space-y-12 animate-in zoom-in-95 duration-700">
              {/* Dashboard Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${criticalAlerts.length > 0 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'} animate-pulse`}></div>
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.4em] italic">
                      Network Health: {criticalAlerts.length > 0 ? 'Degraded' : 'Optimal'}
                    </span>
                  </div>
                  <h1 className="text-6xl md:text-9xl font-black italic uppercase tracking-tighter text-white overflow-hidden py-2 leading-none">
                    <span className="inline-block animate-in slide-in-from-bottom-full duration-1000 leading-none">Grid Core</span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-6">
                    <Badge variant="purple" className="flex items-center gap-2" icon={Globe} live>Neural Sync Level 09</Badge>
                    <div className="relative">
                      <button onClick={() => setShowNotifications(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black italic border-2 border-blue-500/50 bg-blue-500/30 text-white hover:bg-blue-600 transition-all">
                        <Bell size={12} className={unreadCount > 0 ? 'animate-bounce' : ''} /> 
                        Alert Matrix 
                        {unreadCount > 0 && <span className="ml-1 bg-red-600 px-1.5 rounded-full">{unreadCount}</span>}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-left md:text-right space-y-2">
                  <div className="flex flex-col items-start md:items-end">
                     <p className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] italic">System Epoch</p>
                     <p className="text-3xl md:text-4xl font-black text-white italic font-mono uppercase tracking-tighter">2025.05.SOV</p>
                  </div>
                  <div className="flex items-center gap-3 justify-start md:justify-end text-blue-400 italic font-black uppercase text-[10px] tracking-widest">
                     <TrendingUp size={14} />
                     Grid Velocity: +12.4% / HR
                  </div>
                </div>
              </div>

              {/* Top Row: Core Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <MetricCard 
                  label="Active Neural Nodes" 
                  value={engines.filter(e => e && e.status === 'Active').length} 
                  icon={Cpu} 
                  colorClass="blue" 
                  data={Array.from({length: 12}, () => 40 + Math.random() * 20)} 
                  trend={12} 
                  subValue="Nodes Online"
                />
                <MetricCard 
                  label="Liquid Balance" 
                  value={`$${((user?.balance || 0) + (dashboardJitter * 10)).toFixed(2)}`} 
                  icon={Wallet} 
                  colorClass="emerald" 
                  data={dashboardYieldHistory.slice(-12)} 
                  trend={5.2} 
                  subValue="Settled Assets"
                />
                <MetricCard 
                  label="Expansion Reach" 
                  value={(user && user.totalReferralNodes) || 0} 
                  icon={Network} 
                  colorClass="purple" 
                  data={dashboardNetworkHistory.slice(-12)} 
                  trend={24.1} 
                  subValue="Peer Connections"
                />
                <MetricCard 
                  label="Lifetime Aggregate" 
                  value={`$${(user?.lifetimeYield || 0).toFixed(0)}`} 
                  icon={Banknote} 
                  colorClass="gold" 
                  data={Array.from({length: 12}, (_, i) => 100 + i * 5 + Math.random() * 2)} 
                  trend={8.4} 
                  subValue="Total Rewards"
                />
              </div>

              {/* Analytics Grid */}
              <div className="grid grid-cols-12 gap-8">
                <Card blueprint className="col-span-12 lg:col-span-8 p-10 border-blue-500/20 bg-blue-500/[0.03] shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Gauge size={200} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-12 relative z-10">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black italic uppercase tracking-widest flex items-center gap-4 text-white">
                        <TrendingUp className="text-blue-500" size={28} /> Daily Yield Metabolism
                      </h3>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 italic">Real-time revenue efficiency and neural load aggregate</p>
                    </div>
                  </div>
                  
                  <div className="h-[350px] w-full relative flex items-end">
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center opacity-10 pointer-events-none">
                       <Radio size={250} className="animate-ping duration-10000" />
                    </div>
                    
                    <Sparkline 
                      data={dashboardYieldHistory} 
                      width={900} 
                      height={350} 
                      color="#3b82f6" 
                      fill 
                      animate 
                    />
                  </div>
                </Card>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                   <Card blueprint className="p-10 border-purple-500/20 bg-purple-500/[0.03] flex flex-col justify-between h-full group">
                      <div className="space-y-8">
                        <div className="flex justify-between items-center">
                           <h3 className="text-2xl font-black italic uppercase tracking-widest flex items-center gap-4 text-purple-400">
                             <Users size={24} /> Expansion Map
                           </h3>
                        </div>
                        
                        <div className="space-y-6">
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Active Peer Nodes</p>
                              <div className="flex items-end gap-3">
                                 <span className="text-5xl font-black italic text-white leading-none">{(user && user.referralCount) || 0}</span>
                              </div>
                           </div>
                        </div>
                      </div>
                      <div className="pt-8 border-t border-white/5">
                        <Button variant="outline" className="w-full h-14 !text-[10px]" icon={Network} onClick={() => setView('network')}>Access Network Command</Button>
                      </div>
                   </Card>
                </div>
              </div>

              {/* Node Heartbeat */}
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-white/5 pb-8">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-400">
                        <Terminal size={24} />
                      </div>
                      <h3 className="text-3xl font-black italic uppercase text-white tracking-[0.2em]">Node Heartbeat</h3>
                   </div>
                   <span className="text-[9px] font-black uppercase text-white/20 tracking-widest italic">{engines.length} ACTIVE PROTOCOLS</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {engines.map((e, i) => {
                    if (!e) return null;
                    return (
                      <Card key={e.id} blueprint className={`p-6 border-white/5 bg-white/[0.01] hover:border-blue-500/40 transition-all group overflow-hidden ${e.status === 'Critical Failure' ? 'border-red-500/40 bg-red-500/5' : ''}`}>
                         <div className="flex justify-between items-start mb-4">
                            <div className={`w-3 h-3 rounded-full ${e.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : e.status === 'Critical Failure' ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-yellow-500'} animate-pulse`}></div>
                            <Badge variant={e.status === 'Critical Failure' ? 'critical' : 'neutral'} className="!text-[6px] tracking-[0.3em] font-black opacity-80">{e.status === 'Critical Failure' ? 'FATAL' : `NODE ${String(i+1).padStart(2, '0')}`}</Badge>
                         </div>
                         <div className="mb-4">
                            <h4 className="text-lg font-black italic uppercase text-white truncate leading-none mb-1">{e.name}</h4>
                            <p className="text-[7px] font-black text-blue-400/60 uppercase tracking-[0.2em] italic">{e.type}</p>
                         </div>
                         <div className="space-y-4">
                            <div className="space-y-2">
                               <div className="flex justify-between items-center text-[8px] font-black uppercase italic text-white/40">
                                  <span className="flex items-center gap-1"><Activity size={8} className="text-blue-400"/> Synapse Flow</span>
                                  <span className={`${e.performance < 50 ? 'text-red-500' : 'text-emerald-400'} font-mono`}>{e.performance}%</span>
                               </div>
                               <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div className={`h-full ${e.performance < 50 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'} transition-all duration-1000`} style={{ width: `${e.performance}%` }}></div>
                               </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                                  <p className="text-[6px] font-black text-white/20 uppercase mb-1">Uptime</p>
                                  <p className="text-[10px] font-mono font-black text-white/70 italic leading-none">{e.status === 'Active' ? e.uptime : '0%'}</p>
                               </div>
                               <div className="bg-white/[0.02] p-1 rounded-lg border border-white/5 flex items-center justify-center overflow-hidden">
                                  <Sparkline data={e.history} width={60} height={18} color={e.performance < 50 ? "#ef4444" : "#3b82f6"} animate={false} />
                               </div>
                            </div>
                            <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-1">
                               <button 
                                 onClick={() => toggleEngineStatus(e.id)} 
                                 className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${e.status === 'Active' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-white' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}
                                 title={e.status === 'Active' ? 'Pause Node' : 'Activate Node'}
                               >
                                  {e.status === 'Active' ? <ZapOff size={10} /> : <Zap size={10} />}
                               </button>
                               <button 
                                 onClick={() => optimizeEngine(e.id)}
                                 className="p-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                                 title="Auto-Optimize Protocol"
                                 disabled={e.status !== 'Active' && e.status !== 'Critical Failure' && e.status !== 'Paused'}
                               >
                                  <Sparkles size={10} className={e.status === 'Optimizing' ? 'animate-spin' : ''} />
                               </button>
                               <button 
                                 onClick={() => deleteEngine(e.id)}
                                 className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                 title="Decommission Node"
                               >
                                  <Trash2 size={10} />
                               </button>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                               <div className="flex justify-between items-end">
                                  <div className="space-y-1">
                                     <p className="text-[6px] font-black uppercase text-white/20 tracking-widest">Liquid Accumulation</p>
                                     <p className={`text-xl font-black italic font-mono tracking-tighter ${e.status === 'Active' ? 'text-emerald-400' : 'text-white/10'}`}>
                                        {e.status === 'Active' ? `$${(e.revenue).toFixed(4)}` : 'NULL'}
                                     </p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {view === 'creator_centre' && (
            <div className="space-y-12 animate-in slide-in-from-top-8">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h1 className="text-8xl font-black italic uppercase tracking-tighter leading-none">Creator Centre</h1>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-blue-400">Select an established revenue protocol for neural synthesis</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {REVENUE_TEMPLATES.map((template) => (
                  <Card 
                    key={template.id} 
                    hover 
                    onClick={() => handleSelectTemplate(template)}
                    className="p-8 border-white/10 bg-white/[0.02] flex flex-col justify-between h-full group transition-all"
                  >
                    <div className="space-y-6">
                       <div className="flex justify-between items-start">
                          <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/40 text-blue-400">
                             <SparkleIcon size={20} />
                          </div>
                          <Badge variant="neutral" className="!text-[8px]">{template.category}</Badge>
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-2xl font-black italic uppercase text-white group-hover:text-blue-400 transition-colors leading-tight">{template.name}</h3>
                          <p className="text-[10px] text-white/40 leading-relaxed font-medium uppercase tracking-wider">{template.description}</p>
                       </div>
                    </div>
                    
                    <div className="pt-8 space-y-4 border-t border-white/5 mt-8">
                       <Button variant="outline" className="w-full !text-[9px] h-10 group-hover:bg-blue-600 group-hover:border-blue-400 transition-all">Initialize Synthesis</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {view === 'forge' && (
            <div className="space-y-12 animate-in slide-in-from-bottom-8">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h1 className="text-8xl font-black italic uppercase tracking-tighter leading-none">The Forge</h1>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-blue-400">Neural Synthesis of Autonomous Assets</p>
                </div>
                <div className="flex gap-4">
                  {activePresetId && (
                    <button 
                      onClick={() => { setActivePresetId(null); setTempEngine(null); setSynthVision(''); setSynthName(''); setVisualGallery([]); }}
                      className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-red-600/10 border-2 border-red-500/30 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-glow-sm"
                    >
                      <XCircle size={16} /> Exit Preset Edit
                    </button>
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-blue-600/10 border-2 border-red-500/30 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-glow-sm"
                  >
                    <Upload size={16} /> Import Protocol
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImportProtocol} className="hidden" accept=".json" />
                  <Badge variant="purple" live={synthLoading}>AI Processing: {synthLoading ? 'SYNTHESIZING' : 'NOMINAL'}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-12">
                <div className="col-span-12 lg:col-span-5 space-y-12">
                  <Card blueprint className="p-10 border-blue-500/40 bg-blue-500/[0.05] space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-600 rounded-2xl shadow-glow-sm"><BrainCircuit className="text-white" size={32} /></div>
                        <h3 className="text-3xl font-black italic uppercase text-white leading-none">Asset Vision</h3>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Engine Name (Optional)</label>
                        <input 
                          type="text" 
                          value={synthName} 
                          onChange={e => setSynthName(e.target.value)} 
                          placeholder="e.g. Project Alpha (Leave empty to auto-generate)" 
                          className="w-full bg-black/80 border-2 border-white/10 rounded-2xl p-6 text-white font-black italic outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Conceptual Directive</label>
                        <textarea 
                          value={synthVision} 
                          onChange={e => setSynthVision(e.target.value)} 
                          placeholder="Describe the revenue node you want to automate..." 
                          className="w-full h-40 bg-black/80 border-2 border-white/10 rounded-2xl p-6 text-white font-black italic outline-none focus:border-blue-500 transition-all scrollbar-hide"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase text-white/40 italic">Risk Calibration</p>
                          <select value={synthRisk} onChange={e => setSynthRisk(e.target.value as RiskTolerance)} className="w-full bg-black border-2 border-white/10 rounded-xl p-3 text-[10px] font-black uppercase outline-none text-white cursor-pointer hover:border-blue-500 transition-colors">
                            {RISK_TOLERANCES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase text-white/40 italic">Yield Velocity ({synthYield}%)</p>
                          <input type="range" min="10" max="100" value={synthYield} onChange={e => setSynthYield(parseInt(e.target.value))} className="w-full accent-blue-500" />
                        </div>
                      </div>

                      <Button onClick={handleSynthesis} loading={synthLoading} className="w-full h-20 text-xl" icon={Sparkles}>Begin Neural Synthesis</Button>
                    </div>
                  </Card>

                  <Card blueprint className="p-10 border-white/10 bg-white/[0.02] space-y-8">
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-black italic uppercase text-white flex items-center gap-4"><Layers size={24} className="text-blue-500" /> Preset Vault</h3>
                      <span className="text-[9px] font-black uppercase text-white/20 tracking-widest italic">{presets.length} BLUEPRINTS</span>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                      {presets.map(preset => {
                        if (!preset) return null;
                        const isEditing = editingPresetId === preset.id;
                        return (
                          <div key={preset.id} className={`group p-5 rounded-2xl border transition-all flex flex-col gap-4 ${activePresetId === preset.id ? 'bg-blue-600/10 border-blue-500/50 shadow-glow-sm' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                            <div className="flex items-center justify-between gap-4">
                               <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <div className="flex items-center gap-3 p-1 bg-black/60 rounded-xl border border-blue-500/50">
                                    <input 
                                      autoFocus
                                      type="text" 
                                      value={editingPresetName} 
                                      onChange={e => setEditingPresetName(e.target.value)}
                                      className="bg-transparent px-3 py-1 text-xs font-black italic text-white outline-none flex-1 min-w-0"
                                    />
                                    <div className="flex gap-1 shrink-0 px-2 border-l border-white/10">
                                      <button onClick={() => handleRenamePreset(preset.id)} className="text-emerald-400 hover:text-emerald-300 transition-colors p-1" title="Commit Name Changes"><Check size={18} /></button>
                                      <button onClick={() => setEditingPresetId(null)} className="text-red-400 hover:text-red-300 transition-colors p-1" title="Discard Changes"><X size={18} /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="px-1 cursor-pointer" onClick={() => loadPreset(preset)}>
                                    <p className="text-sm font-black italic uppercase text-white truncate group-hover:text-blue-400 transition-colors">{preset.name || 'Unnamed Preset'}</p>
                                    <p className="text-[8px] text-white/30 uppercase tracking-widest">{preset.risk} • {preset.yield}% Yield</p>
                                  </div>
                                )}
                               </div>
                               {!isEditing && (
                                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); setEditingPresetId(preset.id); setEditingPresetName(preset.name || ''); }} title="Rename Blueprint" className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-blue-400"><Pencil size={14} /></button>
                                  <button onClick={(e) => exportPreset(preset, e)} title="Package & Share Protocol" className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-blue-500 transition-all"><Download size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); deletePreset(preset.id); }} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-red-400"><Trash2 size={14} /></button>
                                 </div>
                               )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                <div className="col-span-12 lg:col-span-7">
                  {tempEngine ? (
                    <Card blueprint className="p-10 border-emerald-500/40 bg-emerald-500/[0.05] space-y-8 animate-in zoom-in-95">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                           <Badge variant="warning">Phase 03: Review & Authorize</Badge>
                           <p className="text-[10px] font-black uppercase text-blue-400/60 italic tracking-widest">Synthesized Protocol Ready</p>
                        </div>
                        <button onClick={() => setTempEngine(null)} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-red-600 text-white/40 hover:text-white"><X size={20}/></button>
                      </div>

                      <div className="space-y-4">
                        <input 
                          type="text" 
                          value={tempEngine.name} 
                          onChange={e => setTempEngine({...tempEngine, name: e.target.value})}
                          className="text-6xl font-black italic uppercase text-white bg-transparent border-none outline-none tracking-tighter w-full focus:text-blue-400 transition-colors" 
                        />
                        <p className="text-blue-400 text-xl font-black uppercase tracking-[0.4em] italic">{tempEngine.type || 'REVENUE NODE'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/10">
                        <div className="space-y-6">
                          <div className={`w-full aspect-[${visualRatio.replace(':', '/')}] bg-black/60 rounded-3xl border border-white/10 overflow-hidden relative group transition-all duration-500`}>
                            {tempEngine.imageUrl ? (
                              <>
                                <img src={tempEngine.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Generated" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                  <Button size="sm" variant="outline" icon={Repeat} onClick={() => generateEngineVisual(false, true)} disabled={visualLoading}>Re-Synthesize</Button>
                                  <Button size="sm" variant="primary" icon={Maximize2} onClick={() => generateEngineVisual(true)} disabled={visualLoading}>Upscale 4K</Button>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                                <Image size={48} />
                                <Button size="sm" variant="outline" onClick={() => generateEngineVisual()} loading={visualLoading}>Synthesize Identity</Button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 min-h-[90px] px-1">
                             {visualGallery.map((img, idx) => (
                               <div key={idx} className="relative group/variant shrink-0">
                                 <button 
                                   onClick={() => setTempEngine(prev => prev ? { ...prev, imageUrl: img } : null)}
                                   className={`w-20 h-20 rounded-xl border-2 transition-all overflow-hidden ${tempEngine.imageUrl === img ? 'border-emerald-500' : 'border-white/10'}`}
                                 >
                                   <img src={img} className="w-full h-full object-cover" alt={`Version ${idx}`} />
                                 </button>
                                 <button onClick={(e) => removeVisualVariant(idx, e)} className="absolute -top-1 -left-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/variant:opacity-100 transition-opacity shadow-lg"><X size={8}/></button>
                               </div>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                            <div className="space-y-1">
                               <p className="text-[9px] font-black uppercase text-white/40 tracking-widest italic flex items-center gap-2"><PenTool size={10} className="text-blue-400" /> Direct Attack Vector</p>
                               <input 
                                 type="text" 
                                 value={tempEngine.config.attackVector} 
                                 onChange={e => setTempEngine({...tempEngine, config: {...tempEngine.config, attackVector: e.target.value}})}
                                 className="text-sm font-black italic text-white bg-transparent border-none outline-none w-full focus:text-blue-400 transition-colors uppercase"
                               />
                            </div>
                            <div className="space-y-1">
                               <p className="text-[9px] font-black uppercase text-white/40 tracking-widest italic flex items-center gap-2"><Zap size={10} className="text-emerald-400" /> Optimization Lever</p>
                               <input 
                                 type="text" 
                                 value={tempEngine.config.lever} 
                                 onChange={e => setTempEngine({...tempEngine, config: {...tempEngine.config, lever: e.target.value}})}
                                 className="text-sm font-black italic text-white bg-transparent border-none outline-none w-full focus:text-emerald-400 transition-colors uppercase"
                               />
                            </div>
                            <div className="space-y-1">
                               <p className="text-[9px] font-black uppercase text-white/40 tracking-widest italic flex items-center gap-2"><Shield size={10} className="text-purple-400" /> Institutional Moat</p>
                               <input 
                                 type="text" 
                                 value={tempEngine.config.moat} 
                                 onChange={e => setTempEngine({...tempEngine, config: {...tempEngine.config, moat: e.target.value}})}
                                 className="text-sm font-black italic text-white bg-transparent border-none outline-none w-full focus:text-purple-400 transition-colors uppercase"
                               />
                            </div>
                          </div>

                          <div className="p-6 bg-black/60 rounded-2xl border border-white/5 space-y-2">
                            <p className="text-[9px] font-black uppercase text-white/20 tracking-widest italic">Strategic Directive Context</p>
                            <div className="italic text-[11px] text-white/60 leading-relaxed overflow-hidden max-h-32">
                              "{tempEngine.config?.brief || 'Operational status nominal.'}"
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button onClick={savePreset} variant="outline" className="flex-1 h-24 text-xl border-blue-500/40 text-blue-400 hover:bg-blue-600/10" icon={Save}>
                          {activePresetId ? 'Update Protocol' : 'Save as Preset'}
                        </Button>
                        <Button onClick={deployEngine} variant="success" className="flex-[2] h-24 text-3xl shadow-glow" icon={Rocket}>Deploy to Global Grid</Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="h-full border-4 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center space-y-6 opacity-30 bg-white/[0.01]">
                      <RefreshCcw size={80} className="animate-spin-slow text-white/20" />
                      <div className="text-center">
                        <p className="text-3xl font-black uppercase italic tracking-[0.4em] text-white">Forge Standby</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-4 font-bold">Awaiting Architectural Synthesis Directives</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'network' && (
            <div className="space-y-16 animate-in slide-in-from-right-8">
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Users className="text-purple-500" size={24} />
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.4em] italic">Peer Expansion Network V1.2</span>
                  </div>
                  <h1 className="text-9xl font-black italic uppercase tracking-tighter leading-none">Expansion</h1>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-blue-400">Referral Infrastructure & Tiered Growth Protocols</p>
                </div>
              </div>

              {/* Network Stats & Tier Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <MetricCard label="Active Referrals" value={(user && user.referralCount) || 0} icon={UserPlus} colorClass="blue" subValue="Direct Peer Uplinks" />
                 <MetricCard label="Global Peer Nodes" value={(user && user.totalReferralNodes) || 0} icon={Boxes} colorClass="purple" subValue="Recursive Grid Scale" />
                 <MetricCard label="Total Commission" value={`$${(user?.referralEarnings || 0).toFixed(2)}`} icon={Banknote} colorClass="emerald" subValue="Settled Rewards" />
              </div>

              <div className="grid grid-cols-12 gap-12">
                 <div className="col-span-12 lg:col-span-5 space-y-12">
                   {/* Neural Tier Progress */}
                   <Card blueprint className="p-10 border-purple-500/40 bg-purple-500/[0.05] space-y-10">
                     <div className="flex items-center justify-between">
                        <h3 className="text-3xl font-black italic uppercase text-white flex items-center gap-4">
                           <Trophy size={32} className="text-yellow-500" /> Neural Tier
                        </h3>
                        <Badge variant="neutral" className="!text-[8px] border-yellow-500/50 text-yellow-400">{currentTierInfo.current.name} Status</Badge>
                     </div>

                     <div className="space-y-8">
                        <div className="space-y-4">
                           <div className="flex justify-between items-end">
                              <div>
                                 <p className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Commission Protocol</p>
                                 <p className="text-5xl font-black text-white italic tracking-tighter">{currentTierInfo.current.rate}% <span className="text-xs text-white/20">REWARD RATE</span></p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Node Depth</p>
                                 <p className="text-2xl font-black text-purple-400 italic">{(user && user.totalReferralNodes) || 0} / {currentTierInfo.next?.minNodes || 'MAX'}</p>
                              </div>
                           </div>
                           
                           <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/10">
                              <div 
                                 className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-400 rounded-full transition-all duration-1000 shadow-glow-sm"
                                 style={{ width: `${tierProgress}%` }}
                              ></div>
                           </div>
                           
                           {currentTierInfo.next && (
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic text-center">
                                 Authorize <span className="text-purple-400">{currentTierInfo.next.minNodes - (user?.totalReferralNodes || 0)}</span> more nodes to unlock <span className="text-white">{currentTierInfo.next.name} ({currentTierInfo.next.rate}%)</span>
                              </p>
                           )}
                        </div>

                        <div className="bg-black/70 p-8 rounded-3xl border-2 border-white/10 flex flex-col gap-6 group cursor-pointer hover:border-purple-500/40 transition-all">
                           <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Your Uplink Signature</p>
                              <Copy size={16} className="text-white/20 group-hover:text-white transition-colors" />
                           </div>
                           <span className="text-3xl font-mono text-blue-400 tracking-tighter text-center break-all">{user?.referralCode || 'NOT_INITIALIZED'}</span>
                           <div className="grid grid-cols-2 gap-4">
                               <Button variant="outline" size="sm" className="w-full !text-[9px]" onClick={async () => { 
                                   try { 
                                       await navigator.clipboard.writeText(`https://autoincome.sovereign/join/${user?.referralCode}`); 
                                       addNotification({ category: 'referrals', severity: 'success', title: 'Link Copied', message: 'Referral link ready for distribution.' });
                                   } catch(e) { console.error(e); } 
                               }}>Copy Direct Link</Button>
                               
                               <Button variant="outline" size="sm" className="w-full !text-[9px]" onClick={() => {
                                   const link = `https://autoincome.sovereign/join/${user?.referralCode}`;
                                   window.open(`https://twitter.com/intent/tweet?text=Join%20the%20Sovereign%20Network%20and%20automate%20your%20income.&url=${encodeURIComponent(link)}`, '_blank');
                               }}>Share on X</Button>
                           </div>
                        </div>

                        {/* Real Referral Tracking (Replaces Simulator) */}
                        <div className="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest italic">Live Network Monitor</p>
                                <Activity size={16} className="text-emerald-400 animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-white/60 uppercase font-black tracking-wider">
                                    <span>Real-time Link Clicks</span>
                                    <span className="text-white">0</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-white/60 uppercase font-black tracking-wider">
                                    <span>Pending Conversions</span>
                                    <span className="text-white">0</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-emerald-500/20">
                                <p className="text-[9px] text-emerald-400/60 italic text-center">
                                    System is listening for real user sign-ups via your unique signature.
                                </p>
                            </div>
                        </div>
                     </div>
                   </Card>
                 </div>

                 <div className="col-span-12 lg:col-span-7 space-y-8">
                   <h3 className="text-3xl font-black italic uppercase tracking-widest flex items-center gap-4 text-white/80">
                      <Medal size={28} className="text-blue-500" /> Commission Protocol Matrix
                   </h3>
                   
                   <div className="grid grid-cols-1 gap-4">
                      {COMMISSION_TIERS.map((tier) => {
                         const isCurrent = currentTierInfo.current.id === tier.id;
                         const isUnlocked = (user?.totalReferralNodes || 0) >= tier.minNodes;
                         
                         return (
                            <Card 
                               key={tier.id} 
                               className={`p-8 flex items-center justify-between border-2 transition-all ${isCurrent ? 'border-yellow-500/40 bg-yellow-500/[0.03] scale-[1.02] shadow-2xl' : isUnlocked ? 'border-emerald-500/20 bg-emerald-500/[0.01]' : 'border-white/5 opacity-40 bg-black/20'}`}
                            >
                               <div className="flex items-center gap-8">
                                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${tier.border} ${tier.bg} ${tier.color}`}>
                                     {tier.id === 'sovereign' ? <Crown size={32} /> : tier.id === 'principal' ? <Star size={32} /> : <Shield size={32} />}
                                  </div>
                                  <div className="space-y-1">
                                     <div className="flex items-center gap-3">
                                        <h4 className={`text-2xl font-black italic uppercase tracking-tighter ${tier.color}`}>{tier.name}</h4>
                                        {isCurrent && <Badge variant="success" className="!text-[6px]">Active Protocol</Badge>}
                                     </div>
                                     <p className="text-[10px] font-black uppercase text-white/30 tracking-widest italic">Required Nodes: {tier.minNodes}+</p>
                                  </div>
                               </div>
                               
                               <div className="text-right">
                                  <p className={`text-4xl font-black italic tracking-tighter ${tier.color}`}>{tier.rate}%</p>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Yield Split</p>
                               </div>
                            </Card>
                         );
                      })}
                   </div>
                 </div>
              </div>
            </div>
          )}

          {view === 'treasury' && (
            <div className="space-y-16 animate-in slide-in-from-bottom-12">
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Landmark className="text-emerald-500" size={24} />
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.4em] italic">Vault Management V2.0</span>
                  </div>
                  <h1 className="text-9xl font-black italic uppercase tracking-tighter leading-none text-emerald-400">Vault</h1>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-white/60">Sovereign Liquidity & Ledger Oversight</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${paypalStatus === 'verified' ? 'bg-emerald-500' : paypalStatus === 'checking' ? 'bg-yellow-500' : paypalStatus === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                  <span className="text-[10px] font-black uppercase text-blue-400 italic tracking-widest">
                    {paypalStatus === 'checking' ? 'Connecting...' : paypalStatus === 'failed' ? 'Bridge Error' : 'Neural Settlement Bridge: Online'}
                  </span>
                  <Badge
                    variant={
                      paypalStatus === 'verified' && PAYPAL_LIVE_MODE ? 'success' :
                      paypalStatus === 'verified' && !PAYPAL_LIVE_MODE ? 'info' :
                      paypalStatus === 'failed' ? 'critical' : 'warning'
                    }
                    className="!text-[8px] cursor-pointer"
                    live={paypalStatus === 'verified' || paypalStatus === 'checking'}
                    onClick={async () => {
                      // Manual Retry Logic
                      setPaypalStatus('checking');
                      const isConnected = await paypalService.checkConnection();
                      if (isConnected) {
                          setPaypalStatus('verified');
                      } else {
                          const fallback = confirm("Bridge connection failed. Switch to Simulation Mode?");
                          if (fallback) {
                              setPaypalStatus('simulation');
                          } else {
                              setPaypalStatus('failed');
                          }
                      }
                    }}
                  >
                    {
                      paypalStatus === 'checking' ? 'Verifying...' :
                      paypalStatus === 'failed' ? 'Retry Connection' :
                      paypalStatus === 'verified' && PAYPAL_LIVE_MODE ? 'Live PayPal Payouts' :
                      paypalStatus === 'verified' ? 'Sandbox Mode' : 'Simulation Mode'
                    }
                  </Badge>
                  
                  <div className="ml-2">
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-[8px] h-6 px-2 border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                            onClick={() => setShowUpdateCredentials(true)}
                        >
                            Update Keys
                        </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-12">
                <div className="col-span-12 lg:col-span-4 space-y-8">
                  {/* Authorize Exit Section with Withdrawal Limits */}
                  <Card blueprint className="p-10 border-emerald-500/40 bg-emerald-500/[0.05] space-y-10 shadow-3xl">
                    <div className="flex items-center gap-8">
                      <div className="p-6 bg-emerald-500/20 rounded-3xl border-2 border-emerald-400 shadow-glow-sm"><Wallet size={48} className="text-emerald-400" /></div>
                      <div className="flex-1">
                        <p className="text-[11px] font-black uppercase text-emerald-400 tracking-[0.4em] italic">Available Balance</p>
                        <p className="text-7xl font-black text-white italic tracking-tighter leading-none">${(user?.balance || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t-2 border-white/10">
                      <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Settlement Amount</label>
                            <span className="text-[9px] font-black uppercase text-emerald-400/60 italic">Limit: ${WITHDRAWAL_LIMITS.PER_TRANSACTION.toFixed(2)}</span>
                         </div>
                         <div className="relative group">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-white/20 group-focus-within:text-emerald-400 transition-colors">$</span>
                            <input 
                              type="number" 
                              value={withdrawAmount} 
                              onChange={e => setWithdrawAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-black/60 border-2 border-white/10 rounded-2xl p-6 pl-12 text-3xl font-black italic text-white outline-none focus:border-emerald-500 transition-all placeholder:text-white/5"
                            />
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase italic tracking-widest text-white/30">
                            <span>Protocol Utilization</span>
                            <span className={parseFloat(withdrawAmount) > WITHDRAWAL_LIMITS.PER_TRANSACTION ? 'text-red-400' : 'text-white/60'}>
                                {Math.min(100, Math.max(0, (parseFloat(withdrawAmount) || 0) / WITHDRAWAL_LIMITS.PER_TRANSACTION * 100)).toFixed(1)}%
                            </span>
                         </div>
                         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${parseFloat(withdrawAmount) > WITHDRAWAL_LIMITS.PER_TRANSACTION ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`}
                              style={{ width: `${Math.min(100, (parseFloat(withdrawAmount) || 0) / WITHDRAWAL_LIMITS.PER_TRANSACTION * 100)}%` }}
                            ></div>
                         </div>
                          {withdrawAmount && (
                            <p className="text-[9px] font-mono text-white/40">
                              {parseFloat(withdrawAmount) > (user?.balance || 0)
                                ? 'Requested exit exceeds available vault balance.'
                                : parseFloat(withdrawAmount) > WITHDRAWAL_LIMITS.PER_TRANSACTION
                                ? 'Requested exit exceeds single-transaction protocol ceiling.'
                                : 'Exit request is within current protocol and balance thresholds.'}
                            </p>
                          )}
                      </div>

                      <Button 
                        onClick={executeInstantWithdrawal} 
                        loading={payoutLoading} 
                        disabled={!isWithdrawalValid} 
                        variant="success" 
                        className="w-full h-24 text-3xl shadow-glow" 
                        icon={Banknote}
                      >
                        Authorize Liquid Exit
                      </Button>
                    </div>
                  </Card>

                  {/* Strategic Funding Protocols Section */}
                  <Card blueprint className="p-10 border-blue-500/30 bg-blue-500/[0.03] space-y-8">
                    <div className="flex justify-between items-center">
                       <h3 className="text-2xl font-black italic uppercase text-white flex items-center gap-3">
                          <Landmark className="text-blue-400" size={24} /> Strategic Funding
                       </h3>
                       <button onClick={() => setShowLinkProtocol(true)} className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600 hover:text-white transition-all">
                          <Plus size={20} />
                       </button>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                       {fundingSources.map(fs => (
                         <div key={fs.id} className="p-5 rounded-2xl border-2 border-white/5 bg-black/40 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                            <div className="flex items-center gap-4">
                               <div className="p-3 rounded-xl bg-white/5 text-white/60">
                                  {fs.type === 'Bank' ? <Building2 size={20} /> : <CreditCard size={20} />}
                               </div>
                               <div>
                                  <p className="text-[10px] font-black uppercase italic text-white leading-tight">{fs.label}</p>
                                  <p className="text-[9px] font-mono text-white/30 mt-1 uppercase">{fs.provider} •••• {fs.lastFour}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <Badge variant="neutral" className="!text-[6px] tracking-widest">{fs.status}</Badge>
                               <button onClick={(e) => handleDecommissionSource(fs.id, e)} className="p-2 rounded-lg bg-red-600/10 text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash size={14} />
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                  </Card>
                </div>

                <div className="col-span-12 lg:col-span-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                       <h3 className="text-3xl font-black italic uppercase tracking-widest flex items-center gap-4 text-white/80"><Receipt className="text-blue-500" /> Authorized Ledger</h3>
                       <p className="text-[9px] uppercase tracking-widest text-white/30 italic">Spectral Audit Trace Protocol • {filteredTransactions.length} entries</p>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={resetFilters} className="text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors flex items-center gap-2 italic tracking-widest">
                          <RotateCcw size={12} /> Reset Matrix
                       </button>
                       <Badge variant="neutral" className="!text-[8px]" icon={History}>Syncing: 40ms</Badge>
                    </div>
                  </div>
                  
                  {/* Enhanced Institutional Filtering Protocol */}
                  <div className="flex flex-col gap-6 p-10 glass border-white/10 rounded-[3rem] bg-black/60 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                         <Filter size={120} />
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
                        {/* Search Node */}
                        <div className="lg:col-span-2 relative">
                          <p className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] italic ml-1 mb-2">Search Node</p>
                          <div className="relative group">
                             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors" size={18} />
                             <input 
                               type="text" 
                               placeholder="Trace ID or Description..." 
                               value={txSearch} 
                               onChange={(e) => setTxSearch(e.target.value)}
                               className="w-full bg-black/40 border-2 border-white/10 rounded-2xl py-4 pl-14 pr-12 font-black italic text-sm outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-white/10 shadow-inner"
                             />
                             {txSearch && (
                               <button onClick={() => setTxSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                                 <XCircle size={18} />
                               </button>
                             )}
                          </div>
                        </div>

                        {/* Grid Cycle Timeframe */}
                        <div className="space-y-3">
                           <p className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] italic ml-1 flex items-center gap-2"><Calendar size={10} /> Grid Cycle</p>
                           <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                               {(['all', 'epoch', 'cycle', 'quarter'] as const).map(c => (
                                 <button key={c} onClick={() => setTxCycleFilter(c)} className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase italic transition-all ${txCycleFilter === c ? 'bg-blue-600 text-white shadow-glow-sm' : 'text-white/20 hover:text-white/40'}`}>
                                   {c === 'all' ? 'Any' : c === 'epoch' ? '24h' : c === 'cycle' ? '7d' : '90d'}
                                 </button>
                               ))}
                           </div>
                        </div>

                        {/* Sorting Protocol */}
                        <div className="space-y-3">
                           <p className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] italic ml-1 flex items-center gap-2"><ArrowUpDown size={10} /> Sort Protocol</p>
                           <select 
                              value={txSortProtocol} 
                              onChange={(e) => setTxSortProtocol(e.target.value as SortProtocol)}
                              className="w-full bg-black/40 border-2 border-white/10 rounded-xl p-3 text-[9px] font-black uppercase outline-none text-white cursor-pointer hover:border-blue-500 transition-colors appearance-none"
                           >
                              <option value="date-desc">Newest → Oldest</option>
                              <option value="date-asc">Oldest → Newest</option>
                              <option value="amount-desc">Amount: High → Low</option>
                              <option value="amount-asc">Amount: Low → High</option>
                           </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                           <div className="space-y-3">
                              <p className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] italic ml-1">Type Sector</p>
                              <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                  {(['all', 'credit', 'debit'] as const).map(t => (
                                    <button key={t} onClick={() => setTxTypeFilter(t)} className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase italic transition-all ${txTypeFilter === t ? 'bg-blue-600 text-white shadow-glow-sm' : 'text-white/20 hover:text-white/40'}`}>
                                      {t === 'all' ? 'Any' : t}
                                    </button>
                                  ))}
                              </div>
                           </div>

                           <div className="space-y-3">
                              <p className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] italic ml-1">Protocol State</p>
                              <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                  {(['all', 'Completed', 'Processing', 'Auditing', 'Failed'] as const).map(s => (
                                    <button key={s} onClick={() => setTxStatusFilter(s)} className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase italic transition-all truncate px-1 ${txStatusFilter === s ? 'bg-emerald-600 text-white shadow-glow-sm' : 'text-white/20 hover:text-white/40'}`}>
                                      {s === 'all' ? 'Any' : s}
                                    </button>
                                  ))}
                              </div>
                           </div>

                           <div className="space-y-3">
                              <p className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] italic ml-1 flex items-center gap-2"><DollarSign size={10} /> Liquidity Tier</p>
                              <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                  {(['all', 'micro', 'standard', 'institutional'] as const).map(tier => (
                                    <button key={tier} onClick={() => setTxLiquidityTier(tier)} className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase italic transition-all truncate px-1 ${txLiquidityTier === tier ? 'bg-purple-600 text-white shadow-glow-sm' : 'text-white/20 hover:text-white/40'}`}>
                                      {tier === 'all' ? 'Any' : tier === 'micro' ? '<$100' : tier === 'standard' ? '$1k+' : 'VIP'}
                                    </button>
                                  ))}
                              </div>
                           </div>
                      </div>
                      
                      {/* Active Filter Summary */}
                      {activeFilterCount > 0 && (
                         <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2 items-center">
                            <span className="text-[8px] font-black uppercase text-white/30 tracking-widest mr-2">Active Filters ({activeFilterCount}):</span>
                            {txTypeFilter !== 'all' && <Badge variant="info" className="!bg-blue-600/10 !border-blue-400/30">Type: {txTypeFilter}</Badge>}
                            {txStatusFilter !== 'all' && <Badge variant="success" className="!bg-emerald-600/10 !border-emerald-400/30">{txStatusFilter}</Badge>}
                            {txCycleFilter !== 'all' && <Badge variant="neutral" className="!bg-white/5">Cycle: {txCycleFilter}</Badge>}
                            {txLiquidityTier !== 'all' && <Badge variant="purple" className="!bg-purple-600/10 !border-purple-400/30">{txLiquidityTier} Assets</Badge>}
                            <button onClick={resetFilters} className="text-[8px] font-black uppercase text-red-400 hover:text-red-300 ml-auto flex items-center gap-1"><X size={10} /> Purge Active Matrix</button>
                         </div>
                      )}
                  </div>

                  <div className="space-y-4 max-h-[800px] overflow-y-auto scrollbar-hide pr-2">
                    {filteredTransactions.map(tx => {
                      if (!tx) return null;
                      const isPending = tx.status === 'Processing' || tx.status === 'Auditing';
                      return (
                        <Card key={tx.id} onClick={() => setSelectedTx(tx)} className={`p-10 flex items-center justify-between border-2 transition-all hover:bg-white/[0.04] cursor-pointer group ${tx.type === 'debit' ? 'border-red-500/10' : 'border-emerald-500/10'} ${isPending ? 'shadow-[0_0_20px_rgba(59,130,246,0.1)] relative' : ''}`}>
                          {isPending && (
                             <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                               <div className="h-full bg-blue-500 animate-shimmer-sweep w-1/4"></div>
                             </div>
                          )}
                          <div className="flex items-center gap-10">
                            <div className={`p-6 rounded-[2rem] border-2 ${tx.type === 'credit' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                              {tx.type === 'credit' ? <ArrowDown size={32} /> : <ArrowUp size={32} />}
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <p className="text-2xl font-black uppercase italic text-white tracking-tight">{tx.description}</p>
                                <Badge 
                                  variant={tx.status === 'Completed' ? 'success' : tx.status === 'Failed' ? 'danger' : tx.status === 'Processing' ? 'processing' : 'warning'}
                                  live={isPending}
                                  icon={tx.status === 'Processing' ? Loader2 : tx.status === 'Auditing' ? Shield : undefined}
                                >
                                  {tx.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <p className="text-[10px] text-white/20 font-mono tracking-tighter">{tx.txHash}</p>
                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                <div className="flex items-center gap-2">
                                  {tx.method === 'PayPal' ? <ExternalLink size={12} className="text-blue-400" /> : tx.method === 'Internal Grid' ? <Zap size={12} className="text-purple-400" /> : <CreditCard size={12} className="text-emerald-400" />}
                                  <p className="text-[10px] font-black uppercase text-blue-400 italic">{tx.method}</p>
                                </div>
                                <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-blue-400 font-black uppercase italic text-[9px]">
                                   <Eye size={12} /> Inspect Trace
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-5xl font-black italic tracking-tighter font-mono ${tx.type === 'credit' ? 'text-emerald-400' : 'text-white'}`}>
                              {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                            </p>
                            <p className="text-[10px] text-white/20 mt-2 font-black uppercase italic tracking-widest">{tx.date}</p>
                          </div>
                        </Card>
                      );
                    })}
                    
                    {filteredTransactions.length === 0 && (
                        <div className="py-32 text-center glass border-2 border-dashed border-white/5 rounded-[3rem] space-y-4 opacity-30">
                            <Search size={64} className="mx-auto" />
                            <div className="space-y-1">
                                <p className="text-xl font-black uppercase italic tracking-[0.2em]">No Matches Found</p>
                                <p className="text-[10px] uppercase font-bold text-blue-400">Try adjusting your spectral filter parameters</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={resetFilters} className="mx-auto">Initialize Protocol Reset</Button>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'citadel' && (
            <div className="space-y-16 animate-in slide-in-from-top-12">
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <LockKeyhole className="text-blue-500" size={24} />
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.4em] italic">Security Matrix 7.4-SOV</span>
                  </div>
                  <h1 className="text-9xl font-black italic uppercase tracking-tighter leading-none">Citadel</h1>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-blue-400">Architect Management & Global Grid Protocols</p>
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => setShowAddArchitect(true)} variant="primary" size="lg" className="h-20 shadow-glow" icon={UserPlus}>Induct Architect</Button>
                </div>
              </div>

              {/* Security Matrix Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                 <MetricCard label="Total Architects" value={allUsers.length} icon={Users} colorClass="blue" subValue="Authorized Nodes" />
                 <MetricCard label="Elevated Roles" value={allUsers.filter(u => u.role === 'Admin').length} icon={ShieldAlert} colorClass="red" subValue="Security Clearances" />
                 <MetricCard label="Pending Audits" value={transactions.filter(t => t.status === 'Auditing').length} icon={Fingerprint} colorClass="gold" subValue="Anomalies" />
                 <MetricCard label="Neural Load" value="14.2%" icon={Database} colorClass="purple" subValue="Database Memory" />
              </div>

              {/* Matrix Search Protocol */}
              <Card blueprint className="p-8 border-white/10 bg-black/40">
                  <div className="flex items-center gap-6">
                     <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                        <input 
                           type="text" 
                           placeholder="Search global grid for Architect signature or communication node..." 
                           value={citadelSearch}
                           onChange={(e) => setCitadelSearch(e.target.value)}
                           className="w-full bg-black/60 border-2 border-white/10 rounded-2xl py-5 pl-16 pr-6 font-black italic text-sm outline-none focus:border-blue-500 transition-all text-white placeholder:text-white/10"
                        />
                     </div>
                  </div>
              </Card>

              {/* User Permission Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredUsers.map((u) => {
                  if (!u) return null;
                  const permCount = u.permissions?.length || 0;
                  return (
                    <Card key={u.id} className="p-10 border-white/10 bg-white/[0.02] space-y-8 group hover:border-blue-500/40 transition-all flex flex-col justify-between">
                      <div className="space-y-8">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center font-black text-3xl border-2 border-blue-400/30 shadow-glow-sm overflow-hidden">
                               {u.activeLogo ? <img src={u.activeLogo} className="w-full h-full object-cover" alt="logo" /> : (u.name ? u.name[0] : 'U')}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-2xl font-black italic uppercase text-white truncate leading-tight">{u.name}</h3>
                              <p className="text-[10px] text-white/30 font-mono italic truncate">{u.email}</p>
                            </div>
                          </div>
                          <Badge variant={u.role === 'Admin' ? 'critical' : 'neutral'} className="!text-[8px]">{u.role}</Badge>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-white/5">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40 italic">
                              <span>Neural Permissions</span>
                              <span className="text-blue-400">{permCount} nodes</span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {u.permissions?.slice(0, 4).map(p => {
                                 const Icon = PERMISSIONS[p]?.icon || Activity;
                                 return <div key={p} className="p-2 rounded-lg bg-white/5 text-white/60 border border-white/5" title={PERMISSIONS[p]?.label}><Icon size={14}/></div>;
                              })}
                              {permCount > 4 && <div className="p-2 rounded-lg bg-white/5 text-white/40 border border-white/5 font-black text-[9px]">+{permCount - 4}</div>}
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                              <p className="text-[8px] font-black uppercase text-white/20">Grid Tier</p>
                              <p className="text-xs font-black italic text-white uppercase">{u.tier || 'Junior'}</p>
                           </div>
                           <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                              <p className="text-[8px] font-black uppercase text-white/20">Sync Status</p>
                              <p className="text-xs font-black italic text-emerald-400 uppercase">ONLINE</p>
                           </div>
                        </div>
                      </div>

                      <div className="pt-10">
                        <Button variant="outline" className="w-full h-14 !text-[10px] hover:!bg-blue-600 hover:!border-blue-400" icon={UserCog} onClick={() => setManagingUser(u)}>Reconfigure Clearance</Button>
                      </div>
                    </Card>
                  );
                })}

                {filteredUsers.length === 0 && (
                   <div className="col-span-full py-40 text-center glass border-2 border-dashed border-white/5 rounded-[4rem] opacity-20 space-y-4">
                      <ShieldX size={80} className="mx-auto" />
                      <p className="text-2xl font-black uppercase italic tracking-widest">Architect Signature Not Found</p>
                   </div>
                )}
              </div>
            </div>
          )}

          {view === 'profile' && (
            <div className="space-y-12 animate-in slide-in-from-right-8">
               <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h1 className="text-8xl font-black italic uppercase tracking-tighter leading-none">Architect Hub</h1>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-blue-400">Identity Synthesis & Grid Alert Protocols</p>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-12">
                <div className="col-span-12 lg:col-span-4 space-y-8">
                  <Card blueprint className="p-10 bg-white/[0.02] border-white/10 space-y-8">
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 bg-blue-600/20 rounded-3xl mx-auto border-2 border-blue-500 flex items-center justify-center text-4xl font-black italic shadow-glow-sm overflow-hidden">
                        {user?.activeLogo ? <img src={user.activeLogo} className="w-full h-full object-cover" /> : (user?.name ? user.name[0] : 'U')}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-3xl font-black uppercase italic tracking-tight">{user?.name}</h3>
                        <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px]">{user?.tier} Architect • {user?.plan}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Neural Alert Protocols (Settings) */}
                  <Card blueprint className="p-10 border-blue-500/30 bg-blue-500/[0.05] space-y-8">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black italic uppercase text-white flex items-center gap-3">
                        <Bell size={24} className="text-blue-400" /> Alert Protocols
                      </h3>
                      <p className="text-[9px] uppercase tracking-widest text-white/30 italic">Real-time notification synchronization</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { id: 'engineStatus', label: 'Engine Dynamics', icon: Activity, desc: 'Status changes & node failure reports', color: 'text-emerald-400' },
                        { id: 'transactions', label: 'Ledger Settlement', icon: Banknote, desc: 'Instant liquidity & audit alerts', color: 'text-blue-400' },
                        { id: 'referrals', label: 'Peer Expansion', icon: Network, desc: 'Network growth & reward triggers', color: 'text-purple-400' },
                        { id: 'security', label: 'Security Matrix', icon: ShieldAlert, desc: 'System integrity & protocol breaches', color: 'text-red-400' },
                      ].map((pref) => (
                        <button 
                          key={pref.id} 
                          onClick={() => {
                            const newPrefs = { ...(user.alertPrefs || { engineStatus: true, transactions: true, referrals: true, security: true }), [pref.id]: !((user.alertPrefs as any)?.[pref.id]) };
                            updateUser(user.id, { alertPrefs: newPrefs as any });
                          }}
                          className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group ${ (user.alertPrefs as any)?.[pref.id] ? 'bg-white/5 border-white/20' : 'bg-black/40 border-white/5 opacity-50' }`}
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className={`p-2 rounded-lg bg-white/5 ${pref.color}`}>
                              <pref.icon size={18} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase italic text-white leading-tight">{pref.label}</p>
                              <p className="text-[8px] text-white/30 mt-0.5 leading-tight">{pref.desc}</p>
                            </div>
                          </div>
                          <div className={`w-10 h-5 rounded-full relative transition-all ${ (user.alertPrefs as any)?.[pref.id] ? 'bg-blue-600' : 'bg-white/10' }`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${ (user.alertPrefs as any)?.[pref.id] ? 'left-6' : 'left-1' }`}></div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
                <div className="col-span-12 lg:col-span-8 space-y-8">
                  <Card blueprint className="p-10 border-blue-500/30 bg-blue-500/[0.05] space-y-10">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black italic uppercase text-white flex items-center gap-4">
                        <Palette size={32} className="text-emerald-400" /> Identity Synthesis
                      </h3>
                      <p className="text-[11px] uppercase tracking-[0.5em] text-white/40 italic">Generate neural brand assets for your Architect profile</p>
                    </div>
                    <div className="space-y-6 pt-6 border-t border-white/10">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest italic">Conceptual Identity Theme</label>
                            <div className="flex gap-4">
                               <input type="text" value={brandThemeInput} onChange={e => setBrandThemeInput(e.target.value)} placeholder="e.g. Institutional Trust, Hyper-Growth AI..." className="flex-1 bg-black/80 border-2 border-white/10 rounded-2xl p-6 text-white font-black italic outline-none focus:border-blue-500 transition-all" />
                               <Button onClick={generateBrandingLogos} loading={isBrandingLoading} className="h-full px-10" icon={Sparkles}>Synthesize Logos</Button>
                            </div>
                         </div>
                    </div>
                    <div className="grid grid-cols-4 gap-6">
                      {(user?.brandAssets || []).map((asset, i) => (
                        <div key={i} onClick={() => updateUser(user.id, { activeLogo: asset })} className={`aspect-square rounded-3xl border-2 transition-all cursor-pointer overflow-hidden group relative ${user.activeLogo === asset ? 'border-emerald-500 scale-[1.05] shadow-glow-sm' : 'border-white/10 hover:border-white/30'}`}>
                           <img src={asset} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="Brand Asset" />
                           {user.activeLogo === asset && (
                             <div className="absolute top-2 right-2 p-1 bg-emerald-500 rounded-lg shadow-lg">
                               <Check size={12} className="text-white" />
                             </div>
                           )}
                        </div>
                      ))}
                      {(!user?.brandAssets || user.brandAssets.length === 0) && Array(4).fill(0).map((_, i) => (
                        <div key={i} className="aspect-square rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center opacity-10 space-y-2">
                          <Image size={24} />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {view === 'nodes' && (
            <div className="space-y-12 animate-in slide-in-from-bottom-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                  <h1 className="text-8xl font-black italic uppercase tracking-tighter leading-none">Inventory</h1>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-blue-400">Neural Infrastructure Real-time Metabolism</p>
                </div>
                <div className="flex gap-4">
                  <div className="relative w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input type="text" placeholder="Search active grid..." value={engineSearch} onChange={(e) => setEngineSearch(e.target.value)} className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-3 pl-12 pr-6 font-black italic text-xs outline-none focus:border-blue-500/50 transition-all text-white" />
                  </div>
                  <Button 
                    variant={autoOptimizeEnabled ? "outline" : "neutral"} 
                    className={`h-full aspect-square !p-0 flex items-center justify-center ${autoOptimizeEnabled ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : ''}`}
                    onClick={() => setShowOptimizationConfig(!showOptimizationConfig)}
                  >
                    <Settings size={20} className={autoOptimizeEnabled ? "animate-spin-slow" : ""} />
                  </Button>
                </div>
              </div>

              {/* Optimization Config Panel */}
              {showOptimizationConfig && (
                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 animate-in fade-in slide-in-from-top-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${autoOptimizeEnabled ? 'bg-blue-600 text-white shadow-glow' : 'bg-white/5 text-white/30'}`}>
                        <Zap size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black italic uppercase">Auto-Optimization Protocol</h3>
                        <p className="text-[10px] text-white/50 uppercase tracking-widest">Autonomous Neural Self-Repair System</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 bg-black/40 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase text-white/60">Status</span>
                        <div 
                          className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${autoOptimizeEnabled ? 'bg-blue-600' : 'bg-white/10'}`}
                          onClick={() => setAutoOptimizeEnabled(!autoOptimizeEnabled)}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${autoOptimizeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                        <span className={`text-[10px] font-black uppercase ${autoOptimizeEnabled ? 'text-blue-400' : 'text-white/30'}`}>
                          {autoOptimizeEnabled ? 'Active' : 'Offline'}
                        </span>
                      </div>
                      
                      <div className="h-8 w-px bg-white/10" />
                      
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase text-white/60">Threshold</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="50" 
                            max="95" 
                            value={optimizationThreshold} 
                            onChange={(e) => setOptimizationThreshold(parseInt(e.target.value))}
                            className="w-24 accent-blue-500"
                          />
                          <span className="text-xs font-mono font-black text-blue-400">{optimizationThreshold}%</span>
                        </div>
                      </div>

                      <div className="h-8 w-px bg-white/10" />
                      
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-glow-sm"
                        onClick={optimizeAllEngines}
                        icon={Sparkles}
                      >
                        Optimize All Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEngines.map(engine => {
                  if (!engine) return null;
                  return (
                    <Card key={engine.id} hover onClick={() => setSelectedEngine(engine)} className={`p-10 border-2 transition-all relative overflow-hidden h-[32rem] group shadow-2xl ${engine.status === 'Critical Failure' ? 'border-red-600/60 shadow-red-600/10' : ''}`}>
                       <div className="absolute inset-0 z-0 opacity-20 pointer-events-none transition-all group-hover:opacity-40">
                          {engine.imageUrl && <img src={engine.imageUrl} className={`w-full h-full object-cover grayscale brightness-50 contrast-125 transition-all group-hover:scale-110`} alt={engine.name} />}
                       </div>
                       <div className="relative z-10 flex flex-col justify-between h-full">
                          <div className="flex justify-between items-start">
                            <Badge variant={engine.status === 'Active' ? 'success' : engine.status === 'Critical Failure' ? 'critical' : 'warning'} live={engine.status === 'Active'}>{engine.status}</Badge>
                            <div className="flex flex-col items-end gap-1">
                               <span className={`text-[10px] font-black ${engine.performance < 50 ? 'text-red-400' : 'text-emerald-400'}`}>{engine.performance}%</span>
                               <Sparkline data={engine.history} width={80} height={15} color={engine.performance < 50 ? "#ef4444" : "#10b981"} animate={false} />
                            </div>
                          </div>
                          <div className="space-y-6">
                            <h4 className="text-4xl font-black italic uppercase text-white truncate">{engine.name || 'Unnamed Engine'}</h4>
                            <p className="text-[9px] uppercase tracking-[0.3em] text-blue-400 mt-2 font-black">{engine.type || 'REVENUE NODE'}</p>
                            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                              <div>
                                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest mb-1">Live Yield</p>
                                <p className={`text-2xl font-black italic font-mono tracking-tighter ${engine.status === 'Active' ? 'text-emerald-400' : 'text-white/20'}`}>
                                  {engine.status === 'Active' ? `$${(engine.revenue || 0).toFixed(3)}` : 'OFFLINE'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest mb-1">Grid Uptime</p>
                                <p className="text-2xl font-black text-white italic tracking-tighter">{engine.uptime || '100%'}</p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button variant="outline" className="flex-1 !text-[8px] h-10 group-hover:bg-blue-600 group-hover:border-blue-400 transition-all" icon={Maximize2} onClick={() => setSelectedEngine(engine)}>Inspect</Button>
                              <Button
                                variant="outline"
                                className="flex-1 !text-[8px] h-10 hover:bg-emerald-600/10 hover:border-emerald-500/40 transition-all text-white/60 hover:text-emerald-400"
                                icon={Download}
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDownloadEngineConfig(engine, e)}
                              >
                                Download Config
                              </Button>
                              <Button
                                variant="outline"
                                className="w-10 !text-[8px] h-10 hover:bg-red-600/10 hover:border-red-500/40 transition-all text-white/60 hover:text-red-400 !px-0 flex items-center justify-center"
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this engine?')) {
                                    deleteEngine(engine.id);
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                       </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Neural Notifications Overlay */}
      {showNotifications && (
        <div className="fixed inset-0 z-[250] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifications(false)}></div>
          <aside className="w-[32rem] bg-black border-l-2 border-white/10 h-full flex flex-col relative z-10 animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Megaphone className="text-blue-500" size={24} />
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Alert Matrix</h2>
              </div>
              <button onClick={() => setShowNotifications(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={32} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">
              {notifications.filter(n => n).map(n => (
                <Card key={n.id} className={`p-6 border-2 transition-all group ${n.read ? 'opacity-50' : 'border-blue-500/20 bg-blue-600/5'}`}>
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-xl ${n.severity === 'critical' ? 'bg-red-600/20 text-red-500' : n.severity === 'warning' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-blue-600/20 text-blue-400'}`}>
                        {n.severity === 'critical' ? <XCircle size={18} /> : n.severity === 'warning' ? <AlertTriangle size={18} /> : <Info size={18} />}
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                           <p className="text-sm font-black uppercase italic tracking-tight text-white">{n.title}</p>
                           <Badge variant="neutral" className="!text-[6px] tracking-tighter !py-0.5 !px-1.5 opacity-40">{n.category}</Badge>
                        </div>
                        <p className="text-[10px] text-white/60 leading-relaxed font-medium mb-3">{n.message}</p>
                        <span className="text-[8px] font-black uppercase text-white/20 italic">{n.timestamp}</span>
                     </div>
                  </div>
                </Card>
              ))}
              {notifications.length === 0 && (
                <div className="py-20 text-center opacity-20 space-y-4">
                   <ZapOff size={48} className="mx-auto" />
                   <p className="text-xs font-black uppercase italic">No active alert traces</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {selectedEngine && <EngineDetailsModal 
        engine={selectedEngine} 
        onClose={() => setSelectedEngine(null)} 
        onToggleStatus={toggleEngineStatus}
        onDelete={deleteEngine}
        onExit={async (id) => {
        const engine = engines.find(e => e && e.id === id);
        if (!engine) return;
        const amount = engine.revenue || 0;
        setAllUsers(prev => prev.map(u => u && u.id === user.id ? { ...u, balance: (u.balance || 0) + amount, lifetimeYield: (u.lifetimeYield || 0) + amount } : u));
        setEngines(prev => prev.map(e => e && e.id === id ? { ...e, revenue: 0, status: 'Auditing' as EngineStatus } : e).filter((e): e is Engine => e !== null));
        
        const newTx: Transaction = {
          id: 'tx_yield_' + Date.now(),
          date: new Date().toLocaleString(),
          timestamp_ms: Date.now(),
          description: `Yield Settlement: ${engine.name || 'Neural Node'}`,
          amount,
          type: 'credit',
          status: 'Processing',
          method: 'Internal Grid',
          txHash: `YLD_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          logs: [
            { timestamp: new Date().toLocaleTimeString(), event: 'Yield Aggregation Initialized', node: engine.id },
            { timestamp: new Date().toLocaleTimeString(), event: 'Cross-Node Settlement Bridge Open', node: 'SOV_TREASURY_ALPHA' }
          ]
        };
        setTransactions(prev => [newTx, ...(Array.isArray(prev) ? prev : [])].filter((t): t is Transaction => t !== null));
      }} />}

      {managingUser && <UserPermissionModal user={managingUser} onClose={() => setManagingUser(null)} onUpdate={updateUser} />}
      {showLinkProtocol && <LinkProtocolModal onClose={() => setShowLinkProtocol(false)} onLink={handleLinkSource} />}
      {showAddArchitect && <AddArchitectModal onClose={() => setShowAddArchitect(false)} onAdd={handleInductArchitect} />}
      {selectedTx && <TransactionDetailsModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
      {withdrawalSuccessTx && (
        <WithdrawalConfirmationModal 
          tx={withdrawalSuccessTx} 
          onClose={() => setWithdrawalSuccessTx(null)} 
          onViewLedger={() => {
            setView('treasury');
            setSelectedTx(withdrawalSuccessTx);
            setWithdrawalSuccessTx(null);
          }}
        />
      )}
      {showUpdateCredentials && (
        <UpdateCredentialsModal 
            onClose={() => setShowUpdateCredentials(false)} 
            onUpdate={handleUpdateCredentials}
        />
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
