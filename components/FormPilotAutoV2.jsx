import { useState, useEffect, useMemo, useCallback } from "react";
import { useIsMobile } from "../hooks/useIsMobile";

// ============================================================
// FormPilot AUTONOMOUS v2 — 超効率営業自動化
// 7つの新機能で契約数を最大化
// ============================================================

const C = {
  bg:"#04060B",bg2:"#080B13",sf:"#0C1019",card:"#111622",
  ca:"#161C2B",bdr:"#1B2235",bdrH:"#252E45",
  tx:"#D2DAE8",sub:"#7E8CA4",dim:"#454F63",
  acc:"#F0B429",accDk:"#D49B1F",accGl:"rgba(240,180,41,.07)",
  g:"#34D399",gB:"rgba(52,211,153,.08)",
  r:"#F87171",rB:"rgba(248,113,113,.08)",
  b:"#60A5FA",bB:"rgba(96,165,250,.08)",
  p:"#A78BFA",pB:"rgba(167,139,250,.08)",
  o:"#FB923C",oB:"rgba(251,146,60,.08)",
  cy:"#22D3EE",cyB:"rgba(34,211,238,.08)",
  pk:"#F472B6",pkB:"rgba(244,114,182,.08)",
  st:"#635BFF",
};

const WEAKNESS_SIGNALS = [
  "構造化データ未実装","FAQ schema なし","HowTo markup なし",
  "AI引用ゼロ","Brand Radar 言及なし","メタディスクリプション不備",
  "E-E-A-T シグナル弱","コンテンツ更新停滞","内部リンク構造不足",
  "ページ表示速度低下","モバイル最適化不足","サイトマップ不備",
];
const INDUSTRIES = ["IT・SaaS","製造業","不動産","士業","医療","EC","飲食","教育","人材","金融","建設","物流"];
const REGIONS = ["東京","大阪","名古屋","福岡","札幌","仙台","横浜","神戸","京都","広島"];
const COMPANY_SIZES = ["1-10名","11-50名","51-200名","201-500名","500名以上"];
const REVENUE_RANGES = ["〜5000万","5000万〜1億","1億〜5億","5億〜20億","20億以上"];

// ============================================================
// Icons
// ============================================================
const I=({d,s=15,c=C.sub,...p})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>;
const ic={
  radar:<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="6"/></>,
  zap:<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  send:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  check:<><polyline points="20 6 9 17 4 12"/></>,
  x:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  clock:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  bar:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  globe:<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  dollar:<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  users:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  activity:<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  search:<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  link:<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  star:<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
  mail:<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  bell:<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  file:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  repeat:<><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
  award:<><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>,
  eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  trending:<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
};

const Phase=({p})=>{
  const m={discovered:{c:C.cy,l:"発見"},form_found:{c:C.b,l:"フォーム済"},queued:{c:C.o,l:"送信待"},sent:{c:C.p,l:"送信済"},replied:{c:C.acc,l:"返信有"},customer:{c:C.g,l:"顧客"},followup:{c:C.pk,l:"追客中"}};
  const s=m[p]||m.discovered;
  return<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3,background:`${s.c}14`,color:s.c}}>{s.l}</span>;
};
const StBadge=({s})=>{
  if(!s)return<span style={{fontSize:9,color:C.dim}}>—</span>;
  const m={active:{c:C.g,l:"契約中"},trialing:{c:C.b,l:"トライアル"},past_due:{c:C.o,l:"遅延"},canceled:{c:C.r,l:"解約"}};
  const v=m[s]||{c:C.dim,l:s};
  return<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3,background:`${v.c}12`,color:v.c}}>{v.l}</span>;
};
const ScoreBadge=({score})=>{
  const c=score>=80?C.g:score>=60?C.acc:score>=40?C.o:C.r;
  return<span style={{fontSize:10,fontWeight:800,fontFamily:"'Geist Mono',monospace",color:c,padding:"2px 6px",borderRadius:3,background:`${c}10`}}>{score}</span>;
};

const KPI=({icon,ic:icC,label,val,sub,trend,good})=>(
  <div style={{background:C.card,borderRadius:8,padding:"13px 15px",border:`1px solid ${C.bdr}`,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:icC,opacity:.4}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontSize:9,color:C.sub,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:3}}>{label}</div>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,fontFamily:"'Geist Mono',monospace",lineHeight:1}}>{val}</div>
        {sub&&<div style={{fontSize:9,color:C.dim,marginTop:3}}>{sub}</div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
        <div style={{width:26,height:26,borderRadius:5,background:`${icC}10`,display:"flex",alignItems:"center",justifyContent:"center"}}><I d={icon} s={12} c={icC}/></div>
        {trend!==undefined&&<span style={{fontSize:9,fontWeight:700,color:good?C.g:C.r}}>{trend>=0?"↑":"↓"}{Math.abs(trend)}%</span>}
      </div>
    </div>
  </div>
);

// ============================================================
// A/B Templates
// ============================================================
const TEMPLATES = [
  { id:"t1", name:"LLMO診断レポート訴求", subject:"【無料】貴社のAI検索対策 診断レポートをお送りします",
    body:"{{company}}様\n\n突然のご連絡失礼いたします。\nBeginAI の {{sender}} と申します。\n\n貴社サイトを拝見し、AI検索（ChatGPT / Perplexity等）からの集客について改善余地がある可能性を発見いたしました。\n\n【貴社の課題（自動検出）】\n{{weaknesses}}\n\n現在、無料のAIO診断レポートを提供しております。\n貴社のAI検索可視性を数値で可視化し、具体的な改善アクションまでご提案します。\n\n▶ 診断レポートを受け取る: {{diagnosis_link}}\n\nお忙しいところ恐れ入りますが、ご検討いただけますと幸いです。",
    sent:0, opened:0, replied:0, converted:0 },
  { id:"t2", name:"競合比較データ訴求", subject:"貴社の競合はAI検索で先行しています — 無料データ共有",
    body:"{{company}}様\n\nBeginAI の {{sender}} です。\n\n{{industry}}業界のAI検索動向を分析したところ、貴社の競合他社がChatGPT / Perplexity 等のAI検索で既に言及されている一方、貴社はまだ十分な露出を確保できていない状況です。\n\n【現状スコア】\nLLMO対策スコア: {{llmo_score}} / 100（業界平均: 45）\n\n競合との差分データを無料でお送りできます。\nお手数ですが、下記よりお申込みください。\n\n▶ 無料レポート: {{diagnosis_link}}\n\n何卒よろしくお願いいたします。",
    sent:0, opened:0, replied:0, converted:0 },
  { id:"t3", name:"緊急性訴求（AI検索シフト）", subject:"AI検索利用者が527%増 — 貴社サイトは対応済みですか？",
    body:"{{company}}様\n\nBeginAI の {{sender}} です。\n\n2025年、AI検索（ChatGPT、Perplexity、Gemini）からのWebサイト流入が前年比527%増加しています。\n\nしかし、現時点で貴社サイトには以下の課題が見受けられます：\n{{weaknesses}}\n\n月額1万円から始められるAIO対策サービスで、AI検索からの集客を開始しませんか？\n\n▶ 30秒で無料診断: {{diagnosis_link}}\n\nご質問等ございましたらお気軽にご連絡ください。",
    sent:0, opened:0, replied:0, converted:0 },
];

// ============================================================
// MAIN
// ============================================================
export default function FormPilotAutoV2(){
  const[mt,setMt]=useState(false);
  const[view,setView]=useState("pipeline");
  const[sidebarOpen,setSidebarOpen]=useState(false);
  const mob=useIsMobile();
  const[leads,setLeads]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showAddModal,setShowAddModal]=useState(false);

  // DB からリード読み込み
  const fetchLeads=useCallback(async()=>{
    try{
      const res=await fetch("/api/pipeline-leads");
      const json=await res.json();
      if(json.leads)setLeads(json.leads);
    }catch(e){console.error("fetchLeads error:",e);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{fetchLeads();},[fetchLeads]);

  // CRUD: 更新（楽観的更新）
  const updateLead=useCallback(async(id,updates)=>{
    setLeads(p=>p.map(l=>l.id===id?{...l,...updates}:l));
    try{
      await fetch("/api/pipeline-leads",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,...updates})});
    }catch(e){console.error("updateLead error:",e);fetchLeads();}
  },[fetchLeads]);

  // CRUD: 削除（楽観的更新）
  const deleteLead=useCallback(async(id)=>{
    setLeads(p=>p.filter(l=>l.id!==id));
    try{
      await fetch("/api/pipeline-leads",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    }catch(e){console.error("deleteLead error:",e);fetchLeads();}
  },[fetchLeads]);

  // CRUD: 追加
  const addLead=useCallback(async(leadData)=>{
    try{
      const res=await fetch("/api/pipeline-leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(leadData)});
      const json=await res.json();
      if(json.lead){setLeads(p=>[json.lead,...p]);return true;}
      return false;
    }catch(e){console.error("addLead error:",e);return false;}
  },[]);

  const[templates,setTemplates]=useState(()=>{
    const t=[...TEMPLATES];
    // Simulate historical performance
    t[0].sent=52;t[0].opened=31;t[0].replied=8;t[0].converted=4;
    t[1].sent=38;t[1].opened=19;t[1].replied=5;t[1].converted=2;
    t[2].sent=45;t[2].opened=28;t[2].replied=7;t[2].converted=3;
    return t;
  });

  const[autoConfig,setAutoConfig]=useState({
    scanEnabled:true,scanInterval:24,
    scanIndustries:["IT・SaaS","製造業","EC"],scanRegions:["東京","大阪"],
    batchSize:20,autoFormScan:true,autoSendEnabled:true,
    sendThreshold:10,sendTime:"10:00",sendDays:["TUE","WED","THU"],
    llmoScoreMax:30,
    lastScanAt:new Date(Date.now()-3*36e5).toISOString(),
    nextScanAt:(()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(20,45,0,0);return d.toISOString();})(),totalScans:47,
    // NEW configs
    aiScoreMinForPriority:70,
    autoFollowUp:true,followUpInterval:3,followUpMaxCount:3,
    autoDiagnosis:true, // auto-attach free report
    abTestEnabled:true, // round-robin A/B templates
    warmAlerts:true, // notifications for high-score leads
  });

  const[log,setLog]=useState([
    {t:new Date(Date.now()-36e5).toISOString(),msg:"定期スキャン完了: 18件の新規リード発見",type:"scan"},
    {t:new Date(Date.now()-2*36e5).toISOString(),msg:"フォーム探索: 12件でフォームURL発見",type:"form"},
    {t:new Date(Date.now()-3*36e5).toISOString(),msg:"自動送信: 10件のフォームに営業メール送信完了",type:"send"},
    {t:new Date(Date.now()-12*36e5).toISOString(),msg:"返信受信: テックソリューションズ様から返信",type:"reply"},
    {t:new Date(Date.now()-24*36e5).toISOString(),msg:"新規顧客: デジタルラボ様がStripe決済完了",type:"customer"},
  ]);

  const[searchQ,setSearchQ]=useState("");
  const[filterPhase,setFilterPhase]=useState("all");
  const[filterIndustry,setFilterIndustry]=useState("all");
  const[scanRunning,setScanRunning]=useState(false);
  const[page,setPage]=useState(0);
  const[selectedLead,setSelectedLead]=useState(null);
  const PP=25;
  useEffect(()=>{setMt(true)},[]);

  const kpi=useMemo(()=>{
    const t=leads.length;
    const ff=leads.filter(l=>l.formUrl).length;
    const sent=leads.filter(l=>["sent","replied","customer"].includes(l.phase)).length;
    const replied=leads.filter(l=>["replied","customer"].includes(l.phase)).length;
    const cust=leads.filter(l=>l.phase==="customer").length;
    const mrr=leads.reduce((a,l)=>a+l.mrr,0);
    const hotLeads=leads.filter(l=>l.aiScore>=autoConfig.aiScoreMinForPriority).length;
    const withDiag=leads.filter(l=>l.diagnosisSent).length;
    const followedUp=leads.filter(l=>l.followUpCount>0).length;
    const opened=leads.filter(l=>l.openedEmail&&l.phase!=="discovered"&&l.phase!=="form_found").length;
    const sentCount=leads.filter(l=>l.sentAt).length;
    return{t,ff,sent,replied,cust,mrr,hotLeads,withDiag,followedUp,opened,sentCount,
      formRate:t?(ff/t*100).toFixed(1):"0",
      replyRate:sent?(replied/sent*100).toFixed(1):"0",
      convRate:sent?(cust/sent*100).toFixed(1):"0",
      openRate:sentCount?(opened/sentCount*100).toFixed(1):"0",
    };
  },[leads,autoConfig]);

  const filtered=useMemo(()=>{
    let l=leads;
    if(filterPhase!=="all")l=l.filter(x=>x.phase===filterPhase);
    if(filterIndustry!=="all")l=l.filter(x=>x.industry===filterIndustry);
    if(searchQ){const q=searchQ.toLowerCase();l=l.filter(x=>x.company.toLowerCase().includes(q)||x.url.includes(q));}
    return l;
  },[leads,filterPhase,filterIndustry,searchQ]);
  const paged=filtered.slice(page*PP,(page+1)*PP);
  const tp=Math.ceil(filtered.length/PP);

  // Win/Loss analysis
  const winLoss=useMemo(()=>{
    const byIndustry={};
    INDUSTRIES.forEach(i=>{
      const ind=leads.filter(l=>l.industry===i);
      const sent=ind.filter(l=>["sent","replied","customer"].includes(l.phase)).length;
      const won=ind.filter(l=>l.phase==="customer").length;
      byIndustry[i]={total:ind.length,sent,won,rate:sent?(won/sent*100).toFixed(1):"0"};
    });
    const byTemplate={};
    templates.forEach(t=>{
      byTemplate[t.id]={name:t.name,sent:t.sent,opened:t.opened,replied:t.replied,converted:t.converted,
        openRate:t.sent?(t.opened/t.sent*100).toFixed(1):"0",
        replyRate:t.sent?(t.replied/t.sent*100).toFixed(1):"0",
        convRate:t.sent?(t.converted/t.sent*100).toFixed(1):"0",
      };
    });
    const bySize={};
    COMPANY_SIZES.forEach(s=>{
      const sz=leads.filter(l=>l.companySize===s);
      const sent=sz.filter(l=>["sent","replied","customer"].includes(l.phase)).length;
      const won=sz.filter(l=>l.phase==="customer").length;
      bySize[s]={total:sz.length,sent,won,rate:sent?(won/sent*100).toFixed(1):"0"};
    });
    return{byIndustry,byTemplate,bySize};
  },[leads,templates]);

  // Phase 1: runScan はシミュレーションのみ（API連携は将来実装）
  const runScan=useCallback(()=>{
    setScanRunning(true);
    setTimeout(()=>{
      setLog(p=>[{t:new Date().toISOString(),msg:`🔄 スキャン完了（シミュレーション）: LLMO調査機能は将来実装予定`,type:"scan"},...p]);
      setAutoConfig(p=>({...p,lastScanAt:new Date().toISOString(),nextScanAt:new Date(Date.now()+p.scanInterval*36e5).toISOString(),totalScans:p.totalScans+1}));
      setScanRunning(false);
    },1800);
  },[autoConfig]);

  // Phase 1: autoSend はDB永続化対応（各リードをupdateLeadで更新）
  const autoSend=useCallback(()=>{
    const ready=leads.filter(l=>l.phase==="form_found").sort((a,b)=>b.aiScore-a.aiScore).slice(0,autoConfig.sendThreshold);
    if(!ready.length)return;
    const tIds=templates.map(t=>t.id);
    ready.forEach((r,idx)=>{
      const tpl=autoConfig.abTestEnabled?tIds[idx%tIds.length]:tIds[0];
      updateLead(r.id,{phase:"sent",sentAt:new Date().toISOString(),templateUsed:tpl,diagnosisSent:autoConfig.autoDiagnosis});
    });
    if(autoConfig.abTestEnabled){
      setTemplates(p=>p.map((t,i)=>{const c=ready.filter((_,j)=>j%tIds.length===i).length;return{...t,sent:t.sent+c};}));
    }
    setLog(p=>[{t:new Date().toISOString(),msg:`📨 AIスコア優先で${ready.length}件送信${autoConfig.autoDiagnosis?" + 診断レポート添付":""}`,type:"send"},...p]);
  },[leads,autoConfig,templates,updateLead]);

  const nav=[
    {id:"pipeline",icon:ic.activity,label:"パイプライン"},
    {id:"leads",icon:ic.radar,label:"リード一覧"},
    {id:"automation",icon:ic.zap,label:"自動化設定"},
    {id:"customers",icon:ic.dollar,label:"顧客・収益"},
  ];
  return(
    <div style={{height:"100vh",display:"flex",background:C.bg,color:C.tx,fontFamily:"'Geist','Noto Sans JP',system-ui,sans-serif",opacity:mt?1:0,transition:"opacity .4s",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700;800&display=swap');
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes p5{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fi .25s ease-out}.rh:hover{background:${C.ca}!important}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${C.bdr};border-radius:3px}
        input,select,textarea{font-family:inherit}
      `}</style>

      {/* Mobile sidebar overlay */}
      {mob&&sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:60}}/>}

      {/* SIDEBAR */}
      <aside style={{
        width:200,flexShrink:0,background:C.sf,borderRight:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",
        ...(mob?{position:"fixed",left:sidebarOpen?0:-220,top:0,bottom:0,zIndex:61,transition:"left .25s ease"}:{}),
      }}>
        <div style={{padding:"13px 11px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:28,height:28,borderRadius:5,background:`linear-gradient(135deg,${C.acc},${C.accDk})`,display:"flex",alignItems:"center",justifyContent:"center"}}><I d={ic.zap} s={13} c={C.bg}/></div>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:C.acc,letterSpacing:-.3}}>FormPilot</div>
            <div style={{fontSize:7,color:C.dim,letterSpacing:1.2,fontWeight:700}}>AUTONOMOUS FULL AUTO</div>
          </div>
          {mob&&<button onClick={()=>setSidebarOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",color:C.sub,fontSize:18,cursor:"pointer"}}>✕</button>}
        </div>
        <nav style={{flex:1,padding:"6px 4px",overflow:"auto"}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>{setView(n.id);setPage(0);setSelectedLead(null);if(mob)setSidebarOpen(false);}} style={{
              width:"100%",padding:"7px 9px",borderRadius:4,border:"none",
              background:view===n.id?C.accGl:"transparent",color:view===n.id?C.acc:C.sub,
              fontSize:10.5,fontWeight:view===n.id?700:400,fontFamily:"inherit",cursor:"pointer",
              display:"flex",alignItems:"center",gap:7,marginBottom:1,textAlign:"left",
            }}><I d={n.icon} s={13} c={view===n.id?C.acc:C.dim}/>{n.label}</button>
          ))}
        </nav>
        <div style={{padding:"9px 11px",borderTop:`1px solid ${C.bdr}`,fontSize:10}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:autoConfig.scanEnabled?C.g:C.r,animation:autoConfig.scanEnabled?"p5 2s infinite":"none"}}/>
            <span style={{fontWeight:700,color:autoConfig.scanEnabled?C.g:C.r,fontSize:10}}>{autoConfig.scanEnabled?"自動運転中":"停止中"}</span>
          </div>
          <div style={{fontSize:9,color:C.dim,marginBottom:8}}>次回スキャン: {new Date(autoConfig.nextScanAt).toLocaleString("ja-JP",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
          <div style={{padding:"7px 9px",borderRadius:4,background:C.accGl,marginTop:6}}>
            <div style={{fontSize:8,color:C.acc,fontWeight:700}}>MRR</div>
            <div style={{fontSize:16,fontWeight:800,color:C.g,fontFamily:"'Geist Mono',monospace"}}>¥{kpi.mrr.toLocaleString()}</div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
        <header style={{padding:mob?"9px 12px":"9px 18px",borderBottom:`1px solid ${C.bdr}`,background:C.bg2,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {mob&&<button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:C.tx,fontSize:18,cursor:"pointer",padding:2}}>☰</button>}
            <h1 style={{fontSize:13,fontWeight:700,margin:0}}>{nav.find(n=>n.id===view)?.label}</h1>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {view==="leads"&&<>
              <button onClick={()=>setShowAddModal(true)} style={{padding:"5px 11px",borderRadius:4,border:"none",background:C.g,color:C.bg,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                + リード追加
              </button>
              <button onClick={runScan} disabled={scanRunning} style={{padding:"5px 11px",borderRadius:4,border:"none",background:C.acc,color:C.bg,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,opacity:scanRunning?.5:1}}>
                {scanRunning?"⟳ スキャン中...":<><I d={ic.radar} s={11} c={C.bg}/>LLMO調査</>}
              </button>
              <button onClick={autoSend} style={{padding:"5px 11px",borderRadius:4,border:`1px solid ${C.bdr}`,background:"transparent",color:C.tx,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                <I d={ic.send} s={11} c={C.p}/>AIスコア順送信
              </button>
            </>}
            <div style={{padding:"4px 8px",borderRadius:3,background:C.gB,color:C.g,fontSize:9,fontWeight:700}}>{loading?"読込中...":leads.length+" リード"}</div>
          </div>
        </header>

        <div style={{flex:1,overflow:"auto",padding:mob?10:16}}>

          {/* ===== LOADING ===== */}
          {loading&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:12}}>
              <div style={{width:32,height:32,border:`3px solid ${C.bdr}`,borderTop:`3px solid ${C.acc}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
              <div style={{fontSize:12,color:C.sub}}>リードを読み込み中...</div>
            </div>
          )}

          {/* ===== PIPELINE ===== */}
          {!loading&&view==="pipeline"&&(
            <div className="fi">
              <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>自動営業パイプライン</div>
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(3,1fr)":"repeat(6,1fr)",gap:5,marginBottom:20}}>
                {[
                  {label:"LLMO未対策企業発見",count:leads.filter(l=>l.phase==="discovered").length,color:C.cy,icon:ic.radar},
                  {label:"フォーム自動発見",count:leads.filter(l=>l.phase==="form_found").length,color:C.b,icon:ic.link},
                  {label:"送信待機中",count:leads.filter(l=>l.phase==="queued").length,color:C.o,icon:ic.clock},
                  {label:"営業メール送信済",count:leads.filter(l=>["sent"].includes(l.phase)).length,color:C.p,icon:ic.send},
                  {label:"返信受信",count:leads.filter(l=>l.phase==="replied").length,color:C.acc,icon:ic.check},
                  {label:"有料顧客",count:leads.filter(l=>l.phase==="customer").length,color:C.g,icon:ic.dollar},
                ].map((s,i)=>(
                  <div key={i} style={{background:C.card,borderRadius:7,padding:"12px 10px",border:`1px solid ${C.bdr}`,textAlign:"center",position:"relative"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:s.color,opacity:.5}}/>
                    <div style={{width:26,height:26,borderRadius:5,background:`${s.color}10`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px"}}><I d={s.icon} s={12} c={s.color}/></div>
                    <div style={{fontSize:20,fontWeight:800,color:s.color,fontFamily:"'Geist Mono',monospace"}}>{s.count}</div>
                    <div style={{fontSize:8,color:C.dim,marginTop:3,lineHeight:1.3}}>{s.label}</div>
                    {i<5&&<div style={{position:"absolute",right:-7,top:"50%",transform:"translateY(-50%)",color:C.dim,fontSize:10,zIndex:1}}>→</div>}
                  </div>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(5,1fr)",gap:8,marginBottom:20}}>
                <KPI icon={ic.radar} ic={C.b} label="総リード数" val={kpi.t.toString()} sub={`累計${autoConfig.totalScans}回スキャン`} trend={18} good/>
                <KPI icon={ic.send} ic={C.p} label="送信完了" val={kpi.sent.toString()} sub={`フォーム発見率 ${kpi.formRate}%`}/>
                <KPI icon={ic.check} ic={C.g} label="返信率" val={`${kpi.replyRate}%`} sub={`${kpi.replied}件返信`} trend={5} good/>
                <KPI icon={ic.dollar} ic={C.acc} label="成約率" val={`${kpi.convRate}%`} sub="送信→顧客"/>
                <KPI icon={ic.dollar} ic={C.g} label="MRR" val={`¥${kpi.mrr.toLocaleString()}`} sub={`${kpi.cust}社 × ¥10,000`} trend={22} good/>
              </div>

              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:16}}>
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>アクティビティログ</div>
                  <div style={{maxHeight:220,overflow:"auto"}}>
                    {log.map((l,i)=>(
                      <div key={i} style={{padding:"8px 0",borderBottom:i<log.length-1?`1px solid ${C.bdr}`:"none",display:"flex",gap:10,alignItems:"flex-start"}}>
                        <span style={{fontSize:9,color:C.dim,fontFamily:"'Geist Mono',monospace",flexShrink:0}}>{new Date(l.t).toLocaleString("ja-JP",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                        <span style={{fontSize:10,color:l.type==="customer"?C.g:l.type==="reply"?C.acc:l.type==="send"?C.p:l.type==="form"?C.b:C.sub,lineHeight:1.5}}>{l.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>自動化ステータス</div>
                  {[
                    {l:"LLMO調査",d:`${autoConfig.scanInterval}時間ごと・${autoConfig.batchSize}件/回`,on:autoConfig.scanEnabled,key:"scanEnabled"},
                    {l:"フォーム自動探索",d:"発見次第即実行",on:autoConfig.autoFormScan,key:"autoFormScan"},
                    {l:"自動送信",d:`${autoConfig.sendThreshold}件蓄積で自動送信・${autoConfig.sendTime}`,on:autoConfig.autoSendEnabled,key:"autoSendEnabled"},
                  ].map((s,i)=>(
                    <div key={s.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<2?`1px solid ${C.bdr}`:"none"}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:600}}>{s.l}</div>
                        <div style={{fontSize:9,color:C.dim}}>{s.d}</div>
                      </div>
                      <button onClick={()=>setAutoConfig(p=>({...p,[s.key]:!p[s.key]}))} style={{padding:"4px 10px",borderRadius:4,border:"none",background:s.on?C.gB:C.rB,color:s.on?C.g:C.r,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{s.on?"ON":"OFF"}</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`,maxWidth:400}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Stripe 収益サマリー</div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:10,color:C.sub}}>契約中</span>
                  <span style={{fontSize:18,fontWeight:800,fontFamily:"'Geist Mono',monospace",color:C.g}}>{kpi.cust}社 ¥{kpi.mrr.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* ===== LEADS ===== */}
          {!loading&&view==="leads"&&!selectedLead&&(
            <div className="fi">
              <div style={{display:"flex",gap:5,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{position:"relative",flex:"0 0 180px"}}>
                  <input value={searchQ} onChange={e=>{setSearchQ(e.target.value);setPage(0);}} placeholder="検索..." style={{width:"100%",padding:"6px 9px 6px 26px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.card,color:C.tx,fontSize:10,outline:"none",boxSizing:"border-box"}}/>
                  <div style={{position:"absolute",left:7,top:7}}><I d={ic.search} s={11} c={C.dim}/></div>
                </div>
                {["all","discovered","form_found","queued","sent","replied","customer"].map(f=>(
                  <button key={f} onClick={()=>{setFilterPhase(f);setPage(0);}} style={{padding:"4px 9px",borderRadius:3,border:`1px solid ${filterPhase===f?C.acc+"40":"transparent"}`,background:filterPhase===f?C.accGl:"transparent",color:filterPhase===f?C.acc:C.dim,fontSize:9,fontWeight:filterPhase===f?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                    {f==="all"?"全件":{discovered:"発見",form_found:"フォーム済",queued:"送信待",sent:"送信済",replied:"返信有",customer:"顧客"}[f]}
                  </button>
                ))}
                <select value={filterIndustry} onChange={e=>{setFilterIndustry(e.target.value);setPage(0);}} style={{padding:"4px 7px",borderRadius:3,border:`1px solid ${C.bdr}`,background:C.card,color:C.tx,fontSize:9,outline:"none"}}>
                  <option value="all">全業種</option>{INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
                </select>
                <div style={{flex:1}}/><span style={{fontSize:9,color:C.dim}}>{filtered.length}件</span>
              </div>

              <div style={{background:C.card,borderRadius:6,border:`1px solid ${C.bdr}`,overflow:mob?"auto":"hidden",WebkitOverflowScrolling:"touch"}}>
                <div style={{display:"grid",gridTemplateColumns:"35px 1.2fr 1.4fr 50px 40px 45px 40px 40px 75px",padding:"6px 10px",fontSize:8,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:.4,borderBottom:`1px solid ${C.bdr}`,background:C.ca,minWidth:mob?600:undefined}}>
                  <span>AI</span><span>会社名</span><span>URL</span><span>業種</span><span>規模</span><span>フェーズ</span><span>開封</span><span>FU</span><span>操作</span>
                </div>
                {paged.map(l=>(
                  <div key={l.id} className="rh" onClick={()=>setSelectedLead(l)} style={{display:"grid",gridTemplateColumns:"35px 1.2fr 1.4fr 50px 40px 45px 40px 40px 75px",padding:"7px 10px",borderBottom:`1px solid ${C.bdr}`,alignItems:"center",fontSize:10,cursor:"pointer",minWidth:mob?600:undefined}}>
                    <ScoreBadge score={l.aiScore}/>
                    <span style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</span>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontSize:8,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.url}</span>
                    <span style={{fontSize:8,color:C.sub}}>{l.industry.slice(0,4)}</span>
                    <span style={{fontSize:8,color:C.dim}}>{l.companySize.slice(0,4)}</span>
                    <Phase p={l.phase}/>
                    <span style={{fontSize:9}}>{l.openedEmail&&l.sentAt?"👁":"—"}</span>
                    <span style={{fontSize:9,color:l.followUpCount?C.pk:C.dim}}>{l.followUpCount||"—"}</span>
                    <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
                      {l.phase==="discovered"&&<button onClick={()=>updateLead(l.id,{formUrl:l.url+"/contact",phase:"form_found"})} style={{padding:"2px 5px",borderRadius:2,border:`1px solid ${C.bdr}`,background:"transparent",color:C.b,fontSize:8,cursor:"pointer",fontFamily:"inherit"}}>探索</button>}
                      {l.phase==="form_found"&&<button onClick={()=>updateLead(l.id,{phase:"queued",scheduledAt:new Date(Date.now()+864e5).toISOString()})} style={{padding:"2px 5px",borderRadius:2,border:`1px solid ${C.bdr}`,background:"transparent",color:C.o,fontSize:8,cursor:"pointer",fontFamily:"inherit"}}>予約</button>}
                      <button onClick={()=>deleteLead(l.id)} style={{padding:"2px 4px",borderRadius:2,border:"none",background:"transparent",color:C.dim,fontSize:8,cursor:"pointer"}}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              {tp>1&&<div style={{display:"flex",justifyContent:"center",gap:4,marginTop:8}}>
                <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{padding:"3px 7px",borderRadius:3,border:`1px solid ${C.bdr}`,background:"transparent",color:page===0?C.dim:C.tx,fontSize:9,cursor:page===0?"default":"pointer",fontFamily:"inherit"}}>←</button>
                <span style={{fontSize:9,color:C.sub,padding:"0 6px"}}>{page+1}/{tp}</span>
                <button onClick={()=>setPage(p=>Math.min(tp-1,p+1))} disabled={page>=tp-1} style={{padding:"3px 7px",borderRadius:3,border:`1px solid ${C.bdr}`,background:"transparent",color:page>=tp-1?C.dim:C.tx,fontSize:9,cursor:page>=tp-1?"default":"pointer",fontFamily:"inherit"}}>→</button>
              </div>}
            </div>
          )}

          {/* Lead Detail */}
          {!loading&&view==="leads"&&selectedLead&&(
            <div className="fi">
              <button onClick={()=>setSelectedLead(null)} style={{padding:"5px 10px",borderRadius:4,border:`1px solid ${C.bdr}`,background:"transparent",color:C.sub,fontSize:10,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>← 一覧に戻る</button>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
                <div style={{background:C.card,borderRadius:8,padding:mob?14:18,border:`1px solid ${C.bdr}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:800}}>{selectedLead.company}</div>
                      <div style={{fontSize:10,color:C.sub,marginTop:2}}>{selectedLead.url}</div>
                    </div>
                    <ScoreBadge score={selectedLead.aiScore}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[
                      {l:"業種",v:selectedLead.industry},{l:"地域",v:selectedLead.region},
                      {l:"企業規模",v:selectedLead.companySize},{l:"推定売上",v:selectedLead.revenue},
                      {l:"LLMOスコア",v:`${selectedLead.llmoScore}/100`},{l:"広告出稿",v:selectedLead.hasAdSpend?"あり":"なし"},
                      {l:"フェーズ",v:selectedLead.phase},{l:"フォローアップ",v:`${selectedLead.followUpCount}回`},
                    ].map((r,i)=>(
                      <div key={i} style={{padding:"6px 8px",borderRadius:4,background:C.ca}}>
                        <div style={{fontSize:8,color:C.dim,fontWeight:600}}>{r.l}</div>
                        <div style={{fontSize:11,fontWeight:600,marginTop:2}}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:C.card,borderRadius:8,padding:18,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>⚠️ LLMO弱点分析</div>
                  {selectedLead.weaknesses.map((w,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.bdr}`}}>
                      <span style={{color:C.r,fontSize:12}}>✕</span>
                      <span style={{fontSize:11}}>{w}</span>
                    </div>
                  ))}
                  <div style={{marginTop:12,padding:"10px 12px",borderRadius:5,background:C.accGl,border:`1px solid ${C.acc}15`}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.acc,marginBottom:4}}>💡 AIパーソナライズ文案プレビュー</div>
                    <div style={{fontSize:9,color:C.sub,lineHeight:1.6}}>
                      「{selectedLead.company}様のサイトを分析した結果、{selectedLead.weaknesses.slice(0,2).join("、")} など{selectedLead.weaknesses.length}件の改善点を発見しました。AI検索での露出を改善し、新規顧客獲得につなげませんか？」
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== A/B TEST ===== */}
          {view==="abtest"&&(
            <div className="fi">
              <div style={{fontSize:10,fontWeight:700,color:C.sub,marginBottom:8}}>📧 テンプレート別パフォーマンス</div>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:10,marginBottom:18}}>
                {templates.map((t,i)=>{
                  const bt=winLoss.byTemplate[t.id];
                  const isTop=templates.every(x=>winLoss.byTemplate[x.id]?parseFloat(winLoss.byTemplate[x.id].convRate)<=parseFloat(bt.convRate):true);
                  return(
                    <div key={t.id} style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${isTop?C.g+"40":C.bdr}`,position:"relative"}}>
                      {isTop&&<div style={{position:"absolute",top:8,right:8,fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:C.gB,color:C.g}}>🏆 BEST</div>}
                      <div style={{fontSize:9,color:C.dim,fontWeight:700,marginBottom:2}}>テンプレート {String.fromCharCode(65+i)}</div>
                      <div style={{fontSize:11,fontWeight:700,marginBottom:10}}>{t.name}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        {[
                          {l:"送信数",v:bt.sent,c:C.tx},
                          {l:"開封率",v:bt.openRate+"%",c:C.b},
                          {l:"返信率",v:bt.replyRate+"%",c:C.acc},
                          {l:"成約率",v:bt.convRate+"%",c:C.g},
                        ].map((m,j)=>(
                          <div key={j} style={{padding:"6px 8px",borderRadius:4,background:C.ca}}>
                            <div style={{fontSize:8,color:C.dim}}>{m.l}</div>
                            <div style={{fontSize:14,fontWeight:800,fontFamily:"'Geist Mono',monospace",color:m.c}}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{marginTop:10,padding:8,borderRadius:4,background:C.bg,maxHeight:100,overflow:"auto"}}>
                        <div style={{fontSize:8,color:C.dim,fontWeight:600,marginBottom:3}}>件名</div>
                        <div style={{fontSize:9,color:C.acc,lineHeight:1.4}}>{t.subject}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                <div style={{fontSize:11,fontWeight:700,marginBottom:8}}>🔀 A/Bテスト設定</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0"}}>
                  <div><div style={{fontSize:11,fontWeight:600}}>ラウンドロビンA/B/Cテスト</div><div style={{fontSize:9,color:C.dim}}>送信時にテンプレートを均等に自動振り分け</div></div>
                  <button onClick={()=>setAutoConfig(p=>({...p,abTestEnabled:!p.abTestEnabled}))} style={{padding:"5px 12px",borderRadius:4,border:"none",background:autoConfig.abTestEnabled?C.gB:C.rB,color:autoConfig.abTestEnabled?C.g:C.r,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.abTestEnabled?"ON":"OFF"}</button>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderTop:`1px solid ${C.bdr}`}}>
                  <div><div style={{fontSize:11,fontWeight:600}}>無料診断レポート自動添付</div><div style={{fontSize:9,color:C.dim}}>LLMOスコア＋弱点リストのPDFを生成して添付</div></div>
                  <button onClick={()=>setAutoConfig(p=>({...p,autoDiagnosis:!p.autoDiagnosis}))} style={{padding:"5px 12px",borderRadius:4,border:"none",background:autoConfig.autoDiagnosis?C.gB:C.rB,color:autoConfig.autoDiagnosis?C.g:C.r,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.autoDiagnosis?"ON":"OFF"}</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== FOLLOW-UP ===== */}
          {view==="followup"&&(
            <div className="fi">
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:16}}>
                <KPI icon={ic.repeat} ic={C.pk} label="フォローアップ済" val={kpi.followedUp.toString()} sub="自動追客"/>
                <KPI icon={ic.send} ic={C.p} label="未返信（送信済）" val={leads.filter(l=>l.phase==="sent").length.toString()} sub="フォロー対象"/>
                <KPI icon={ic.check} ic={C.g} label="FU後返信" val={leads.filter(l=>l.followUpCount>0&&l.phase==="replied").length.toString()} sub="追客効果"/>
                <KPI icon={ic.clock} ic={C.o} label="次回FU予定" val={leads.filter(l=>l.followUpScheduled).length.toString()}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700}}>🔁 自動フォローアップ設定</div>
                    <button onClick={()=>setAutoConfig(p=>({...p,autoFollowUp:!p.autoFollowUp}))} style={{padding:"5px 12px",borderRadius:4,border:"none",background:autoConfig.autoFollowUp?C.gB:C.rB,color:autoConfig.autoFollowUp?C.g:C.r,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.autoFollowUp?"ON":"OFF"}</button>
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:10,color:C.sub,fontWeight:600,display:"block",marginBottom:4}}>フォローアップ間隔（日）</label>
                    <select value={autoConfig.followUpInterval} onChange={e=>setAutoConfig(p=>({...p,followUpInterval:+e.target.value}))} style={{width:"100%",padding:"8px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:11,outline:"none"}}>
                      {[2,3,5,7,10,14].map(d=><option key={d} value={d}>{d}日後</option>)}
                    </select>
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:10,color:C.sub,fontWeight:600,display:"block",marginBottom:4}}>最大フォローアップ回数</label>
                    <select value={autoConfig.followUpMaxCount} onChange={e=>setAutoConfig(p=>({...p,followUpMaxCount:+e.target.value}))} style={{width:"100%",padding:"8px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:11,outline:"none"}}>
                      {[1,2,3,4,5].map(n=><option key={n} value={n}>最大{n}回</option>)}
                    </select>
                  </div>
                  <div style={{padding:10,borderRadius:5,background:C.pB,border:`1px solid ${C.pk}15`}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.pk,marginBottom:6}}>フォローアップ戦略</div>
                    {[
                      {n:1,desc:"初回送信から3日後: 開封確認 + 追加価値提案",delay:"3日後"},
                      {n:2,desc:"2回目から5日後: 業界事例の共有",delay:"8日後"},
                      {n:3,desc:"3回目から7日後: 最終案内 + 期間限定オファー",delay:"15日後"},
                    ].map((f,i)=>(
                      <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"5px 0",borderBottom:i<2?`1px solid ${C.pk}10`:"none"}}>
                        <span style={{fontSize:9,fontWeight:800,color:C.pk,width:14,flexShrink:0}}>#{f.n}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:9,color:C.tx,lineHeight:1.4}}>{f.desc}</div>
                          <div style={{fontSize:8,color:C.dim}}>初回から{f.delay}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>📋 フォロー対象リスト</div>
                  {leads.filter(l=>l.phase==="sent"&&l.followUpCount<autoConfig.followUpMaxCount).sort((a,b)=>b.aiScore-a.aiScore).slice(0,10).map((l,i)=>(
                    <div key={l.id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 0",borderBottom:`1px solid ${C.bdr}`}}>
                      <ScoreBadge score={l.aiScore}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</div>
                        <div style={{fontSize:8,color:C.dim}}>FU {l.followUpCount}/{autoConfig.followUpMaxCount}回 · {l.openedEmail?"開封済":"未開封"}</div>
                      </div>
                      <button onClick={()=>updateLead(l.id,{followUpCount:l.followUpCount+1})} style={{padding:"3px 7px",borderRadius:3,border:`1px solid ${C.pk}40`,background:C.pkB,color:C.pk,fontSize:8,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>FU送信</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== ANALYSIS ===== */}
          {view==="analysis"&&(
            <div className="fi">
              <div style={{fontSize:10,fontWeight:700,color:C.sub,marginBottom:8}}>📊 Win/Loss 分析 — どの条件で契約が取れるか</div>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:14}}>
                {/* By Industry */}
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:11,fontWeight:700,marginBottom:10}}>業種別 成約率</div>
                  {Object.entries(winLoss.byIndustry).sort((a,b)=>parseFloat(b[1].rate)-parseFloat(a[1].rate)).map(([ind,d],i)=>(
                    <div key={ind} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.bdr}`}}>
                      <span style={{fontSize:10,width:60,flexShrink:0}}>{ind}</span>
                      <div style={{flex:1,height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${Math.max(parseFloat(d.rate),2)}%`,height:"100%",background:parseFloat(d.rate)>=10?C.g:parseFloat(d.rate)>=5?C.acc:C.o,borderRadius:3,opacity:.7}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:parseFloat(d.rate)>=10?C.g:C.acc,width:40,textAlign:"right"}}>{d.rate}%</span>
                      <span style={{fontSize:8,color:C.dim,width:45}}>{d.won}/{d.sent}件</span>
                    </div>
                  ))}
                </div>
                {/* By Company Size */}
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:11,fontWeight:700,marginBottom:10}}>企業規模別 成約率</div>
                  {Object.entries(winLoss.bySize).sort((a,b)=>parseFloat(b[1].rate)-parseFloat(a[1].rate)).map(([sz,d],i)=>(
                    <div key={sz} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.bdr}`}}>
                      <span style={{fontSize:10,width:65,flexShrink:0}}>{sz}</span>
                      <div style={{flex:1,height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${Math.max(parseFloat(d.rate),2)}%`,height:"100%",background:parseFloat(d.rate)>=10?C.g:parseFloat(d.rate)>=5?C.acc:C.o,borderRadius:3,opacity:.7}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:parseFloat(d.rate)>=10?C.g:C.acc,width:40,textAlign:"right"}}>{d.rate}%</span>
                      <span style={{fontSize:8,color:C.dim,width:45}}>{d.won}/{d.sent}件</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Template performance */}
              <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                <div style={{fontSize:11,fontWeight:700,marginBottom:10}}>📧 テンプレート別ファネル分析</div>
                <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:10}}>
                  {templates.map((t,i)=>{
                    const bt=winLoss.byTemplate[t.id];
                    return(
                      <div key={t.id} style={{padding:12,borderRadius:6,background:C.ca,border:`1px solid ${C.bdr}`}}>
                        <div style={{fontSize:10,fontWeight:700,marginBottom:8}}>テンプレート {String.fromCharCode(65+i)}</div>
                        {[
                          {l:"送信",v:bt.sent,w:100,c:C.p},
                          {l:"開封",v:bt.opened,w:bt.sent?bt.opened/bt.sent*100:0,c:C.b},
                          {l:"返信",v:bt.replied,w:bt.sent?bt.replied/bt.sent*100:0,c:C.acc},
                          {l:"成約",v:bt.converted,w:bt.sent?bt.converted/bt.sent*100:0,c:C.g},
                        ].map((s,j)=>(
                          <div key={j} style={{marginBottom:4}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:2}}>
                              <span style={{color:C.sub}}>{s.l}</span><span style={{fontWeight:700,fontFamily:"'Geist Mono',monospace",color:s.c}}>{s.v}</span>
                            </div>
                            <div style={{height:4,background:C.bg,borderRadius:2,overflow:"hidden"}}>
                              <div style={{width:`${Math.max(s.w,3)}%`,height:"100%",background:s.c,opacity:.6,borderRadius:2}}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== AUTOMATION CONFIG ===== */}
          {view==="automation"&&(
            <div className="fi">
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
                <div style={{background:C.card,borderRadius:8,padding:18,border:`1px solid ${C.bdr}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <h3 style={{fontSize:13,fontWeight:700,margin:0}}>🔬 LLMO調査</h3>
                    <button onClick={()=>setAutoConfig(p=>({...p,scanEnabled:!p.scanEnabled}))} style={{padding:"5px 10px",borderRadius:4,border:"none",background:autoConfig.scanEnabled?C.gB:C.rB,color:autoConfig.scanEnabled?C.g:C.r,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.scanEnabled?"ON":"OFF"}</button>
                  </div>
                  {[
                    {l:"スキャン間隔",opts:[6,12,24,48,72],val:autoConfig.scanInterval,key:"scanInterval",fmt:h=>`${h}h`},
                    {l:"取得件数/回",opts:[10,20,50,100],val:autoConfig.batchSize,key:"batchSize",fmt:n=>`${n}件`},
                  ].map(({l,opts,val,key,fmt})=>(
                    <div key={key} style={{marginBottom:10}}>
                      <label style={{fontSize:9,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>{l}</label>
                      <select value={val} onChange={e=>setAutoConfig(p=>({...p,[key]:+e.target.value}))} style={{width:"100%",padding:"7px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:11,outline:"none"}}>{opts.map(o=><option key={o} value={o}>{fmt(o)}</option>)}</select>
                    </div>
                  ))}
                  <div style={{marginBottom:10}}>
                    <label style={{fontSize:9,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>LLMOスコア上限</label>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <input type="range" min="10" max="60" value={autoConfig.llmoScoreMax} onChange={e=>setAutoConfig(p=>({...p,llmoScoreMax:+e.target.value}))} style={{flex:1}}/>
                      <span style={{fontSize:13,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:C.acc}}>{autoConfig.llmoScoreMax}</span>
                    </div>
                  </div>
                  <div style={{marginBottom:8}}>
                    <label style={{fontSize:9,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>対象業種</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{INDUSTRIES.map(i=>(
                      <button key={i} onClick={()=>setAutoConfig(p=>({...p,scanIndustries:p.scanIndustries.includes(i)?p.scanIndustries.filter(x=>x!==i):[...p.scanIndustries,i]}))} style={{padding:"3px 7px",borderRadius:3,fontSize:8,fontWeight:autoConfig.scanIndustries.includes(i)?700:400,border:`1px solid ${autoConfig.scanIndustries.includes(i)?C.acc+"40":C.bdr}`,background:autoConfig.scanIndustries.includes(i)?C.accGl:"transparent",color:autoConfig.scanIndustries.includes(i)?C.acc:C.dim,cursor:"pointer",fontFamily:"inherit"}}>{i}</button>
                    ))}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{background:C.card,borderRadius:8,padding:18,border:`1px solid ${C.bdr}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <h3 style={{fontSize:13,fontWeight:700,margin:0}}>📨 自動送信</h3>
                      <button onClick={()=>setAutoConfig(p=>({...p,autoSendEnabled:!p.autoSendEnabled}))} style={{padding:"5px 10px",borderRadius:4,border:"none",background:autoConfig.autoSendEnabled?C.gB:C.rB,color:autoConfig.autoSendEnabled?C.g:C.r,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.autoSendEnabled?"ON":"OFF"}</button>
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:9,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>送信トリガー</label>
                      <select value={autoConfig.sendThreshold} onChange={e=>setAutoConfig(p=>({...p,sendThreshold:+e.target.value}))} style={{width:"100%",padding:"7px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:11,outline:"none"}}>{[5,10,20,30,50].map(n=><option key={n} value={n}>{n}件蓄積で送信</option>)}</select>
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:9,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>AIスコア閾値（優先送信）</label>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <input type="range" min="50" max="95" value={autoConfig.aiScoreMinForPriority} onChange={e=>setAutoConfig(p=>({...p,aiScoreMinForPriority:+e.target.value}))} style={{flex:1}}/>
                        <span style={{fontSize:13,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:C.g}}>{autoConfig.aiScoreMinForPriority}</span>
                      </div>
                      <div style={{fontSize:8,color:C.dim,marginTop:2}}>このスコア以上を最優先で送信</div>
                    </div>
                  </div>
                  <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>🔄 自動化フロー全体</div>
                    {[
                      {s:"1",l:"LLMO未対策企業を定期発見",d:`${autoConfig.scanInterval}h · ${autoConfig.batchSize}件`,c:C.cy,on:autoConfig.scanEnabled},
                      {s:"2",l:"フォームURL自動探索",d:"発見後即実行",c:C.b,on:autoConfig.autoFormScan},
                      {s:"3",l:"AIスコアで優先度決定",d:`スコア${autoConfig.aiScoreMinForPriority}+を最優先`,c:C.acc,on:true},
                      {s:"4",l:"A/B/Cテンプレートで送信",d:"ラウンドロビン振分",c:C.p,on:autoConfig.abTestEnabled},
                      {s:"5",l:"無料診断レポート自動添付",d:"LLMO分析PDF",c:C.cy,on:autoConfig.autoDiagnosis},
                      {s:"6",l:"自動フォローアップ",d:`${autoConfig.followUpInterval}日間隔 · 最大${autoConfig.followUpMaxCount}回`,c:C.pk,on:autoConfig.autoFollowUp},
                      {s:"7",l:"ホットリードアラート",d:"高スコアリード即通知",c:C.r,on:autoConfig.warmAlerts},
                    ].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:i<6?`1px solid ${C.bdr}`:"none"}}>
                        <div style={{width:18,height:18,borderRadius:3,background:`${s.c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:s.c,flexShrink:0}}>{s.s}</div>
                        <div style={{flex:1}}><div style={{fontSize:10,fontWeight:600}}>{s.l}</div><div style={{fontSize:8,color:C.dim}}>{s.d}</div></div>
                        <span style={{fontSize:7,fontWeight:700,padding:"2px 6px",borderRadius:2,background:s.on?C.gB:C.rB,color:s.on?C.g:C.r}}>{s.on?"ON":"OFF"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== CUSTOMERS ===== */}
          {view==="customers"&&(
            <div className="fi">
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:16}}>
                <KPI icon={ic.dollar} ic={C.g} label="MRR" val={`¥${kpi.mrr.toLocaleString()}`} sub={`${kpi.cust}社`} trend={22} good/>
                <KPI icon={ic.users} ic={C.acc} label="ARR" val={`¥${(kpi.mrr*12).toLocaleString()}`}/>
                <KPI icon={ic.trending} ic={C.b} label="成約率" val={`${kpi.convRate}%`} sub="パイプライン全体"/>
                <KPI icon={ic.eye} ic={C.p} label="開封率" val={`${kpi.openRate}%`} sub="メール開封" trend={8} good/>
              </div>
              <div style={{background:C.card,borderRadius:7,border:`1px solid ${C.bdr}`,overflow:mob?"auto":"hidden",WebkitOverflowScrolling:"touch"}}>
                <div style={{display:"grid",gridTemplateColumns:"1.4fr 1.8fr 65px 60px 70px 70px",padding:"6px 10px",fontSize:8,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:.4,borderBottom:`1px solid ${C.bdr}`,background:C.ca,minWidth:mob?500:undefined}}>
                  <span>会社名</span><span>URL</span><span>Stripe</span><span>月額</span><span>業種</span><span>テンプレ</span>
                </div>
                {leads.filter(l=>l.stripeStatus).sort((a,b)=>({"active":0,"trialing":1,"past_due":2,"canceled":3}[a.stripeStatus]||9)-({"active":0,"trialing":1,"past_due":2,"canceled":3}[b.stripeStatus]||9)).map(l=>(
                  <div key={l.id} className="rh" style={{display:"grid",gridTemplateColumns:"1.4fr 1.8fr 65px 60px 70px 70px",padding:"8px 10px",borderBottom:`1px solid ${C.bdr}`,alignItems:"center",fontSize:10,minWidth:mob?500:undefined}}>
                    <span style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</span>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontSize:8,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.url}</span>
                    <StBadge s={l.stripeStatus}/>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontWeight:700,color:l.mrr?C.g:C.dim}}>{l.mrr?`¥${l.mrr.toLocaleString()}`:"—"}</span>
                    <span style={{fontSize:9,color:C.sub}}>{l.industry}</span>
                    <span style={{fontSize:8,color:C.dim}}>{l.templateUsed?`テンプレ${l.templateUsed==="t1"?"A":l.templateUsed==="t2"?"B":"C"}`:"—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ===== リード追加モーダル ===== */}
      {showAddModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowAddModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:10,border:`1px solid ${C.bdr}`,width:"100%",maxWidth:480,maxHeight:"90vh",overflow:"auto",padding:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <h2 style={{fontSize:15,fontWeight:800,margin:0}}>リード追加</h2>
              <button onClick={()=>setShowAddModal(false)} style={{background:"none",border:"none",color:C.sub,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <AddLeadForm onSubmit={async(data)=>{const ok=await addLead(data);if(ok)setShowAddModal(false);return ok;}}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// リード追加フォーム
// ============================================================
function AddLeadForm({onSubmit}){
  const[form,setForm]=useState({company:"",url:"",industry:"",region:"",companySize:"",revenue:"",notes:""});
  const[submitting,setSubmitting]=useState(false);
  const[error,setError]=useState("");
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleSubmit=async(e)=>{
    e.preventDefault();
    if(!form.company.trim()||!form.url.trim()){setError("会社名とURLは必須です");return;}
    setError("");setSubmitting(true);
    const ok=await onSubmit({
      company:form.company.trim(),
      url:form.url.trim(),
      industry:form.industry||null,
      region:form.region||null,
      companySize:form.companySize||null,
      revenue:form.revenue||null,
      notes:form.notes.trim()||null,
      phase:"discovered",
    });
    setSubmitting(false);
    if(!ok)setError("追加に失敗しました");
  };

  const inputStyle={width:"100%",padding:"8px 10px",borderRadius:5,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const labelStyle={fontSize:10,color:C.sub,fontWeight:600,display:"block",marginBottom:4};

  return(
    <form onSubmit={handleSubmit}>
      <div style={{marginBottom:12}}>
        <label style={labelStyle}>会社名 <span style={{color:C.r}}>*</span></label>
        <input value={form.company} onChange={e=>set("company",e.target.value)} placeholder="例: テックソリューションズ" style={inputStyle}/>
      </div>
      <div style={{marginBottom:12}}>
        <label style={labelStyle}>URL <span style={{color:C.r}}>*</span></label>
        <input value={form.url} onChange={e=>set("url",e.target.value)} placeholder="例: https://example.co.jp" style={inputStyle}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div>
          <label style={labelStyle}>業種</label>
          <select value={form.industry} onChange={e=>set("industry",e.target.value)} style={inputStyle}>
            <option value="">選択してください</option>
            {INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>地域</label>
          <select value={form.region} onChange={e=>set("region",e.target.value)} style={inputStyle}>
            <option value="">選択してください</option>
            {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div>
          <label style={labelStyle}>企業規模</label>
          <select value={form.companySize} onChange={e=>set("companySize",e.target.value)} style={inputStyle}>
            <option value="">選択してください</option>
            {COMPANY_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>売上規模</label>
          <select value={form.revenue} onChange={e=>set("revenue",e.target.value)} style={inputStyle}>
            <option value="">選択してください</option>
            {REVENUE_RANGES.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={labelStyle}>メモ</label>
        <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="備考・メモ" style={{...inputStyle,resize:"vertical"}}/>
      </div>
      {error&&<div style={{fontSize:10,color:C.r,marginBottom:10}}>{error}</div>}
      <button type="submit" disabled={submitting} style={{width:"100%",padding:"10px",borderRadius:5,border:"none",background:C.g,color:C.bg,fontSize:12,fontWeight:700,cursor:submitting?"default":"pointer",fontFamily:"inherit",opacity:submitting?.6:1}}>
        {submitting?"追加中...":"リードを追加"}
      </button>
    </form>
  );
}
