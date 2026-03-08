import { useState, useEffect, useMemo, useCallback } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import KPICards from "./dashboard/KPICards";

// ============================================================
// FormPilot AUTONOMOUS v2 — LLMO未対策企業を自動発見→無料診断→有料課金
// リード発見 → フォーム/メール送信 → 無料登録 → Stripe課金（セルフサービス）
// ============================================================

const C = {
  bg:"#04060B",bg2:"#080B13",sf:"#0C1019",card:"#111622",
  ca:"#161C2B",bdr:"#1B2235",bdrH:"#252E45",
  tx:"#E4E9F2",sub:"#99A4B8",dim:"#6B7590",
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
  const m={discovered:{c:C.cy,l:"発見"},form_found:{c:C.b,l:"フォーム済"},queued:{c:C.o,l:"送信待"},sent:{c:C.p,l:"送信済"},replied:{c:C.acc,l:"無料登録"},customer:{c:C.g,l:"有料顧客"},followup:{c:C.pk,l:"追客中"}};
  const s=m[p]||m.discovered;
  return<span style={{fontSize:12,fontWeight:700,padding:"2px 7px",borderRadius:3,background:`${s.c}14`,color:s.c}}>{s.l}</span>;
};
const StBadge=({s})=>{
  if(!s)return<span style={{fontSize:12,color:C.dim}}>—</span>;
  const m={active:{c:C.g,l:"契約中"},trialing:{c:C.b,l:"トライアル"},past_due:{c:C.o,l:"遅延"},canceled:{c:C.r,l:"解約"}};
  const v=m[s]||{c:C.dim,l:s};
  return<span style={{fontSize:12,fontWeight:700,padding:"2px 7px",borderRadius:3,background:`${v.c}12`,color:v.c}}>{v.l}</span>;
};
const ScoreBadge=({score})=>{
  const c=score>=80?C.g:score>=60?C.acc:score>=40?C.o:C.r;
  return<span style={{fontSize:12,fontWeight:800,fontFamily:"'Geist Mono',monospace",color:c,padding:"2px 6px",borderRadius:3,background:`${c}10`}}>{score}</span>;
};

const KPI=({icon,ic:icC,label,val,sub,trend,good})=>(
  <div style={{background:C.card,borderRadius:8,padding:"13px 15px",border:`1px solid ${C.bdr}`,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:icC,opacity:.4}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontSize:12,color:C.sub,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:3}}>{label}</div>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,fontFamily:"'Geist Mono',monospace",lineHeight:1}}>{val}</div>
        {sub&&<div style={{fontSize:12,color:C.dim,marginTop:3}}>{sub}</div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
        <div style={{width:26,height:26,borderRadius:5,background:`${icC}10`,display:"flex",alignItems:"center",justifyContent:"center"}}><I d={icon} s={12} c={icC}/></div>
        {trend!==undefined&&<span style={{fontSize:12,fontWeight:700,color:good?C.g:C.r}}>{trend>=0?"↑":"↓"}{Math.abs(trend)}%</span>}
      </div>
    </div>
  </div>
);

// ============================================================
// A/B Templates
// ============================================================
const TEMPLATES = [
  { id:"t1", name:"Step1: 無料診断の案内", subject:"【無料】貴社のAI検索対策 診断レポートをお送りします",
    body:"{{company}}様\n\n突然のご連絡失礼いたします。\n{{sender}} と申します。\n\n貴社サイトを拝見し、AI検索（ChatGPT / Perplexity等）での表示について改善余地がある可能性を発見いたしました。\n\n【貴社の課題（自動検出）】\n{{weaknesses}}\n\n現在、無料のAIO診断レポートを提供しております。\n貴社のAI検索可視性を数値で可視化し、具体的な改善アクションまでご提案します。\n\n▶ 無料診断レポートを見る: {{diagnosis_link}}\n\nお忙しいところ恐れ入りますが、ご検討いただけますと幸いです。",
    sent:0, opened:0, replied:0, converted:0 },
  { id:"t2", name:"Step2: 競合比較データ", subject:"貴社の競合はAI検索で先行しています — 無料データ共有",
    body:"{{company}}様\n\n{{sender}} です。\n\n{{industry}}業界のAI検索動向を分析したところ、貴社の競合他社がChatGPT / Perplexity 等のAI検索で既に言及されている一方、貴社はまだ十分な露出を確保できていない状況です。\n\n【現状スコア】\nLLMO対策スコア: {{llmo_score}} / 100（業界平均: 45）\n\n競合との差分データを無料でお送りできます。\nお手数ですが、下記よりお申込みください。\n\n▶ 無料レポート: {{diagnosis_link}}\n\n何卒よろしくお願いいたします。",
    sent:0, opened:0, replied:0, converted:0 },
  { id:"t3", name:"Step3: 有料プラン案内", subject:"AI検索利用者が527%増 — 貴社サイトは対応済みですか？",
    body:"{{company}}様\n\n{{sender}} です。\n\n2025年、AI検索（ChatGPT、Perplexity、Gemini）からのWebサイト流入が前年比527%増加しています。\n\nしかし、現時点で貴社サイトには以下の課題が見受けられます：\n{{weaknesses}}\n\n月額1万円のProプランで、構造化データ自動生成・metaタグ改善案・月次モニタリングをすべてAIが自動で対応します。生成されたコードをコピペするだけで対策完了です。\n\n▶ まずは無料診断から: {{diagnosis_link}}\n\nご質問等ございましたらお気軽にご連絡ください。",
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
  const[showScanModal,setShowScanModal]=useState(false);
  const[scanResults,setScanResults]=useState(null);
  const[showAutoDiscover,setShowAutoDiscover]=useState(false);

  // DB からリード読み込み
  const fetchLeads=useCallback(async()=>{
    try{
      const res=await fetch("/api/pipeline-leads");
      if(!res.ok){console.error("fetchLeads: status",res.status);return;}
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
      const res=await fetch("/api/pipeline-leads",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,...updates})});
      if(!res.ok)fetchLeads();
    }catch(e){console.error("updateLead error:",e);fetchLeads();}
  },[fetchLeads]);

  // CRUD: 削除（楽観的更新）
  const deleteLead=useCallback(async(id)=>{
    setLeads(p=>p.filter(l=>l.id!==id));
    try{
      const res=await fetch("/api/pipeline-leads",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
      if(!res.ok)fetchLeads();
    }catch(e){console.error("deleteLead error:",e);fetchLeads();}
  },[fetchLeads]);

  // CRUD: 追加
  const addLead=useCallback(async(leadData)=>{
    try{
      const res=await fetch("/api/pipeline-leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(leadData)});
      if(!res.ok)return false;
      const json=await res.json();
      if(json.lead){setLeads(p=>[json.lead,...p]);return true;}
      return false;
    }catch(e){console.error("addLead error:",e);return false;}
  },[]);

  const[templates,setTemplates]=useState(()=>[...TEMPLATES]);

  const[autoConfig,setAutoConfig]=useState({
    scanEnabled:true,scanInterval:24,
    scanIndustries:["IT・SaaS","製造業","EC"],scanRegions:["東京","大阪"],
    batchSize:20,autoFormScan:true,autoSendEnabled:true,
    sendThreshold:10,sendTime:"10:00",sendDays:["TUE","WED","THU"],
    llmoScoreMax:30,
    lastScanAt:null,
    nextScanAt:null,totalScans:0,
    aiScoreMinForPriority:70,
    autoFollowUp:true,followUpInterval:3,followUpMaxCount:3,
    autoDiagnosis:true,
    abTestEnabled:true,
    warmAlerts:true,
    // リード発見〜初回送信の自動実行（Cron: 平日 09:00 JST）
    autoDiscoverEnabled:false,
    autoInitialSendEnabled:true,
    // フォーム自動送信用ユーザープロフィール
    userProfile:{
      company_name:"",contact_name:"",contact_email:"",phone:"",
      department:"",position:"",postal_code:"",address:"",fax:"",
      service_name:"",service_content:"",service_strengths:[],target_customer:"",
    },
  });

  const[log,setLog]=useState([]);

  // addLogEntry: ログをstateに追加しつつDBにも永続化
  const addLogEntry=useCallback((msg,type="info")=>{
    const entry={t:new Date().toISOString(),msg,type};
    setLog(p=>[entry,...p]);
    fetch("/api/pipeline-activity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg,type})}).catch(e=>console.error("addLogEntry error:",e));
  },[]);

  // 初期ロード: テンプレート実績 + 活動ログ + 自動化設定をDBから取得
  useEffect(()=>{
    // テンプレート実績
    fetch("/api/pipeline-templates").then(r=>r.json()).then(json=>{
      if(json.templates&&json.templates.length>0){
        setTemplates(prev=>prev.map(t=>{
          const stats=json.templates.find(s=>s.templateId===t.id);
          if(stats)return{...t,sent:stats.sent,opened:stats.opened,replied:stats.replied,converted:stats.converted};
          return t;
        }));
      }
    }).catch(e=>console.error("fetchTemplates error:",e));

    // 活動ログ
    fetch("/api/pipeline-activity").then(r=>r.json()).then(json=>{
      if(json.entries)setLog(json.entries);
    }).catch(e=>console.error("fetchActivity error:",e));

    // 自動化設定
    fetch("/api/pipeline-config").then(r=>r.json()).then(json=>{
      if(json.config)setAutoConfig(prev=>({...prev,...json.config}));
    }).catch(e=>console.error("fetchConfig error:",e));
  },[]);

  // Debounced auto-save: 設定が変わったら1秒後にPUT
  useEffect(()=>{
    if(!mt)return; // 初回マウント前はスキップ
    const timer=setTimeout(()=>{
      fetch("/api/pipeline-config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({config:autoConfig})}).catch(e=>console.error("saveConfig error:",e));
    },1000);
    return()=>clearTimeout(timer);
  },[autoConfig,mt]);

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
    const now=new Date();const mStart=new Date(now.getFullYear(),now.getMonth(),1);
    const newThisMonth=leads.filter(l=>{const d=l.createdAt?new Date(l.createdAt):null;return d&&d>=mStart;}).length;
    return{t,ff,sent,replied,cust,mrr,hotLeads,withDiag,followedUp,opened,sentCount,newThisMonth,
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

  // 一括LLMOスキャンモーダルを開く
  const runScan=useCallback(()=>{
    setScanResults(null);
    setShowScanModal(true);
  },[]);

  // フォーム探索: /api/scan-forms に leadId を POST
  const [scanningLeadId, setScanningLeadId] = useState(null);
  const scanFormForLead=useCallback(async(lead)=>{
    setScanningLeadId(lead.id);
    try{
      const res=await fetch("/api/scan-forms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leadId:lead.id,url:lead.url})});
      if(!res.ok)throw new Error("Scan failed");
      const json=await res.json();
      // 結果でリストを更新
      const updates={};
      if(json.contactEmail)updates.contactEmail=json.contactEmail;
      if(json.contactPhone)updates.contactPhone=json.contactPhone;
      if(json.formUrl)updates.formUrl=json.formUrl;
      if(json.contactPageUrl)updates.contactPageUrl=json.contactPageUrl;
      if(json.contactEmail||json.formUrl)updates.phase="form_found";
      if(Object.keys(updates).length>0){
        setLeads(p=>p.map(l=>l.id===lead.id?{...l,...updates}:l));
      }
      addLogEntry(`🔍 ${lead.company}: ${json.contactEmail?"メール発見("+json.contactEmail+")":"メール未検出"}, ${json.formUrl?"フォーム発見":"フォーム未検出"}`,"form");
    }catch(e){console.error("scanForm error:",e);addLogEntry(`❌ ${lead.company}: フォーム探索失敗`,"form");}
    finally{setScanningLeadId(null);}
  },[addLogEntry]);

  // フォーム自動送信: analyze → submit の2段階
  const [formSubmittingLeadId, setFormSubmittingLeadId] = useState(null);
  const [formSubmitResults, setFormSubmitResults] = useState({}); // { [leadId]: { success, message } }
  const submitFormForLead=useCallback(async(lead)=>{
    if(!lead.formUrl){addLogEntry(`${lead.company}: フォームURLがありません`,"form");return;}
    const profile=autoConfig.userProfile||{};
    if(!profile.company_name||!profile.contact_name||!profile.contact_email){
      addLogEntry(`フォーム送信にはユーザープロフィール（会社名・担当者名・メール）の設定が必要です。自動化設定から入力してください。`,"form");
      return;
    }
    setFormSubmittingLeadId(lead.id);
    try{
      // Step 1: フォーム解析
      addLogEntry(`${lead.company}: フォーム解析中...`,"form");
      const analyzeRes=await fetch("/api/analyze-form-fields",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({formUrl:lead.formUrl,userProfile:profile,companyName:lead.company,servicePitch:profile.service_content||undefined})});
      if(!analyzeRes.ok){const err=await analyzeRes.json().catch(()=>({}));throw new Error(err.error||"フォーム解析エラー");}
      const analyzeData=await analyzeRes.json();
      if(analyzeData.hasCaptcha){
        setFormSubmitResults(p=>({...p,[lead.id]:{success:false,message:"CAPTCHA検出のため自動送信不可"}}));
        addLogEntry(`${lead.company}: CAPTCHA検出 — 手動送信が必要です`,"form");
        return;
      }
      if(!analyzeData.mappings||analyzeData.mappings.length===0){
        setFormSubmitResults(p=>({...p,[lead.id]:{success:false,message:"フォームフィールドのマッピングに失敗"}}));
        addLogEntry(`${lead.company}: フォームフィールドのマッピングに失敗しました`,"form");
        return;
      }
      // Step 2: フォーム送信
      addLogEntry(`${lead.company}: フォーム送信中...`,"form");
      const submitRes=await fetch("/api/submit-contact-form",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({formUrl:lead.formUrl,mappings:analyzeData.mappings})});
      const submitData=await submitRes.json();
      setFormSubmitResults(p=>({...p,[lead.id]:{success:submitData.success,message:submitData.message}}));
      if(submitData.success){
        updateLead(lead.id,{phase:"sent",sentAt:submitData.submittedAt});
        addLogEntry(`${lead.company}: フォーム送信完了`,"form");
      }else{
        addLogEntry(`${lead.company}: ${submitData.message}`,"form");
      }
    }catch(e){
      console.error("submitForm error:",e);
      setFormSubmitResults(p=>({...p,[lead.id]:{success:false,message:e.message||"送信エラー"}}));
      addLogEntry(`${lead.company}: フォーム送信失敗 — ${e.message}`,"form");
    }finally{
      setFormSubmittingLeadId(null);
    }
  },[autoConfig,addLogEntry,updateLead]);

  // AIスコア順送信: form_found かつ contactEmail ありのリードを /api/auto-send に POST
  const [sending, setSending] = useState(false);
  const autoSend=useCallback(async()=>{
    const ready=leads.filter(l=>l.phase==="form_found"&&l.contactEmail).sort((a,b)=>b.aiScore-a.aiScore).slice(0,autoConfig.sendThreshold);
    if(!ready.length){addLogEntry("⚠ 送信対象リードがありません（form_found + メールアドレス必要）","send");return;}
    setSending(true);
    try{
      const res=await fetch("/api/auto-send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leadIds:ready.map(r=>r.id)})});
      if(!res.ok)throw new Error("Send failed");
      const json=await res.json();
      // 送信成功したリードを更新
      if(json.results){
        json.results.filter(r=>r.success).forEach(r=>{
          setLeads(p=>p.map(l=>l.id===r.leadId?{...l,phase:"sent",sentAt:new Date().toISOString(),followUpCount:(l.followUpCount||0)+1}:l));
        });
      }
      addLogEntry(`📨 AIスコア優先で${json.summary?.sent||0}件送信完了（${json.summary?.skipped||0}件スキップ）`,"send");
      fetchLeads(); // 最新状態を再取得
    }catch(e){console.error("autoSend error:",e);addLogEntry("❌ 送信処理に失敗しました","send");}
    finally{setSending(false);}
  },[leads,autoConfig,fetchLeads,addLogEntry]);

  const nav=[
    {id:"pipeline",icon:ic.activity,label:"パイプライン"},
    {id:"leads",icon:ic.radar,label:"リード一覧"},
    {id:"automation",icon:ic.zap,label:"自動化設定"},
    {id:"abtest",icon:ic.bar,label:"A/Bテスト"},
    {id:"followup",icon:ic.mail,label:"フォローアップ"},
    {id:"analysis",icon:ic.globe,label:"分析"},
    {id:"customers",icon:ic.dollar,label:"顧客・収益"},
    {id:"activitylog",icon:ic.bell,label:"アクティビティ"},
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
            <div style={{fontSize:12,color:C.dim,letterSpacing:1.2,fontWeight:700}}>AUTONOMOUS FULL AUTO</div>
          </div>
          {mob&&<button onClick={()=>setSidebarOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",color:C.sub,fontSize:18,cursor:"pointer"}}>✕</button>}
        </div>
        <nav style={{flex:1,padding:"6px 4px",overflow:"auto"}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>{setView(n.id);setPage(0);setSelectedLead(null);if(mob)setSidebarOpen(false);}} style={{
              width:"100%",padding:"7px 9px",borderRadius:4,border:"none",
              background:view===n.id?C.accGl:"transparent",color:view===n.id?C.acc:C.sub,
              fontSize:13,fontWeight:view===n.id?700:400,fontFamily:"inherit",cursor:"pointer",
              display:"flex",alignItems:"center",gap:7,marginBottom:1,textAlign:"left",
            }}><I d={n.icon} s={13} c={view===n.id?C.acc:C.dim}/>{n.label}</button>
          ))}
        </nav>
        <div style={{padding:"9px 11px",borderTop:`1px solid ${C.bdr}`,fontSize:10}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:autoConfig.autoDiscoverEnabled?C.g:C.r,animation:autoConfig.autoDiscoverEnabled?"p5 2s infinite":"none"}}/>
            <span style={{fontWeight:700,color:autoConfig.autoDiscoverEnabled?C.g:C.r,fontSize:9}}>{autoConfig.autoDiscoverEnabled?"発見〜初回":"発見停止"}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:autoConfig.autoSendEnabled?C.g:C.r,animation:autoConfig.autoSendEnabled?"p5 2s infinite":"none"}}/>
            <span style={{fontWeight:700,color:autoConfig.autoSendEnabled?C.g:C.r,fontSize:9}}>{autoConfig.autoSendEnabled?"FU自動":"FU停止"}</span>
          </div>
          <div style={{fontSize:12,color:C.dim}}>発見: 平日 09:00 / FU: 平日 10:00 JST</div>
          <div style={{padding:"7px 9px",borderRadius:4,background:C.accGl,marginTop:6}}>
            <div style={{fontSize:12,color:C.acc,fontWeight:700}}>MRR</div>
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
              <button onClick={()=>setShowAddModal(true)} style={{padding:"5px 11px",borderRadius:4,border:"none",background:C.g,color:C.bg,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                + リード追加
              </button>
              <button onClick={()=>setShowAutoDiscover(true)} style={{padding:"5px 11px",borderRadius:4,border:"none",background:`linear-gradient(135deg,${C.cy},${C.b})`,color:C.bg,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                <I d={ic.globe} s={11} c={C.bg}/>自動発見
              </button>
              <button onClick={runScan} disabled={scanRunning} style={{padding:"5px 11px",borderRadius:4,border:"none",background:C.acc,color:C.bg,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,opacity:scanRunning?.5:1}}>
                {scanRunning?"⟳ スキャン中...":<><I d={ic.radar} s={11} c={C.bg}/>一括LLMO調査</>}
              </button>
              <button onClick={autoSend} disabled={sending} style={{padding:"5px 11px",borderRadius:4,border:`1px solid ${C.bdr}`,background:"transparent",color:C.tx,fontSize:12,fontWeight:600,cursor:sending?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,opacity:sending?.5:1}}>
                <I d={ic.send} s={11} c={C.p}/>{sending?"送信中...":"AIスコア順送信"}
              </button>
            </>}
            <div style={{padding:"4px 8px",borderRadius:3,background:C.gB,color:C.g,fontSize:12,fontWeight:700}}>{loading?"読込中...":leads.length+" リード"}</div>
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
              <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>自動集客パイプライン</div>

              {/* 自動化の現状 — 何が自動・何が手動かを明確に */}
              <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                  <I d={ic.zap} s={14} c={C.acc}/> 自動化の現状
                </div>
                <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:12,color:C.g,fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:C.g}}/> 自動で動いている
                    </div>
                    <ul style={{margin:0,paddingLeft:16,fontSize:12,color:C.sub,lineHeight:1.8}}>
                      <li><strong style={{color:C.tx}}>フォローアップメール</strong> — 平日 10:00 JST に Cron で自動送信</li>
                      {autoConfig.autoDiscoverEnabled&&<li><strong style={{color:C.tx}}>リード発見〜診断{autoConfig.autoInitialSendEnabled?"〜無料診断案内":""}</strong> — 平日 09:00 JST に Cron で自動実行</li>}
                      <li><strong style={{color:C.tx}}>無料登録 → 有料課金</strong> — 診断レポートを見て無料登録 → Proプランに課金（セルフサービス）</li>
                    </ul>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:C.o,fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:C.o}}/> 手動実行が必要
                    </div>
                    <ul style={{margin:0,paddingLeft:16,fontSize:12,color:C.sub,lineHeight:1.8}}>
                      {!autoConfig.autoDiscoverEnabled&&<><li><strong style={{color:C.tx}}>リード発見</strong> — 「自動発見」ボタンで実行</li><li><strong style={{color:C.tx}}>LLMO診断</strong> — 「一括LLMO調査」で実行</li><li><strong style={{color:C.tx}}>無料診断の案内</strong> — 「AIスコア順送信」で実行</li></>}
                      {autoConfig.autoDiscoverEnabled&&!autoConfig.autoInitialSendEnabled&&<li><strong style={{color:C.tx}}>無料診断の案内</strong> — 「AIスコア順送信」で手動実行（診断のみ自動）</li>}
                      <li><strong style={{color:C.tx}}>フォーム送信</strong> — リード一覧から手動実行（問い合わせフォームに自動入力・送信）</li>
                      {autoConfig.autoDiscoverEnabled&&autoConfig.autoInitialSendEnabled&&<li>その他は手動不要（登録・課金はセルフサービス）</li>}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 次のアクション — 収益最大化のための推奨アクション */}
              {(()=>{
                const readyToSend=leads.filter(l=>l.phase==="form_found"&&l.contactEmail).length;
                const needFormScan=leads.filter(l=>l.phase==="discovered").length;
                const noLeads=leads.length===0;
                const actions=[];
                if(readyToSend>0)actions.push({msg:`送信待ち ${readyToSend}件 — メール送信またはフォーム送信で無料診断を案内できます`,action:"send",cta:"AIスコア順送信",priority:1});
                if(needFormScan>0)actions.push({msg:`フォーム未探索のリードが ${needFormScan}件 あります。自動発見パイプラインで一括処理できます`,action:"discover",cta:"自動発見",priority:2});
                if(noLeads)actions.push({msg:"リードが0件です。自動発見またはリード追加で開始しましょう",action:"discover",cta:"自動発見",priority:3});
                if(actions.length===0&&leads.length>0)actions.push({msg:"パイプラインは順調です。リード一覧で進捗を確認しましょう",action:null,cta:"リード一覧",priority:0});
                const top=actions.sort((a,b)=>a.priority-b.priority)[0];
                if(!top)return null;
                return(
                  <div style={{background:top.priority>0?C.accGl:C.card,borderRadius:8,padding:12,border:`1px solid ${top.priority>0?C.acc+"30":C.bdr}`,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                    <div style={{fontSize:12,color:C.tx,fontWeight:600}}>
                      <span style={{fontSize:12,color:C.sub,marginRight:6}}>💡 次のアクション</span>{top.msg}
                    </div>
                    {top.cta&&(
                      <button onClick={()=>{
                        if(top.action==="send"){setView("leads");setTimeout(autoSend,200);}
                        else if(top.action==="discover")setShowAutoDiscover(true);
                        else setView("leads");
                      }} style={{padding:"6px 12px",borderRadius:4,border:"none",background:top.priority>0?C.acc:C.bdr,color:top.priority>0?C.bg:C.tx,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                        {top.cta}
                      </button>
                    )}
                  </div>
                );
              })()}

              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:12,padding:"6px 10px",background:C.card,borderRadius:6,border:`1px solid ${C.bdr}`,flexWrap:"wrap"}}>
                {["企業発見","フォーム検出","無料診断を案内","無料登録","有料課金（Pro）"].map((t,i,a)=>(
                  <span key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:12,color:"#fff",fontWeight:600}}>{t}</span>
                    {i<a.length-1&&<span style={{fontSize:12,color:"#ccd0da"}}>→</span>}
                  </span>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(3,1fr)":"repeat(5,1fr)",gap:5,marginBottom:20}}>
                {[
                  {label:"LLMO未対策企業発見",count:leads.filter(l=>l.phase==="discovered").length,color:C.cy,icon:ic.radar,desc:"AIがLLMO未対策の企業をスキャン・発見",next:"探索 →",auto:"手動"},
                  {label:"フォーム・メール検出",count:leads.filter(l=>l.phase==="form_found").length,color:C.b,icon:ic.link,desc:"問合せフォームやメールアドレスを検出",next:"送信 →",auto:"パイプライン内"},
                  {label:"無料診断を案内済",count:leads.filter(l=>["sent","step2","step3","step4"].includes(l.phase)).length,color:C.p,icon:ic.send,desc:"フォーム/メールで無料診断を案内（FU自動）",next:"登録 →",auto:"FU自動"},
                  {label:"無料登録",count:leads.filter(l=>l.phase==="replied").length,color:C.acc,icon:ic.check,desc:"診断レポートを閲覧し無料会員登録",next:"課金 →",auto:"自動"},
                  {label:"有料顧客（Pro）",count:leads.filter(l=>l.phase==="customer").length,color:C.g,icon:ic.dollar,desc:"構造化データ生成・meta改善・月次モニタリング",next:"",auto:"自動"},
                ].map((s,i)=>(
                  <div key={i} style={{background:C.card,borderRadius:7,padding:"14px 10px 10px",border:`1px solid ${C.bdr}`,textAlign:"center",position:"relative"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:s.color,opacity:.5}}/>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginBottom:4}}>
                      <div style={{width:28,height:28,borderRadius:5,background:`${s.color}10`,display:"flex",alignItems:"center",justifyContent:"center"}}><I d={s.icon} s={14} c={s.color}/></div>
                      <span style={{fontSize:12,fontWeight:700,padding:"2px 5px",borderRadius:2,background:s.auto==="自動"||s.auto==="FU自動"?C.gB:s.auto==="パイプライン内"?C.b+"20":C.o+"20",color:s.auto==="自動"||s.auto==="FU自動"?C.g:s.auto==="パイプライン内"?C.b:C.o}}>{s.auto}</span>
                    </div>
                    <div style={{fontSize:22,fontWeight:800,color:s.color,fontFamily:"'Geist Mono',monospace"}}>{s.count}</div>
                    <div style={{fontSize:12,color:"#fff",fontWeight:700,marginTop:3,lineHeight:1.3}}>{s.label}</div>
                    <div style={{fontSize:12,color:"#ccd0da",marginTop:4,lineHeight:1.3,minHeight:24}}>{s.desc}</div>
                    {i<4&&<div style={{position:"absolute",right:-7,top:"50%",transform:"translateY(-50%)",color:"#ccd0da",fontSize:12,zIndex:1,display:"flex",flexDirection:"column",alignItems:"center"}}><span style={{fontSize:12,color:"#ccd0da",whiteSpace:"nowrap"}}>{s.next}</span></div>}
                  </div>
                ))}
              </div>

              <KPICards leads={leads}/>

              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(5,1fr)",gap:8,marginBottom:20}}>
                <KPI icon={ic.radar} ic={C.b} label="総リード数" val={kpi.t.toString()} sub={`累計${autoConfig.totalScans}回スキャン`} trend={18} good/>
                <KPI icon={ic.send} ic={C.p} label="案内送信済" val={kpi.sent.toString()} sub={`フォーム発見率 ${kpi.formRate}%`}/>
                <KPI icon={ic.check} ic={C.g} label="無料登録率" val={`${kpi.replyRate}%`} sub={`${kpi.replied}件登録`} trend={5} good/>
                <KPI icon={ic.dollar} ic={C.acc} label="有料課金率" val={`${kpi.convRate}%`} sub="案内→Pro課金"/>
                <KPI icon={ic.dollar} ic={C.g} label="MRR" val={`¥${kpi.mrr.toLocaleString()}`} sub={`${kpi.cust}社 × ¥10,000/月`} trend={22} good/>
              </div>

              <div style={{marginBottom:16}}>
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>自動化ステータス</div>
                  <div style={{fontSize:12,color:C.dim,marginBottom:12}}>Cron（定期実行）の ON/OFF を設定できます</div>
                  {[
                    {l:"リード発見〜無料診断案内",d:"平日 09:00 JST に Cron で自動実行（発見→診断→フォーム探索→無料診断案内）",on:autoConfig.autoDiscoverEnabled,key:"autoDiscoverEnabled",cron:true},
                    {l:"初回案内メール自動送信",d:"リード発見 ON 時のみ有効。OFF の場合は診断・フォーム探索のみ自動",on:autoConfig.autoInitialSendEnabled,key:"autoInitialSendEnabled",cron:false},
                    {l:"フォローアップメール",d:"平日 10:00 JST に Cron で自動送信（Step2: 競合比較 → Step3: 有料プラン案内）",on:autoConfig.autoSendEnabled,key:"autoSendEnabled",cron:true},
                  ].map((s,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<2?`1px solid ${C.bdr}`:"none"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                          {s.l}
                          {s.cron&&<span style={{fontSize:12,fontWeight:700,padding:"2px 5px",borderRadius:2,background:C.gB,color:C.g}}>Cron</span>}
                        </div>
                        <div style={{fontSize:12,color:C.dim}}>{s.d}</div>
                      </div>
                      {s.key&&<button onClick={()=>setAutoConfig(p=>({...p,[s.key]:!p[s.key]}))} style={{padding:"4px 10px",borderRadius:4,border:"none",background:s.on?C.gB:C.rB,color:s.on?C.g:C.r,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{s.on?"ON":"OFF"}</button>}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`,maxWidth:400}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Stripe 収益サマリー</div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:12,color:C.sub}}>Proプラン契約中</span>
                  <span style={{fontSize:18,fontWeight:800,fontFamily:"'Geist Mono',monospace",color:C.g}}>{kpi.cust}社 ¥{kpi.mrr.toLocaleString()}/月</span>
                </div>
                <div style={{fontSize:12,color:C.dim,marginTop:6}}>構造化データ生成・metaタグ改善案・月次モニタリング提供中</div>
              </div>
            </div>
          )}

          {/* ===== ACTIVITY LOG ===== */}
          {!loading&&view==="activitylog"&&(
            <div className="fi">
              <div style={{fontSize:14,fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                <I d={ic.bell} s={16} c={C.acc}/> アクティビティログ
              </div>
              <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                {log.length===0&&<div style={{fontSize:12,color:C.dim,textAlign:"center",padding:20}}>ログはまだありません</div>}
                {log.map((l,i)=>(
                  <div key={i} style={{padding:"10px 0",borderBottom:i<log.length-1?`1px solid ${C.bdr}`:"none",display:"flex",gap:10,alignItems:"flex-start"}}>
                    <span style={{fontSize:12,color:C.dim,fontFamily:"'Geist Mono',monospace",flexShrink:0}}>{new Date(l.t).toLocaleString("ja-JP",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                    <span style={{fontSize:12,color:l.type==="customer"?C.g:l.type==="reply"?C.acc:l.type==="send"?C.p:l.type==="form"?C.b:C.sub,lineHeight:1.5}}>{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== LEADS ===== */}
          {!loading&&view==="leads"&&!selectedLead&&(
            <div className="fi">
              <div style={{display:"flex",gap:5,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{position:"relative",flex:"0 0 180px"}}>
                  <input value={searchQ} onChange={e=>{setSearchQ(e.target.value);setPage(0);}} placeholder="検索..." style={{width:"100%",padding:"6px 9px 6px 26px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.card,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                  <div style={{position:"absolute",left:7,top:7}}><I d={ic.search} s={11} c={C.dim}/></div>
                </div>
                {["all","discovered","form_found","queued","sent","replied","customer"].map(f=>(
                  <button key={f} onClick={()=>{setFilterPhase(f);setPage(0);}} style={{padding:"4px 9px",borderRadius:3,border:`1px solid ${filterPhase===f?C.acc+"40":"transparent"}`,background:filterPhase===f?C.accGl:"transparent",color:filterPhase===f?C.acc:C.dim,fontSize:12,fontWeight:filterPhase===f?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                    {f==="all"?"全件":{discovered:"発見",form_found:"フォーム済",queued:"送信待",sent:"送信済",replied:"無料登録",customer:"有料顧客"}[f]}
                  </button>
                ))}
                <select value={filterIndustry} onChange={e=>{setFilterIndustry(e.target.value);setPage(0);}} style={{padding:"4px 7px",borderRadius:3,border:`1px solid ${C.bdr}`,background:C.card,color:C.tx,fontSize:12,outline:"none"}}>
                  <option value="all">全業種</option>{INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
                </select>
                <div style={{flex:1}}/><span style={{fontSize:12,color:C.dim}}>{filtered.length}件</span>
              </div>

              <div style={{background:C.card,borderRadius:6,border:`1px solid ${C.bdr}`,overflow:mob?"auto":"hidden",WebkitOverflowScrolling:"touch"}}>
                <div style={{display:"grid",gridTemplateColumns:"35px 1fr 1fr .8fr 50px 45px 40px 40px 75px",padding:"6px 10px",fontSize:12,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:.4,borderBottom:`1px solid ${C.bdr}`,background:C.ca,minWidth:mob?700:undefined}}>
                  <span>AI</span><span>会社名</span><span>URL</span><span>メール</span><span>業種</span><span>フェーズ</span><span>開封</span><span>FU</span><span>操作</span>
                </div>
                {paged.map(l=>(
                  <div key={l.id} className="rh" onClick={()=>setSelectedLead(l)} style={{display:"grid",gridTemplateColumns:"35px 1fr 1fr .8fr 50px 45px 40px 40px 75px",padding:"7px 10px",borderBottom:`1px solid ${C.bdr}`,alignItems:"center",fontSize:12,cursor:"pointer",minWidth:mob?700:undefined}}>
                    <ScoreBadge score={l.aiScore}/>
                    <span style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</span>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontSize:12,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.url}</span>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontSize:12,color:l.contactEmail?C.g:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.contactEmail||"—"}</span>
                    <span style={{fontSize:12,color:C.sub}}>{(l.industry||"—").slice(0,4)}</span>
                    <Phase p={l.phase}/>
                    <span style={{fontSize:9}}>{l.openedEmail&&l.sentAt?"👁":"—"}</span>
                    <span style={{fontSize:12,color:l.followUpCount?C.pk:C.dim}}>{l.followUpCount||"—"}</span>
                    <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
                      {l.phase==="discovered"&&<button onClick={()=>scanFormForLead(l)} disabled={scanningLeadId===l.id} style={{padding:"2px 5px",borderRadius:2,border:`1px solid ${C.bdr}`,background:"transparent",color:C.b,fontSize:12,cursor:scanningLeadId===l.id?"default":"pointer",fontFamily:"inherit",opacity:scanningLeadId===l.id?.5:1}}>{scanningLeadId===l.id?"探索中...":"探索"}</button>}
                      {l.phase==="form_found"&&!l.contactEmail&&<button onClick={()=>scanFormForLead(l)} disabled={scanningLeadId===l.id} style={{padding:"2px 5px",borderRadius:2,border:`1px solid ${C.bdr}`,background:"transparent",color:C.b,fontSize:12,cursor:scanningLeadId===l.id?"default":"pointer",fontFamily:"inherit",opacity:scanningLeadId===l.id?.5:1}}>{scanningLeadId===l.id?"探索中...":"再探索"}</button>}
                      {l.formUrl&&l.phase==="form_found"&&<button onClick={()=>submitFormForLead(l)} disabled={formSubmittingLeadId===l.id} style={{padding:"2px 5px",borderRadius:2,border:`1px solid ${C.bdr}`,background:"transparent",color:C.p,fontSize:12,cursor:formSubmittingLeadId===l.id?"default":"pointer",fontFamily:"inherit",opacity:formSubmittingLeadId===l.id?.5:1}}>{formSubmittingLeadId===l.id?"送信中...":formSubmitResults[l.id]?formSubmitResults[l.id].success?"送信済":"再送信":"フォーム送信"}</button>}
                      <button onClick={()=>deleteLead(l.id)} style={{padding:"2px 4px",borderRadius:2,border:"none",background:"transparent",color:C.dim,fontSize:12,cursor:"pointer"}}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              {tp>1&&<div style={{display:"flex",justifyContent:"center",gap:4,marginTop:8}}>
                <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{padding:"3px 7px",borderRadius:3,border:`1px solid ${C.bdr}`,background:"transparent",color:page===0?C.dim:C.tx,fontSize:12,cursor:page===0?"default":"pointer",fontFamily:"inherit"}}>←</button>
                <span style={{fontSize:12,color:C.sub,padding:"0 6px"}}>{page+1}/{tp}</span>
                <button onClick={()=>setPage(p=>Math.min(tp-1,p+1))} disabled={page>=tp-1} style={{padding:"3px 7px",borderRadius:3,border:`1px solid ${C.bdr}`,background:"transparent",color:page>=tp-1?C.dim:C.tx,fontSize:12,cursor:page>=tp-1?"default":"pointer",fontFamily:"inherit"}}>→</button>
              </div>}
            </div>
          )}

          {/* Lead Detail */}
          {!loading&&view==="leads"&&selectedLead&&(
            <div className="fi">
              <button onClick={()=>setSelectedLead(null)} style={{padding:"5px 10px",borderRadius:4,border:`1px solid ${C.bdr}`,background:"transparent",color:C.sub,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>← 一覧に戻る</button>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
                <div style={{background:C.card,borderRadius:8,padding:mob?14:18,border:`1px solid ${C.bdr}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:800}}>{selectedLead.company}</div>
                      <div style={{fontSize:12,color:C.sub,marginTop:2}}>{selectedLead.url}</div>
                    </div>
                    <ScoreBadge score={selectedLead.aiScore}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[
                      {l:"業種",v:selectedLead.industry||"—"},{l:"地域",v:selectedLead.region||"—"},
                      {l:"企業規模",v:selectedLead.companySize||"—"},{l:"推定売上",v:selectedLead.revenue||"—"},
                      {l:"LLMOスコア",v:`${selectedLead.llmoScore||0}/100`},{l:"広告出稿",v:selectedLead.hasAdSpend?"あり":"なし"},
                      {l:"フェーズ",v:selectedLead.phase},{l:"フォローアップ",v:`${selectedLead.followUpCount||0}回`},
                    ].map((r,i)=>(
                      <div key={i} style={{padding:"6px 8px",borderRadius:4,background:C.ca}}>
                        <div style={{fontSize:12,color:C.dim,fontWeight:600}}>{r.l}</div>
                        <div style={{fontSize:12,fontWeight:600,marginTop:2}}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:C.card,borderRadius:8,padding:18,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>⚠️ LLMO弱点分析</div>
                  {(selectedLead.weaknesses||[]).map((w,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.bdr}`}}>
                      <span style={{color:C.r,fontSize:12}}>✕</span>
                      <span style={{fontSize:11}}>{w}</span>
                    </div>
                  ))}
                  {(selectedLead.weaknesses||[]).length===0&&<div style={{fontSize:12,color:C.dim,padding:"8px 0"}}>弱点データなし</div>}
                  <div style={{marginTop:12,padding:"10px 12px",borderRadius:5,background:C.accGl,border:`1px solid ${C.acc}15`}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.acc,marginBottom:4}}>💡 案内文プレビュー</div>
                    <div style={{fontSize:12,color:C.sub,lineHeight:1.6}}>
                      「{selectedLead.company}様のサイトを分析した結果、{(selectedLead.weaknesses||[]).slice(0,2).join("、")||"未分析"} など{(selectedLead.weaknesses||[]).length}件の改善点を発見しました。無料の診断レポートで詳細をご確認いただけます。」
                    </div>
                  </div>

                  {/* フォーム自動送信セクション */}
                  {selectedLead.formUrl&&(
                    <div style={{marginTop:12,padding:"10px 12px",borderRadius:5,background:`${C.p}08`,border:`1px solid ${C.p}20`}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.p,marginBottom:6}}>問い合わせフォーム自動送信</div>
                      <div style={{fontSize:12,color:C.sub,marginBottom:6}}>
                        フォームURL: <a href={selectedLead.formUrl} target="_blank" rel="noopener noreferrer" style={{color:C.b,textDecoration:"none"}}>{selectedLead.formUrl.replace(/^https?:\/\//,"").slice(0,40)}</a>
                      </div>
                      {formSubmitResults[selectedLead.id]&&(
                        <div style={{fontSize:12,padding:"4px 8px",borderRadius:3,marginBottom:6,background:formSubmitResults[selectedLead.id].success?C.gB:C.rB,color:formSubmitResults[selectedLead.id].success?C.g:C.r}}>
                          {formSubmitResults[selectedLead.id].message}
                        </div>
                      )}
                      <button
                        onClick={()=>submitFormForLead(selectedLead)}
                        disabled={formSubmittingLeadId===selectedLead.id}
                        style={{padding:"6px 14px",borderRadius:4,border:"none",background:formSubmittingLeadId===selectedLead.id?C.bdr:C.p,color:C.bg,fontSize:12,fontWeight:700,cursor:formSubmittingLeadId===selectedLead.id?"default":"pointer",fontFamily:"inherit",opacity:formSubmittingLeadId===selectedLead.id?.6:1}}
                      >
                        {formSubmittingLeadId===selectedLead.id?"送信処理中...":formSubmitResults[selectedLead.id]?.success?"再送信":"フォームに自動送信"}
                      </button>
                      {!autoConfig.userProfile?.company_name&&(
                        <div style={{fontSize:12,color:C.o,marginTop:4}}>自動化設定でユーザープロフィールを入力してください</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== A/B TEST ===== */}
          {view==="abtest"&&(
            <div className="fi">
              <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:8}}>📧 テンプレート別パフォーマンス</div>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:10,marginBottom:18}}>
                {templates.map((t,i)=>{
                  const bt=winLoss.byTemplate[t.id];
                  const isTop=templates.every(x=>winLoss.byTemplate[x.id]?parseFloat(winLoss.byTemplate[x.id].convRate)<=parseFloat(bt.convRate):true);
                  return(
                    <div key={t.id} style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${isTop?C.g+"40":C.bdr}`,position:"relative"}}>
                      {isTop&&<div style={{position:"absolute",top:8,right:8,fontSize:12,fontWeight:700,padding:"2px 6px",borderRadius:3,background:C.gB,color:C.g}}>🏆 BEST</div>}
                      <div style={{fontSize:12,color:C.dim,fontWeight:700,marginBottom:2}}>テンプレート {String.fromCharCode(65+i)}</div>
                      <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>{t.name}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        {[
                          {l:"送信数",v:bt.sent,c:C.tx},
                          {l:"開封率",v:bt.openRate+"%",c:C.b},
                          {l:"登録率",v:bt.replyRate+"%",c:C.acc},
                          {l:"課金率",v:bt.convRate+"%",c:C.g},
                        ].map((m,j)=>(
                          <div key={j} style={{padding:"6px 8px",borderRadius:4,background:C.ca}}>
                            <div style={{fontSize:12,color:C.dim}}>{m.l}</div>
                            <div style={{fontSize:14,fontWeight:800,fontFamily:"'Geist Mono',monospace",color:m.c}}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{marginTop:10,padding:8,borderRadius:4,background:C.bg,maxHeight:100,overflow:"auto"}}>
                        <div style={{fontSize:12,color:C.dim,fontWeight:600,marginBottom:3}}>件名</div>
                        <div style={{fontSize:12,color:C.acc,lineHeight:1.4}}>{t.subject}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>🔀 A/Bテスト設定</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0"}}>
                  <div><div style={{fontSize:12,fontWeight:600}}>ラウンドロビンA/B/Cテスト</div><div style={{fontSize:12,color:C.dim}}>送信時にテンプレートを均等に自動振り分け</div></div>
                  <button onClick={()=>setAutoConfig(p=>({...p,abTestEnabled:!p.abTestEnabled}))} style={{padding:"5px 12px",borderRadius:4,border:"none",background:autoConfig.abTestEnabled?C.gB:C.rB,color:autoConfig.abTestEnabled?C.g:C.r,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.abTestEnabled?"ON":"OFF"}</button>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderTop:`1px solid ${C.bdr}`}}>
                  <div><div style={{fontSize:12,fontWeight:600}}>無料診断レポート自動添付</div><div style={{fontSize:12,color:C.dim}}>LLMOスコア＋弱点リストのPDFを生成して添付</div></div>
                  <button onClick={()=>setAutoConfig(p=>({...p,autoDiagnosis:!p.autoDiagnosis}))} style={{padding:"5px 12px",borderRadius:4,border:"none",background:autoConfig.autoDiagnosis?C.gB:C.rB,color:autoConfig.autoDiagnosis?C.g:C.r,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.autoDiagnosis?"ON":"OFF"}</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== FOLLOW-UP ===== */}
          {view==="followup"&&(
            <div className="fi">
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:16}}>
                <KPI icon={ic.repeat} ic={C.pk} label="フォローアップ済" val={kpi.followedUp.toString()} sub="自動追客"/>
                <KPI icon={ic.send} ic={C.p} label="未登録（案内済）" val={leads.filter(l=>l.phase==="sent").length.toString()} sub="フォロー対象"/>
                <KPI icon={ic.check} ic={C.g} label="FU後登録" val={leads.filter(l=>l.followUpCount>0&&l.phase==="replied").length.toString()} sub="追客効果"/>
                <KPI icon={ic.clock} ic={C.o} label="次回FU予定" val={leads.filter(l=>l.followUpScheduled).length.toString()}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700}}>🔁 自動フォローアップ設定</div>
                    <button onClick={()=>setAutoConfig(p=>({...p,autoFollowUp:!p.autoFollowUp}))} style={{padding:"5px 12px",borderRadius:4,border:"none",background:autoConfig.autoFollowUp?C.gB:C.rB,color:autoConfig.autoFollowUp?C.g:C.r,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.autoFollowUp?"ON":"OFF"}</button>
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:4}}>フォローアップ間隔（日）</label>
                    <select value={autoConfig.followUpInterval} onChange={e=>setAutoConfig(p=>({...p,followUpInterval:+e.target.value}))} style={{width:"100%",padding:"8px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:12,outline:"none"}}>
                      {[2,3,5,7,10,14].map(d=><option key={d} value={d}>{d}日後</option>)}
                    </select>
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:4}}>最大フォローアップ回数</label>
                    <select value={autoConfig.followUpMaxCount} onChange={e=>setAutoConfig(p=>({...p,followUpMaxCount:+e.target.value}))} style={{width:"100%",padding:"8px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:12,outline:"none"}}>
                      {[1,2,3,4,5].map(n=><option key={n} value={n}>最大{n}回</option>)}
                    </select>
                  </div>
                  <div style={{padding:10,borderRadius:5,background:C.pB,border:`1px solid ${C.pk}15`}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.pk,marginBottom:6}}>フォローアップ戦略</div>
                    {[
                      {n:1,desc:"初回送信から3日後: 競合のAI検索状況データを共有",delay:"3日後"},
                      {n:2,desc:"2回目から5日後: 有料プランの具体的メリットを案内",delay:"8日後"},
                      {n:3,desc:"3回目から7日後: 最終案内（構造化データ・meta改善・月次モニタリング）",delay:"15日後"},
                    ].map((f,i)=>(
                      <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"5px 0",borderBottom:i<2?`1px solid ${C.pk}10`:"none"}}>
                        <span style={{fontSize:12,fontWeight:800,color:C.pk,width:14,flexShrink:0}}>#{f.n}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,color:C.tx,lineHeight:1.4}}>{f.desc}</div>
                          <div style={{fontSize:12,color:C.dim}}>初回から{f.delay}</div>
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
                        <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</div>
                        <div style={{fontSize:12,color:C.dim}}>FU {l.followUpCount}/{autoConfig.followUpMaxCount}回 · {l.openedEmail?"開封済":"未開封"}</div>
                      </div>
                      <button onClick={async()=>{try{const res=await fetch("/api/auto-send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leadIds:[l.id]})});if(res.ok)fetchLeads();}catch(e){console.error("FU send error:",e);}}} style={{padding:"3px 7px",borderRadius:3,border:`1px solid ${C.pk}40`,background:C.pkB,color:C.pk,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>FU送信</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== ANALYSIS ===== */}
          {view==="analysis"&&(
            <div className="fi">
              <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:8}}>📊 コンバージョン分析 — どの条件で課金されやすいか</div>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:14}}>
                {/* By Industry */}
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>業種別 課金率</div>
                  {Object.entries(winLoss.byIndustry).sort((a,b)=>parseFloat(b[1].rate)-parseFloat(a[1].rate)).map(([ind,d],i)=>(
                    <div key={ind} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.bdr}`}}>
                      <span style={{fontSize:12,width:60,flexShrink:0}}>{ind}</span>
                      <div style={{flex:1,height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${Math.max(parseFloat(d.rate),2)}%`,height:"100%",background:parseFloat(d.rate)>=10?C.g:parseFloat(d.rate)>=5?C.acc:C.o,borderRadius:3,opacity:.7}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:parseFloat(d.rate)>=10?C.g:C.acc,width:40,textAlign:"right"}}>{d.rate}%</span>
                      <span style={{fontSize:12,color:C.dim,width:45}}>{d.won}/{d.sent}件</span>
                    </div>
                  ))}
                </div>
                {/* By Company Size */}
                <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>企業規模別 課金率</div>
                  {Object.entries(winLoss.bySize).sort((a,b)=>parseFloat(b[1].rate)-parseFloat(a[1].rate)).map(([sz,d],i)=>(
                    <div key={sz} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.bdr}`}}>
                      <span style={{fontSize:12,width:65,flexShrink:0}}>{sz}</span>
                      <div style={{flex:1,height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${Math.max(parseFloat(d.rate),2)}%`,height:"100%",background:parseFloat(d.rate)>=10?C.g:parseFloat(d.rate)>=5?C.acc:C.o,borderRadius:3,opacity:.7}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:parseFloat(d.rate)>=10?C.g:C.acc,width:40,textAlign:"right"}}>{d.rate}%</span>
                      <span style={{fontSize:12,color:C.dim,width:45}}>{d.won}/{d.sent}件</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Template performance */}
              <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>📧 テンプレート別ファネル分析</div>
                <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:10}}>
                  {templates.map((t,i)=>{
                    const bt=winLoss.byTemplate[t.id];
                    return(
                      <div key={t.id} style={{padding:12,borderRadius:6,background:C.ca,border:`1px solid ${C.bdr}`}}>
                        <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>テンプレート {String.fromCharCode(65+i)}</div>
                        {[
                          {l:"送信",v:bt.sent,w:100,c:C.p},
                          {l:"開封",v:bt.opened,w:bt.sent?bt.opened/bt.sent*100:0,c:C.b},
                          {l:"登録",v:bt.replied,w:bt.sent?bt.replied/bt.sent*100:0,c:C.acc},
                          {l:"課金",v:bt.converted,w:bt.sent?bt.converted/bt.sent*100:0,c:C.g},
                        ].map((s,j)=>(
                          <div key={j} style={{marginBottom:4}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}>
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
              <div style={{background:C.accGl,borderRadius:8,padding:12,border:`1px solid ${C.acc}30`,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:C.acc,marginBottom:4}}>💡 自動化の仕組み</div>
                <div style={{fontSize:12,color:C.sub,lineHeight:1.6}}>
                  <strong style={{color:C.g}}>リード発見〜無料診断案内</strong>: ON にすると平日 09:00 JST に Cron で自動実行。<br/>
                  <strong style={{color:C.g}}>フォローアップメール</strong>: 平日 10:00 JST に Cron で自動送信。<br/>
                  <strong style={{color:C.g}}>無料登録 → 有料課金</strong>: 診断レポート閲覧 → Stripe決済まですべてセルフサービス。<br/>
                  <strong style={{color:C.o}}>手動</strong>: 各トグルを OFF にすると、該当処理は「リード一覧」のボタンで実行してください。
                </div>
              </div>
              {/* Cron 自動化 ON/OFF */}
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:16}}>
                <div style={{background:C.card,borderRadius:8,padding:18,border:`1px solid ${C.bdr}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div>
                      <h3 style={{fontSize:13,fontWeight:700,margin:0}}>🔍 リード発見〜無料診断案内</h3>
                      <div style={{fontSize:12,color:C.dim,marginTop:4}}>Cron: 平日 09:00 JST（発見→診断→フォーム探索→無料診断を案内）</div>
                    </div>
                    <button onClick={()=>setAutoConfig(p=>({...p,autoDiscoverEnabled:!p.autoDiscoverEnabled}))} style={{padding:"6px 14px",borderRadius:4,border:"none",background:autoConfig.autoDiscoverEnabled?C.gB:C.rB,color:autoConfig.autoDiscoverEnabled?C.g:C.r,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.autoDiscoverEnabled?"ON":"OFF"}</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${C.bdr}`}}>
                    <span style={{fontSize:12,color:C.sub}}>初回メールも自動送信</span>
                    <button onClick={()=>setAutoConfig(p=>({...p,autoInitialSendEnabled:!p.autoInitialSendEnabled}))} style={{padding:"5px 12px",borderRadius:4,border:"none",background:autoConfig.autoInitialSendEnabled?C.gB:C.rB,color:autoConfig.autoInitialSendEnabled?C.g:C.r,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.autoInitialSendEnabled?"ON":"OFF"}</button>
                  </div>
                  <div style={{fontSize:12,color:C.dim,marginTop:6}}>OFF の場合は診断・フォーム探索のみ自動。初回送信は手動。</div>
                </div>
                <div style={{background:C.card,borderRadius:8,padding:18,border:`1px solid ${C.bdr}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <h3 style={{fontSize:13,fontWeight:700,margin:0}}>📨 フォローアップ自動送信</h3>
                      <div style={{fontSize:12,color:C.dim,marginTop:4}}>Cron: 平日 10:00 JST</div>
                    </div>
                    <button onClick={()=>setAutoConfig(p=>({...p,autoSendEnabled:!p.autoSendEnabled}))} style={{padding:"6px 14px",borderRadius:4,border:"none",background:autoConfig.autoSendEnabled?C.gB:C.rB,color:autoConfig.autoSendEnabled?C.g:C.r,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoConfig.autoSendEnabled?"ON":"OFF"}</button>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
                <div style={{background:C.card,borderRadius:8,padding:18,border:`1px solid ${C.bdr}`}}>
                  <div style={{marginBottom:14}}>
                    <h3 style={{fontSize:13,fontWeight:700,margin:0}}>🔬 手動実行時の設定</h3>
                    <div style={{fontSize:12,color:C.dim,marginTop:4}}>自動発見・一括LLMO調査で使用</div>
                  </div>
                  {[
                    {l:"取得件数/回",opts:[10,20,50,100],val:autoConfig.batchSize,key:"batchSize",fmt:n=>`${n}件`},
                  ].map(({l,opts,val,key,fmt})=>(
                    <div key={key} style={{marginBottom:10}}>
                      <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>{l}</label>
                      <select value={val} onChange={e=>setAutoConfig(p=>({...p,[key]:+e.target.value}))} style={{width:"100%",padding:"7px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:12,outline:"none"}}>{opts.map(o=><option key={o} value={o}>{fmt(o)}</option>)}</select>
                    </div>
                  ))}
                  <div style={{marginBottom:10}}>
                    <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>LLMOスコア上限（この以下をリード化）</label>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <input type="range" min="10" max="60" value={autoConfig.llmoScoreMax} onChange={e=>setAutoConfig(p=>({...p,llmoScoreMax:+e.target.value}))} style={{flex:1}}/>
                      <span style={{fontSize:13,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:C.acc}}>{autoConfig.llmoScoreMax}</span>
                    </div>
                  </div>
                  <div style={{marginBottom:8}}>
                    <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>対象業種（自動発見時）</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{INDUSTRIES.map(i=>(
                      <button key={i} onClick={()=>setAutoConfig(p=>({...p,scanIndustries:p.scanIndustries.includes(i)?p.scanIndustries.filter(x=>x!==i):[...p.scanIndustries,i]}))} style={{padding:"3px 7px",borderRadius:3,fontSize:12,fontWeight:autoConfig.scanIndustries.includes(i)?700:400,border:`1px solid ${autoConfig.scanIndustries.includes(i)?C.acc+"40":C.bdr}`,background:autoConfig.scanIndustries.includes(i)?C.accGl:"transparent",color:autoConfig.scanIndustries.includes(i)?C.acc:C.dim,cursor:"pointer",fontFamily:"inherit"}}>{i}</button>
                    ))}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{background:C.card,borderRadius:8,padding:18,border:`1px solid ${C.bdr}`}}>
                    <h3 style={{fontSize:13,fontWeight:700,margin:0,marginBottom:14}}>📨 フォローアップ送信設定</h3>
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>手動送信時の上限件数</label>
                      <select value={autoConfig.sendThreshold} onChange={e=>setAutoConfig(p=>({...p,sendThreshold:+e.target.value}))} style={{width:"100%",padding:"7px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:12,outline:"none"}}>{[5,10,20,30,50].map(n=><option key={n} value={n}>{n}件まで</option>)}</select>
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>AIスコア閾値（優先送信）</label>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <input type="range" min="50" max="95" value={autoConfig.aiScoreMinForPriority} onChange={e=>setAutoConfig(p=>({...p,aiScoreMinForPriority:+e.target.value}))} style={{flex:1}}/>
                        <span style={{fontSize:13,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:C.g}}>{autoConfig.aiScoreMinForPriority}</span>
                      </div>
                      <div style={{fontSize:12,color:C.dim,marginTop:2}}>このスコア以上を最優先で送信</div>
                    </div>
                  </div>
                  <div style={{background:C.card,borderRadius:8,padding:18,border:`1px solid ${C.bdr}`,marginBottom:12}}>
                    <h3 style={{fontSize:13,fontWeight:700,margin:0,marginBottom:14}}>📝 フォーム送信プロフィール</h3>
                    <div style={{fontSize:12,color:C.dim,marginBottom:10}}>問い合わせフォーム自動送信時に使用する情報です</div>
                    {[
                      {l:"会社名",k:"company_name",ph:"例: フルフィル株式会社",req:true},
                      {l:"担当者名",k:"contact_name",ph:"例: 山田 太郎",req:true},
                      {l:"メールアドレス",k:"contact_email",ph:"例: info@example.com",req:true},
                      {l:"電話番号",k:"phone",ph:"例: 03-1234-5678"},
                      {l:"部署名",k:"department",ph:"例: 営業部"},
                      {l:"役職",k:"position",ph:"例: 代表取締役"},
                      {l:"郵便番号",k:"postal_code",ph:"例: 100-0001"},
                      {l:"住所",k:"address",ph:"例: 東京都千代田区..."},
                    ].map(({l,k,ph,req})=>(
                      <div key={k} style={{marginBottom:8}}>
                        <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>{l}{req&&<span style={{color:C.r}}> *</span>}</label>
                        <input value={autoConfig.userProfile?.[k]||""} onChange={e=>setAutoConfig(p=>({...p,userProfile:{...p.userProfile,[k]:e.target.value}}))} placeholder={ph} style={{width:"100%",padding:"6px 8px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                    ))}
                    <div style={{marginBottom:8}}>
                      <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>サービス名</label>
                      <input value={autoConfig.userProfile?.service_name||""} onChange={e=>setAutoConfig(p=>({...p,userProfile:{...p.userProfile,service_name:e.target.value}}))} placeholder="例: AIO Insight" style={{width:"100%",padding:"6px 8px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                    </div>
                    <div style={{marginBottom:8}}>
                      <label style={{fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:3}}>サービス内容（問い合わせ文面生成に使用）</label>
                      <textarea value={autoConfig.userProfile?.service_content||""} onChange={e=>setAutoConfig(p=>({...p,userProfile:{...p.userProfile,service_content:e.target.value}}))} rows={3} placeholder="例: AI検索最適化（AIO/LLMO）サービスを提供しています..." style={{width:"100%",padding:"6px 8px",borderRadius:4,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
                    </div>
                  </div>
                  <div style={{background:C.card,borderRadius:8,padding:16,border:`1px solid ${C.bdr}`}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>🔄 パイプライン全体（自動/手動の区別）</div>
                    {[
                      {s:"1",l:"LLMO未対策企業を発見",d:"手動: 自動発見 or 一括LLMO調査",c:C.cy,auto:false},
                      {s:"2",l:"フォーム・メール検出",d:"パイプライン実行時に自動",c:C.b,auto:true},
                      {s:"3",l:"フォーム自動送信",d:"手動: リード一覧から実行（Puppeteer）",c:C.p,auto:false},
                      {s:"4",l:"無料診断の案内メール + FU",d:"初回手動 / FU: 平日10:00 JST Cron自動",c:C.pk,auto:true},
                      {s:"5",l:"無料登録（セルフ）",d:"診断レポートを閲覧 → 無料会員登録",c:C.acc,auto:true},
                      {s:"6",l:"Pro課金（セルフ）",d:"Stripe決済 → 構造化データ生成・meta改善・月次モニタリング",c:C.g,auto:true},
                    ].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:i<5?`1px solid ${C.bdr}`:"none"}}>
                        <div style={{width:18,height:18,borderRadius:3,background:`${s.c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:s.c,flexShrink:0}}>{s.s}</div>
                        <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{s.l}</div><div style={{fontSize:12,color:C.dim}}>{s.d}</div></div>
                        <span style={{fontSize:12,fontWeight:700,padding:"2px 6px",borderRadius:2,background:s.auto?C.gB:C.o+"20",color:s.auto?C.g:C.o}}>{s.auto?"自動":"手動"}</span>
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
                <KPI icon={ic.trending} ic={C.b} label="課金率" val={`${kpi.convRate}%`} sub="案内→Pro課金"/>
                <KPI icon={ic.eye} ic={C.p} label="開封率" val={`${kpi.openRate}%`} sub="メール開封" trend={8} good/>
              </div>
              <div style={{background:C.card,borderRadius:7,border:`1px solid ${C.bdr}`,overflow:mob?"auto":"hidden",WebkitOverflowScrolling:"touch"}}>
                <div style={{display:"grid",gridTemplateColumns:"1.4fr 1.8fr 65px 60px 70px 70px",padding:"6px 10px",fontSize:12,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:.4,borderBottom:`1px solid ${C.bdr}`,background:C.ca,minWidth:mob?500:undefined}}>
                  <span>会社名</span><span>URL</span><span>Stripe</span><span>月額</span><span>業種</span><span>テンプレ</span>
                </div>
                {leads.filter(l=>l.stripeStatus).sort((a,b)=>({"active":0,"trialing":1,"past_due":2,"canceled":3}[a.stripeStatus]||9)-({"active":0,"trialing":1,"past_due":2,"canceled":3}[b.stripeStatus]||9)).map(l=>(
                  <div key={l.id} className="rh" style={{display:"grid",gridTemplateColumns:"1.4fr 1.8fr 65px 60px 70px 70px",padding:"8px 10px",borderBottom:`1px solid ${C.bdr}`,alignItems:"center",fontSize:12,minWidth:mob?500:undefined}}>
                    <span style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</span>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontSize:12,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.url}</span>
                    <StBadge s={l.stripeStatus}/>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontWeight:700,color:l.mrr?C.g:C.dim}}>{l.mrr?`¥${l.mrr.toLocaleString()}`:"—"}</span>
                    <span style={{fontSize:12,color:C.sub}}>{l.industry}</span>
                    <span style={{fontSize:12,color:C.dim}}>{l.templateUsed?l.templateUsed.replace("outreach_","").replace("step","S"):"—"}</span>
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

      {/* ===== 一括LLMOスキャンモーダル ===== */}
      {showScanModal&&(
        <BulkScanModal
          onClose={()=>{setShowScanModal(false);setScanResults(null);}}
          scanResults={scanResults}
          setScanResults={setScanResults}
          onComplete={()=>{fetchLeads();setAutoConfig(p=>({...p,lastScanAt:new Date().toISOString(),nextScanAt:new Date(Date.now()+p.scanInterval*36e5).toISOString(),totalScans:p.totalScans+1}));addLogEntry("🔬 一括LLMOスキャン完了","scan");}}
        />
      )}

      {showAutoDiscover&&(
        <AutoDiscoverModal
          onClose={()=>setShowAutoDiscover(false)}
          llmoScoreMax={autoConfig.llmoScoreMax}
          onComplete={(summary)=>{
            fetchLeads();
            setAutoConfig(p=>({...p,lastScanAt:new Date().toISOString(),nextScanAt:new Date(Date.now()+p.scanInterval*36e5).toISOString(),totalScans:p.totalScans+1}));
            addLogEntry(`自動発見パイプライン完了: ${summary.savedAsLeads}件リード追加, ${summary.formsFound}件フォーム発見, ${summary.emailsSent}件メール送信`,"scan");
          }}
        />
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

  const inputStyle={width:"100%",padding:"8px 10px",borderRadius:5,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const labelStyle={fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:4};

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
      {error&&<div style={{fontSize:12,color:C.r,marginBottom:10}}>{error}</div>}
      <button type="submit" disabled={submitting} style={{width:"100%",padding:"10px",borderRadius:5,border:"none",background:C.g,color:C.bg,fontSize:12,fontWeight:700,cursor:submitting?"default":"pointer",fontFamily:"inherit",opacity:submitting?.6:1}}>
        {submitting?"追加中...":"リードを追加"}
      </button>
    </form>
  );
}

// ============================================================
// 一括LLMOスキャンモーダル
// ============================================================
function BulkScanModal({onClose,scanResults,setScanResults,onComplete}){
  const[urlText,setUrlText]=useState("");
  const[scanning,setScanning]=useState(false);

  const urlCount=urlText.trim()?urlText.trim().split(/\n/).filter(l=>l.trim()).length:0;
  const estimatedTime=Math.ceil(urlCount/3)*10;

  const startScan=async()=>{
    const urls=urlText.trim().split(/\n/).map(l=>l.trim()).filter(Boolean);
    if(!urls.length)return;
    setScanning(true);
    try{
      const res=await fetch("/api/pipeline-scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({urls})});
      const json=await res.json();
      if(res.ok){
        setScanResults(json);
        onComplete();
      }else{
        setScanResults({error:json.error||"スキャンエラー"});
      }
    }catch(e){
      setScanResults({error:"ネットワークエラー: "+e.message});
    }finally{
      setScanning(false);
    }
  };

  const resetScan=()=>{setScanResults(null);setUrlText("");};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:10,border:`1px solid ${C.bdr}`,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h2 style={{fontSize:15,fontWeight:800,margin:0}}>一括LLMO調査</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.sub,fontSize:18,cursor:"pointer"}}>✕</button>
        </div>

        {/* エラー表示 */}
        {scanResults?.error&&(
          <div style={{padding:12,borderRadius:6,background:C.rB,border:`1px solid ${C.r}`,color:C.r,fontSize:12,marginBottom:14}}>
            {scanResults.error}
          </div>
        )}

        {/* 入力画面 */}
        {!scanResults?.summary&&!scanning&&(
          <div>
            <p style={{fontSize:12,color:C.sub,margin:"0 0 10px"}}>URLを1行に1つずつ入力してください（最大50件）</p>
            <textarea
              value={urlText}
              onChange={e=>setUrlText(e.target.value)}
              rows={8}
              placeholder={"https://example.com\nhttps://example2.co.jp\nhttps://example3.jp"}
              style={{width:"100%",padding:10,borderRadius:6,border:`1px solid ${C.bdr}`,background:C.sf,color:C.tx,fontSize:12,fontFamily:"'Geist Mono',monospace",resize:"vertical",boxSizing:"border-box"}}
            />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
              <div style={{fontSize:12,color:urlCount>50?C.r:C.sub}}>
                {urlCount}件{urlCount>0&&` | 推定 ${estimatedTime>60?Math.ceil(estimatedTime/60)+"分":estimatedTime+"秒"}`}
                {urlCount>50&&" (50件まで)"}
              </div>
              <button onClick={startScan} disabled={!urlCount||urlCount>50} style={{padding:"8px 18px",borderRadius:5,border:"none",background:C.acc,color:C.bg,fontSize:12,fontWeight:700,cursor:urlCount&&urlCount<=50?"pointer":"default",fontFamily:"inherit",opacity:urlCount&&urlCount<=50?1:.5}}>
                スキャン開始
              </button>
            </div>
          </div>
        )}

        {/* 実行中 */}
        {scanning&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0",gap:14}}>
            <div style={{width:36,height:36,border:`3px solid ${C.bdr}`,borderTop:`3px solid ${C.acc}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
            <div style={{fontSize:12,color:C.sub}}>LLMO診断中... ({urlCount}件)</div>
            <div style={{fontSize:12,color:C.dim}}>推定 {estimatedTime>60?Math.ceil(estimatedTime/60)+"分":estimatedTime+"秒"}</div>
          </div>
        )}

        {/* 結果画面 */}
        {scanResults?.summary&&(
          <div>
            {/* サマリーKPI */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
              {[
                {label:"処理",value:scanResults.summary.processed,color:C.b},
                {label:"成功",value:scanResults.summary.succeeded,color:C.g},
                {label:"リード追加",value:scanResults.summary.savedAsLeads,color:C.acc},
                {label:"重複スキップ",value:scanResults.summary.skippedDuplicate,color:C.sub},
              ].map(k=>(
                <div key={k.label} style={{background:C.sf,borderRadius:6,padding:"10px 8px",textAlign:"center",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:18,fontWeight:800,color:k.color,fontFamily:"'Geist Mono',monospace"}}>{k.value}</div>
                  <div style={{fontSize:12,color:C.sub,fontWeight:700,marginTop:2}}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* 結果リスト */}
            <div style={{maxHeight:300,overflow:"auto"}}>
              {scanResults.results?.map((r,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderBottom:`1px solid ${C.bdr}`,fontSize:11}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:r.status==="success"?(r.saved?C.g:C.sub):r.status==="skipped"?C.o:C.r,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.company}</div>
                    <div style={{fontSize:12,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.url}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {r.status==="success"&&(
                      <>
                        <div style={{fontWeight:700,color:r.llmoScore<=40?C.r:r.llmoScore<=70?C.o:C.g,fontFamily:"'Geist Mono',monospace"}}>{r.llmoScore}</div>
                        <div style={{fontSize:12,color:r.saved?C.g:C.dim}}>{r.saved?"追加済":"対象外"}</div>
                      </>
                    )}
                    {r.status==="skipped"&&<div style={{fontSize:12,color:C.o}}>重複</div>}
                    {r.status==="error"&&<div style={{fontSize:12,color:C.r}}>エラー</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* アクションボタン */}
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
              <button onClick={resetScan} style={{padding:"8px 16px",borderRadius:5,border:`1px solid ${C.bdr}`,background:"transparent",color:C.tx,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                新しいスキャン
              </button>
              <button onClick={onClose} style={{padding:"8px 16px",borderRadius:5,border:"none",background:C.acc,color:C.bg,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 自動発見パイプラインモーダル（AI検索機能統合）
// ============================================================
function AutoDiscoverModal({onClose,llmoScoreMax:defaultLlmoMax,onComplete}){
  const[tab,setTab]=useState("ai"); // "ai" | "search" | "csv"
  const[industry,setIndustry]=useState("");
  const[region,setRegion]=useState("");
  const[keyword,setKeyword]=useState("");
  const[csvText,setCsvText]=useState("");
  const[scoreMax,setScoreMax]=useState(defaultLlmoMax||40);
  const[autoSend,setAutoSend]=useState(true);

  // AI Search state
  const[aiCompanies,setAiCompanies]=useState([]);
  const[aiSearching,setAiSearching]=useState(false);
  const[aiEnriching,setAiEnriching]=useState(false);
  const[aiEnrichTotal,setAiEnrichTotal]=useState(0);
  const[aiComplete,setAiComplete]=useState(false);
  const[aiSearchMeta,setAiSearchMeta]=useState(null);
  const[selectedCompanyIds,setSelectedCompanyIds]=useState(new Set());
  const[selectAll,setSelectAll]=useState(false);

  // Pipeline state
  const[phase,setPhase]=useState(0); // 0=idle, 1=discovering, 2=llmo, 3=forms, 4=email, 5=done
  const[discoveredUrls,setDiscoveredUrls]=useState([]);
  const[pipelineResult,setPipelineResult]=useState(null);
  const[error,setError]=useState("");

  const phases=[
    {label:"発見",icon:ic.globe,color:C.cy},
    {label:"LLMO調査",icon:ic.radar,color:C.b},
    {label:"フォーム探索",icon:ic.link,color:C.p},
    {label:"メール送信",icon:ic.send,color:C.g},
  ];

  const canStart=tab==="ai"?(industry||region||keyword.trim())
    :tab==="search"?(industry&&region)
    :csvText.trim().length>0;

  // AI Search: SSE ストリーミング
  const runAiSearch=async()=>{
    setError("");setAiCompanies([]);setAiSearching(true);setAiComplete(false);setAiSearchMeta(null);setAiEnriching(false);setAiEnrichTotal(0);setSelectedCompanyIds(new Set());setSelectAll(false);
    try{
      const res=await fetch("/api/ai-search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({industry,region,keyword:keyword||undefined})});
      if(!res.ok){const err=await res.json().catch(()=>({error:"AI検索エラー"}));throw new Error(err.error||"AI検索エラー");}
      const reader=res.body.getReader();const decoder=new TextDecoder();let buffer="";const companiesAccum=[];const enrichUpdates={};
      while(true){
        const{done,value}=await reader.read();if(done)break;
        buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";
        for(const line of lines){
          if(!line.startsWith("data: "))continue;
          try{
            const data=JSON.parse(line.slice(6));
            if(data.type==="company"){const c=data.company;if(enrichUpdates[c.id])Object.assign(c,enrichUpdates[c.id]);companiesAccum.push(c);setAiCompanies([...companiesAccum]);}
            else if(data.type==="enrich_start"){setAiEnriching(true);setAiEnrichTotal(data.total);}
            else if(data.type==="enrich"){enrichUpdates[data.companyId]=data.fields;const idx=companiesAccum.findIndex(c=>c.id===data.companyId);if(idx>=0){Object.assign(companiesAccum[idx],data.fields);setAiCompanies([...companiesAccum]);}}
            else if(data.type==="complete"){setAiComplete(true);setAiSearchMeta(data.searchMeta||null);const allIds=new Set(companiesAccum.map(c=>c.id));setSelectedCompanyIds(allIds);setSelectAll(true);}
            else if(data.type==="error"){throw new Error(data.error);}
          }catch(parseErr){if(parseErr.message&&!parseErr.message.includes("JSON"))throw parseErr;}
        }
      }
    }catch(e){setError(e.message||"AI検索エラー");}finally{setAiSearching(false);setAiEnriching(false);}
  };

  // AI Search 結果をパイプラインに投入
  const importAiResults=async()=>{
    const selected=aiCompanies.filter(c=>selectedCompanyIds.has(c.id));
    if(selected.length===0){setError("インポートする企業を選択してください");return;}
    setPhase(2);setError("");setDiscoveredUrls(selected.map(c=>({url:c.url,title:c.name})));
    try{
      const companies=selected.map(c=>({name:c.name,url:c.url,industry:c.industry||industry||undefined,region:c.region||region||undefined,address:c.address||undefined,phone:c.phone||undefined,email:c.email||undefined,google_maps_url:c.google_maps_url||undefined,founded_year:c.founded_year||undefined,employee_count:c.employee_count||undefined,representative:c.representative||undefined,contact_name:c.contact_name||undefined,contact_position:c.contact_position||undefined,capital:c.capital||undefined,description:c.description||undefined,heat_score:typeof c.heat_score==="number"?c.heat_score:undefined}));
      const pipeRes=await fetch("/api/auto-pipeline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companies,llmoScoreMax:scoreMax,industry:industry||undefined,region:region||undefined,skipAutoSend:!autoSend})});
      if(!pipeRes.ok){const err=await pipeRes.json();throw new Error(err.error||"パイプラインエラー");}
      const pipeData=await pipeRes.json();setPipelineResult(pipeData);setPhase(5);if(onComplete&&pipeData.summary)onComplete(pipeData.summary);
    }catch(e){setError(e.message||"エラーが発生しました");setPhase(0);}
  };

  const toggleCompany=(id)=>{setSelectedCompanyIds(prev=>{const next=new Set(prev);if(next.has(id))next.delete(id);else next.add(id);return next;});};
  const toggleSelectAll=()=>{if(selectAll){setSelectedCompanyIds(new Set());setSelectAll(false);}else{setSelectedCompanyIds(new Set(aiCompanies.map(c=>c.id)));setSelectAll(true);}};

  const runPipeline=async()=>{
    setError("");
    setPipelineResult(null);

    // Phase 1: URL発見
    setPhase(1);
    try{
      const discoverBody=tab==="search"
        ?{mode:"search",industry,region,keyword:keyword||undefined}
        :{mode:"csv",csvText};

      const discRes=await fetch("/api/lead-discover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(discoverBody)});
      if(!discRes.ok){
        const err=await discRes.json();
        throw new Error(err.error||"発見APIエラー");
      }
      const discData=await discRes.json();
      const urls=discData.urls||[];
      setDiscoveredUrls(urls);

      if(urls.length===0){
        setError("URLが見つかりませんでした。検索条件を変更してください。");
        setPhase(0);
        return;
      }

      // Phase 2-4: パイプライン実行
      setPhase(2);
      const pipeRes=await fetch("/api/auto-pipeline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        urls:urls.map(u=>u.url),
        llmoScoreMax:scoreMax,
        industry:tab==="search"?industry:undefined,
        region:tab==="search"?region:undefined,
        skipAutoSend:!autoSend,
      })});

      if(!pipeRes.ok){
        const err=await pipeRes.json();
        throw new Error(err.error||"パイプラインエラー");
      }

      const pipeData=await pipeRes.json();
      setPipelineResult(pipeData);
      setPhase(5);
      if(onComplete&&pipeData.summary)onComplete(pipeData.summary);
    }catch(e){
      setError(e.message||"エラーが発生しました");
      if(phase<5)setPhase(0);
    }
  };

  const inputStyle={width:"100%",padding:"8px 10px",borderRadius:5,border:`1px solid ${C.bdr}`,background:C.bg,color:C.tx,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const labelStyle={fontSize:12,color:C.sub,fontWeight:600,display:"block",marginBottom:4};
  const running=phase>=1&&phase<5;
  const showAiResults=(tab==="ai")&&(aiCompanies.length>0||aiSearching)&&phase===0;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={(running||aiSearching)?undefined:onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:10,border:`1px solid ${C.bdr}`,width:"100%",maxWidth:showAiResults?720:560,maxHeight:"90vh",overflow:"auto",padding:24,transition:"max-width .3s"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontSize:15,fontWeight:800,margin:0,display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:28,height:28,borderRadius:5,background:`linear-gradient(135deg,${C.cy},${C.b})`,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><I d={ic.globe} s={14} c={C.bg}/></span>
            {tab==="ai"?"AI企業検索":"自動リード発見パイプライン"}
          </h2>
          {!running&&!aiSearching&&<button onClick={onClose} style={{background:"none",border:"none",color:C.sub,fontSize:18,cursor:"pointer"}}>✕</button>}
        </div>

        {/* Progress bar (visible during execution) */}
        {running&&(
          <div style={{display:"flex",gap:4,marginBottom:18}}>
            {phases.map((p,i)=>{
              const step=i+1;
              const active=phase===step||(phase===2&&step<=3)||(phase>=2&&step<=phase);
              const done=phase>step||(phase===5);
              const isCurrent=(phase===1&&step===1)||(phase>=2&&phase<5&&step>=2&&step<=4);
              return(
                <div key={i} style={{flex:1,position:"relative"}}>
                  <div style={{height:4,borderRadius:2,background:done?p.color:active?`${p.color}40`:C.bdr,transition:"background .5s"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginTop:6}}>
                    <div style={{width:20,height:20,borderRadius:4,background:done?`${p.color}20`:isCurrent?`${p.color}15`:C.bg,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${done||isCurrent?p.color+"40":"transparent"}`}}>
                      {done?<I d={ic.check} s={10} c={p.color}/>:isCurrent?<div style={{width:8,height:8,borderRadius:"50%",border:`2px solid ${p.color}`,borderTopColor:"transparent",animation:"spin 1s linear infinite"}}/>:<I d={p.icon} s={10} c={C.dim}/>}
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:done?p.color:isCurrent?C.tx:C.dim}}>{p.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Running status */}
        {running&&phase<5&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"30px 0",gap:12}}>
            <div style={{width:36,height:36,border:`3px solid ${C.bdr}`,borderTop:`3px solid ${phases[Math.min(phase-1,3)].color}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
            <div style={{fontSize:12,color:C.sub}}>
              {phase===1&&"URLを発見中..."}
              {phase>=2&&phase<5&&`パイプライン実行中... (${discoveredUrls.length}件)`}
            </div>
            {phase>=2&&<div style={{fontSize:12,color:C.dim}}>LLMO診断 → フォーム探索 → メール送信を一括実行</div>}
          </div>
        )}

        {/* Idle: Tab selector + input form */}
        {phase===0&&!showAiResults&&(
          <>
            {/* Tabs */}
            <div style={{display:"flex",gap:2,marginBottom:16,background:C.bg,borderRadius:6,padding:3}}>
              {[{id:"ai",label:"AI検索"},{id:"search",label:"検索発見"},{id:"csv",label:"CSV取込"}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"7px 0",borderRadius:4,border:"none",background:tab===t.id?C.ca:"transparent",color:tab===t.id?C.tx:C.dim,fontSize:12,fontWeight:tab===t.id?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* AI Search tab */}
            {tab==="ai"&&(
              <div>
                <div style={{padding:10,borderRadius:6,background:`${C.cy}10`,border:`1px solid ${C.cy}30`,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.cy,marginBottom:4}}>Gemini + Google Search で企業を発見</div>
                  <div style={{fontSize:12,color:C.sub}}>AIがリアルタイムで企業を検索し、Firecrawlで詳細情報を自動収集します。結果を確認してからパイプラインに投入できます。</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  <div>
                    <label style={labelStyle}>業種</label>
                    <select value={industry} onChange={e=>setIndustry(e.target.value)} style={inputStyle}>
                      <option value="">全業種</option>
                      {INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>地域</label>
                    <select value={region} onChange={e=>setRegion(e.target.value)} style={inputStyle}>
                      <option value="">全地域</option>
                      {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={labelStyle}>キーワード</label>
                  <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="例: クラウド, DX, 介護, Web制作" style={inputStyle}/>
                </div>
              </div>
            )}

            {/* Search tab */}
            {tab==="search"&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  <div>
                    <label style={labelStyle}>業種 <span style={{color:C.r}}>*</span></label>
                    <select value={industry} onChange={e=>setIndustry(e.target.value)} style={inputStyle}>
                      <option value="">選択してください</option>
                      {INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>地域 <span style={{color:C.r}}>*</span></label>
                    <select value={region} onChange={e=>setRegion(e.target.value)} style={inputStyle}>
                      <option value="">選択してください</option>
                      {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={labelStyle}>キーワード（任意）</label>
                  <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="例: クラウド, DX, 中小企業" style={inputStyle}/>
                </div>
              </div>
            )}

            {/* CSV tab */}
            {tab==="csv"&&(
              <div style={{marginBottom:12}}>
                <label style={labelStyle}>URL一覧</label>
                <textarea
                  value={csvText}
                  onChange={e=>setCsvText(e.target.value)}
                  rows={8}
                  placeholder={"https://example.com\nhttps://example2.co.jp\nhttps://example3.jp\n\nまたはCSV形式:\nurl,company,industry,region\nhttps://example.com,テスト会社,IT・SaaS,東京"}
                  style={{...inputStyle,fontFamily:"'Geist Mono',monospace",resize:"vertical"}}
                />
                <div style={{fontSize:12,color:C.dim,marginTop:4}}>1行1URL、またはCSV形式（最大100件）</div>
              </div>
            )}

            {/* Settings (for search/csv tabs) */}
            {tab!=="ai"&&<div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10}}>設定</div>
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <label style={{fontSize:12,color:C.sub,fontWeight:600}}>LLMOスコア上限</label>
                  <span style={{fontSize:13,fontWeight:800,fontFamily:"'Geist Mono',monospace",color:C.acc}}>{scoreMax}</span>
                </div>
                <input type="range" min="10" max="60" value={scoreMax} onChange={e=>setScoreMax(+e.target.value)} style={{width:"100%"}}/>
                <div style={{fontSize:12,color:C.dim}}>このスコア以下のサイトのみリードとして保存</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx}}>自動メール送信</div>
                  <div style={{fontSize:12,color:C.dim}}>フォーム発見後に初回ステップメールを自動送信</div>
                </div>
                <button onClick={()=>setAutoSend(!autoSend)} style={{padding:"4px 12px",borderRadius:4,border:"none",background:autoSend?C.gB:C.rB,color:autoSend?C.g:C.r,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoSend?"ON":"OFF"}</button>
              </div>
            </div>}

            {/* Error */}
            {error&&<div style={{padding:10,borderRadius:6,background:C.rB,border:`1px solid ${C.r}`,color:C.r,fontSize:12,marginBottom:12}}>{error}</div>}

            {/* Start button */}
            <button onClick={tab==="ai"?runAiSearch:runPipeline} disabled={!canStart} style={{width:"100%",padding:"12px",borderRadius:6,border:"none",background:canStart?`linear-gradient(135deg,${C.cy},${C.b})`:`${C.bdr}`,color:canStart?C.bg:C.dim,fontSize:13,fontWeight:800,cursor:canStart?"pointer":"default",fontFamily:"inherit",opacity:canStart?1:.6}}>
              {tab==="ai"?"AI検索を開始":"パイプライン実行"}
            </button>
          </>
        )}

        {/* AI Search: Streaming results */}
        {showAiResults&&phase===0&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {aiSearching&&<div style={{width:14,height:14,border:`2px solid ${C.bdr}`,borderTop:`2px solid ${C.cy}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>}
                {aiSearching&&!aiEnriching&&<span style={{fontSize:12,color:C.cy,fontWeight:600}}>企業を検索中...</span>}
                {aiEnriching&&<span style={{fontSize:12,color:C.b,fontWeight:600}}>詳細情報を収集中... ({aiEnrichTotal}社)</span>}
                {aiComplete&&!aiSearching&&<span style={{fontSize:12,color:C.g,fontWeight:600}}>検索完了</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:18,fontWeight:800,color:C.cy,fontFamily:"'Geist Mono',monospace"}}>{aiCompanies.length}</span>
                <span style={{fontSize:12,color:C.sub}}>社発見</span>
              </div>
            </div>

            {aiCompanies.length>0&&(
              <div style={{marginBottom:14}}>
                {aiComplete&&(
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:C.bg,borderRadius:"6px 6px 0 0",border:`1px solid ${C.bdr}`,borderBottom:"none"}}>
                    <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:C.sub}}>
                      <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{accentColor:C.cy}}/>
                      全選択 ({selectedCompanyIds.size}/{aiCompanies.length})
                    </label>
                    {aiSearchMeta&&aiSearchMeta.queries&&(
                      <span style={{fontSize:12,color:C.dim}}>{aiSearchMeta.queries.length}クエリ / {aiSearchMeta.sources?.length||0}ソース</span>
                    )}
                  </div>
                )}
                <div style={{maxHeight:350,overflow:"auto",border:`1px solid ${C.bdr}`,borderRadius:aiComplete?"0 0 6px 6px":"6px"}}>
                  {aiCompanies.map((c,i)=>{
                    const isSelected=selectedCompanyIds.has(c.id);
                    return(
                      <div key={c.id||i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",borderBottom:i<aiCompanies.length-1?`1px solid ${C.bdr}`:"none",background:isSelected?`${C.cy}08`:"transparent",transition:"background .2s"}}>
                        {aiComplete&&<input type="checkbox" checked={isSelected} onChange={()=>toggleCompany(c.id)} style={{accentColor:C.cy,marginTop:2,flexShrink:0}}/>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                            <span style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                            {typeof c.heat_score==="number"&&<span style={{fontSize:12,fontWeight:700,padding:"1px 5px",borderRadius:3,background:c.heat_score>=70?C.gB:c.heat_score>=40?`${C.o}15`:C.rB,color:c.heat_score>=70?C.g:c.heat_score>=40?C.o:C.r,fontFamily:"'Geist Mono',monospace"}}>{c.heat_score}</span>}
                          </div>
                          <div style={{fontSize:12,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{c.url?.replace(/^https?:\/\//,"").slice(0,40)}</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4,fontSize:8}}>
                            {c.industry&&<span style={{padding:"1px 5px",borderRadius:3,background:`${C.b}15`,color:C.b}}>{c.industry}</span>}
                            {c.region&&<span style={{padding:"1px 5px",borderRadius:3,background:`${C.p}15`,color:C.p}}>{c.region}</span>}
                            {c.email&&<span style={{padding:"1px 5px",borderRadius:3,background:C.gB,color:C.g}}>mail</span>}
                            {c.phone&&c.phone!=="不明"&&<span style={{padding:"1px 5px",borderRadius:3,background:`${C.cy}15`,color:C.cy}}>tel</span>}
                            {c.employee_count&&<span style={{padding:"1px 5px",borderRadius:3,background:`${C.sub}15`,color:C.sub}}>{c.employee_count}</span>}
                            {c.capital&&<span style={{padding:"1px 5px",borderRadius:3,background:`${C.sub}15`,color:C.sub}}>{c.capital}</span>}
                            {c.representative&&<span style={{padding:"1px 5px",borderRadius:3,background:`${C.sub}15`,color:C.sub}}>{c.representative}</span>}
                          </div>
                          {c.description&&<div style={{fontSize:12,color:C.dim,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.description}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error&&<div style={{padding:10,borderRadius:6,background:C.rB,border:`1px solid ${C.r}`,color:C.r,fontSize:12,marginBottom:12}}>{error}</div>}

            {aiComplete&&aiCompanies.length>0&&(
              <>
                <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10}}>パイプライン設定</div>
                  <div style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <label style={{fontSize:12,color:C.sub,fontWeight:600}}>LLMOスコア上限</label>
                      <span style={{fontSize:13,fontWeight:800,fontFamily:"'Geist Mono',monospace",color:C.acc}}>{scoreMax}</span>
                    </div>
                    <input type="range" min="10" max="60" value={scoreMax} onChange={e=>setScoreMax(+e.target.value)} style={{width:"100%"}}/>
                    <div style={{fontSize:12,color:C.dim}}>このスコア以下のサイトのみリードとして保存</div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:C.tx}}>自動メール送信</div>
                      <div style={{fontSize:12,color:C.dim}}>フォーム発見後に初回ステップメールを自動送信</div>
                    </div>
                    <button onClick={()=>setAutoSend(!autoSend)} style={{padding:"4px 12px",borderRadius:4,border:"none",background:autoSend?C.gB:C.rB,color:autoSend?C.g:C.r,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{autoSend?"ON":"OFF"}</button>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setAiCompanies([]);setAiComplete(false);setAiSearchMeta(null);setError("");}} style={{flex:1,padding:"10px",borderRadius:6,border:`1px solid ${C.bdr}`,background:"transparent",color:C.tx,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>新しい検索</button>
                  <button onClick={importAiResults} disabled={selectedCompanyIds.size===0} style={{flex:2,padding:"10px",borderRadius:6,border:"none",background:selectedCompanyIds.size>0?`linear-gradient(135deg,${C.cy},${C.b})`:`${C.bdr}`,color:selectedCompanyIds.size>0?C.bg:C.dim,fontSize:12,fontWeight:800,cursor:selectedCompanyIds.size>0?"pointer":"default",fontFamily:"inherit",opacity:selectedCompanyIds.size>0?1:.6}}>
                    {selectedCompanyIds.size}社をパイプラインに投入
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Results (phase 5) */}
        {phase===5&&pipelineResult&&(
          <div>
            {/* Summary KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
              {[
                {label:"発見",value:discoveredUrls.length,color:C.cy},
                {label:"LLMO済",value:pipelineResult.summary?.diagnosed||0,color:C.b},
                {label:"フォーム発見",value:pipelineResult.summary?.formsFound||0,color:C.p},
                {label:"メール送信",value:pipelineResult.summary?.emailsSent||0,color:C.g},
              ].map(k=>(
                <div key={k.label} style={{background:C.sf,borderRadius:6,padding:"10px 8px",textAlign:"center",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:20,fontWeight:800,color:k.color,fontFamily:"'Geist Mono',monospace"}}>{k.value}</div>
                  <div style={{fontSize:12,color:C.sub,fontWeight:700,marginTop:2}}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Detail summary */}
            <div style={{background:C.bg,borderRadius:6,padding:12,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:8}}>詳細サマリー</div>
              {[
                {l:"入力URL数",v:pipelineResult.summary?.totalInput||0},
                {l:"重複スキップ",v:pipelineResult.summary?.duplicateSkipped||0},
                {l:"スコア除外",v:pipelineResult.summary?.filteredByScore||0},
                {l:"リード追加",v:pipelineResult.summary?.savedAsLeads||0},
                {l:"診断失敗",v:pipelineResult.summary?.diagnosisFailed||0},
              ].map(s=>(
                <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:10}}>
                  <span style={{color:C.sub}}>{s.l}</span>
                  <span style={{fontWeight:700,fontFamily:"'Geist Mono',monospace",color:C.tx}}>{s.v}</span>
                </div>
              ))}
            </div>

            {/* Result list */}
            {pipelineResult.results&&pipelineResult.results.length>0&&(
              <div style={{maxHeight:250,overflow:"auto",marginBottom:14}}>
                {pipelineResult.results.map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderBottom:`1px solid ${C.bdr}`,fontSize:10}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:r.status==="success"?C.g:r.status==="skipped"?C.o:r.status==="filtered"?C.sub:C.r,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.company}</div>
                      <div style={{fontSize:12,color:C.dim,display:"flex",gap:8}}>
                        <span>{r.url?.replace(/^https?:\/\//,"").slice(0,30)}</span>
                        {r.contactEmail&&<span style={{color:C.g}}>mail</span>}
                        {r.formUrl&&<span style={{color:C.b}}>form</span>}
                        {r.emailSent&&<span style={{color:C.p}}>sent</span>}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      {r.status==="success"&&<div style={{fontWeight:700,color:r.llmoScore<=40?C.r:r.llmoScore<=70?C.o:C.g,fontFamily:"'Geist Mono',monospace"}}>{r.llmoScore}</div>}
                      {r.status==="skipped"&&<div style={{fontSize:12,color:C.o}}>重複</div>}
                      {r.status==="filtered"&&<div style={{fontSize:12,color:C.sub}}>対象外</div>}
                      {r.status==="error"&&<div style={{fontSize:12,color:C.r}}>エラー</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>{setPhase(0);setPipelineResult(null);setDiscoveredUrls([]);setError("");setAiCompanies([]);setAiComplete(false);setAiSearchMeta(null);}} style={{padding:"8px 16px",borderRadius:5,border:`1px solid ${C.bdr}`,background:"transparent",color:C.tx,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                新しい発見
              </button>
              <button onClick={onClose} style={{padding:"8px 16px",borderRadius:5,border:"none",background:C.acc,color:C.bg,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
