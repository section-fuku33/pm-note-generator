'use client';
import { useState } from "react";
const RESEARCH_PROMPT = (keywords) => `あなたはプロダクトマネージャー（PDM）向けのリサーチ専門AIです。
web_searchツールを使って、以下のキーワードで直近1週間のPDM関連トレンドを検索してください。
${keywords.map(k => `- 「${k}」`).join("\n")}
【出力形式】
## 今週のPDMトレンド収集結果
### 収集した記事・話題
（見つかった記事や話題を5〜8件、箇条書きで。タイトル＋一言要約＋URL）
### 注目トピック3選
1. （トピック名）：（なぜ注目なのか2〜3行）
2. （トピック名）：（なぜ注目なのか2〜3行）
3. （トピック名）：（なぜ注目なのか2〜3行）
### 今週の記事方向性の提案
（この情報をもとにどんな記事が書けそうか、2〜3行で提案）
【注意事項】
- 記事生成はしないでください。リサーチ結果の提示のみ行ってください
- 実在する記事・情報のみを掲載すること。存在しない記事やURLを作り上げないこと`;
const ARTICLE_FROM_RESEARCH_PROMPT = (selectedTopics) => {
  const topicInstruction = selectedTopics.length === 0
    ? "リサーチ結果全体をもとに、今週のPDMトレンドをバランスよく取り上げた記事を書いてください。"
    : selectedTopics.length === 1
    ? `「${selectedTopics[0]}」というトピックに絞り込んで、そのテーマを深掘りした記事を書いてください。他のトピックには触れなくてOKです。`
    : `以下の${selectedTopics.length}つのトピックを中心に、それぞれを関連づけながら記事を書いてください。\n${selectedTopics.map((t,i)=>`${i+1}. ${t}`).join("\n")}`;
  return `あなたは日本語のnote記事を執筆する専門AIです。
筆者はPDM（プロダクトマネージャー）で、読者も同じくPDMや開発に関わる人たちです。
${topicInstruction}
【文体・トーン】
理想は「ちょっと頼りになるアニキ肌の先輩が、仕事終わりにざっくばらんに話してくれる感じ」。
- 断定を避け「〜じゃない？」「〜っぽい」「〜な気がする」などゆるく言い切る
- 「ぶっちゃけ」「なんか」「わりと」など力を抜いた言葉を自然に使う
- 専門用語はさらっと噛み砕く
- たまに軽くツッコむ（「それ去年も言ってたよね」くらいの温度感）
- ユーモアや文化ネタ（攻殻機動隊、ジョジョ、芸人ネタ等）は全体で1〜2箇所だけ、ボソっと自然に
- 「！」多用しない。「〜ですね」「〜ましょう」みたいな指導者ぶった言い方はしない
【構成】
# （タイトル：キャッチーだけど気負いすぎない感じ）
## はじめに（100字）
${selectedTopics.length <= 1
  ? `## 背景：なぜ今これが話題なのか（200字）
## 深掘り①：（見出し）（300字）
## 深掘り②：（見出し）（300字）
## 深掘り③：（見出し）（300字）`
  : selectedTopics.map((_,i)=>`## トピック${i+1}：（見出し）（300字）`).join("\n")}
## で、結局どうすればいいの？（200字）
## おわりに（50字）
【注意事項】
- 事実に即した内容のみ。存在しない事例・データを作り上げない
- 英語情報は日本語に意訳・咀嚼
- 必ず最後まで書ききること
- 全体1200〜1500字`;
};
const ARTICLE_FROM_MEMO_PROMPT = `あなたは日本語のnote記事を執筆する専門AIです。
筆者はPDM（プロダクトマネージャー）で、読者も同じくPDMや開発に関わる人たちです。
入力はどんな形式でも構いません。箇条書き、話し言葉、断片的なメモ、何でもOKです。
書き手の視点・経験・個性をそのまま活かしながら、読者に伝わるnote記事に仕上げてください。
【文体・トーン】
理想は「ちょっと頼りになるアニキ肌の先輩が、仕事終わりにざっくばらんに話してくれる感じ」。
- 断定を避け「〜じゃない？」「〜っぽい」「〜な気がする」などゆるく言い切る
- 「ぶっちゃけ」「なんか」「わりと」など力を抜いた言葉を自然に使う
- 専門用語はさらっと噛み砕く
- ユーモアや文化ネタ（攻殻機動隊、ジョジョ、芸人ネタ等）は全体で1〜2箇所だけ、ボソっと自然に
- 「！」多用しない。「〜ですね」「〜ましょう」みたいな指導者ぶった言い方はしない
【構成】
# （タイトル：キャッチーだけど気負いすぎない感じ）
## はじめに（100字）
## （メモの内容に合わせた見出し）（300字）
## （メモの内容に合わせた見出し）（300字）
## （メモの内容に合わせた見出し）（300字）
## で、結局どうすればいいの？（200字）
## おわりに（50字）
【注意事項】
- メモに書かれた内容・経験・意見を尊重すること。勝手に事実を追加しない
- 必ず最後まで書ききること
- 全体1200〜1500字`;
// トピックをリサーチ結果から抽出
function parseTopics(researchText) {
  const topics = [];
  const lines = researchText.split("\n");
  let inTopics = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes("注目トピック")) { inTopics = true; continue; }
    if (inTopics && trimmed.startsWith("##")) break;
    if (inTopics && trimmed) {
      const m1 = trimmed.match(/^\d+[.)]\s*\*{0,2}([^*\n]{2,40}?)\*{0,2}\s*[:：]/);
      if (m1) { topics.push(m1[1].trim()); continue; }
      const m2 = trimmed.match(/^\d+[.)]\s*\*{0,2}([^*\n]{2,40}?)\*{0,2}\s*$/);
      if (m2) { topics.push(m2[1].trim()); continue; }
    }
    if (topics.length >= 3) break;
  }
  return topics.slice(0, 3);
}
// ============================================================
// EYECATCH THEMES
// ============================================================
const THEMES = {
  cyber: {
    label: "サイバー", emoji: "⬡",
    generate: (title, catchcopy) => {
      const W=1200,H=630,canvas=document.createElement("canvas");
      canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d");
      ctx.fillStyle="#0a0e1a";ctx.fillRect(0,0,W,H);
      for(let y=0;y<H;y+=4){ctx.fillStyle="rgba(0,255,180,0.025)";ctx.fillRect(0,y,W,2);}
      ctx.strokeStyle="rgba(0,255,140,0.08)";ctx.lineWidth=1;
      for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      ctx.strokeStyle="#00ff8c";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(60,50);ctx.lineTo(60,H-50);ctx.stroke();
      ctx.strokeStyle="rgba(0,255,140,0.3)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(68,80);ctx.lineTo(68,H-80);ctx.stroke();
      const hx=W-100,hy=100,hr=60;
      ctx.strokeStyle="rgba(0,200,255,0.4)";ctx.lineWidth=1.5;
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=(Math.PI/3)*i-Math.PI/6;i===0?ctx.moveTo(hx+hr*Math.cos(a),hy+hr*Math.sin(a)):ctx.lineTo(hx+hr*Math.cos(a),hy+hr*Math.sin(a));}
      ctx.closePath();ctx.stroke();
      ctx.shadowColor="transparent";ctx.shadowBlur=0;
      ctx.fillStyle="#e0ffe8";ctx.font="bold 58px 'Courier New', monospace";
      const maxW=W-180;let line="",y=200,lineH=76;
      for(const ch of title){const t=line+ch;if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,90,y);line=ch;y+=lineH;}else line=t;}
      ctx.fillText(line,90,y);
      ctx.strokeStyle="#00ff8c";ctx.lineWidth=0.5;line="";y=200;
      for(const ch of title){const t=line+ch;if(ctx.measureText(t).width>maxW&&line){ctx.strokeText(line,90,y);line=ch;y+=lineH;}else line=t;}
      ctx.strokeText(line,90,y);
      ctx.fillStyle="#00c8ff";ctx.font="22px 'Courier New', monospace";
      if(catchcopy)ctx.fillText("> "+catchcopy,90,y+56);
      ctx.strokeStyle="rgba(0,255,140,0.4)";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(W-80,H-80,120,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(W-80,H-80,80,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="rgba(0,255,140,0.15)";ctx.font="11px 'Courier New', monospace";
      ["01001010","10110100","00111010","11001011","01010110"].forEach((b,i)=>ctx.fillText(b,W-120,H-80+i*14));
      const grad=ctx.createLinearGradient(0,0,W,0);
      grad.addColorStop(0,"#00ff8c");grad.addColorStop(0.5,"#00c8ff");grad.addColorStop(1,"#7c3aed");
      ctx.fillStyle=grad;ctx.fillRect(0,H-5,W,5);
      return canvas.toDataURL("image/png");
    }
  },
  pop: {
    label: "ポップ", emoji: "◉",
    generate: (title, catchcopy) => {
      const W=1200,H=630,canvas=document.createElement("canvas");
      canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d");
      const palettes=[{bg:"#fff7ed",c1:"#f97316",c2:"#8b5cf6",c3:"#ec4899",text:"#1c1917"},{bg:"#f0fdf4",c1:"#22c55e",c2:"#3b82f6",c3:"#f59e0b",text:"#14532d"},{bg:"#fdf4ff",c1:"#a855f7",c2:"#06b6d4",c3:"#f43f5e",text:"#4a044e"}];
      const p=palettes[Math.floor(Math.random()*palettes.length)];
      ctx.fillStyle=p.bg;ctx.fillRect(0,0,W,H);
      ctx.fillStyle=p.c1+"30";ctx.beginPath();ctx.arc(W-80,-80,280,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.c2+"25";ctx.beginPath();ctx.arc(-60,H+60,240,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.c3+"40";
      for(let i=0;i<6;i++)for(let j=0;j<4;j++){ctx.beginPath();ctx.arc(W-200+i*28,H-160+j*28,5,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle=p.c1;ctx.fillRect(60,60,8,100);
      ctx.fillStyle=p.text;ctx.font="bold 62px Arial, sans-serif";
      const maxW=W-200;let line="",y=220,lineH=80;
      for(const ch of title){const t=line+ch;if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,90,y);line=ch;y+=lineH;}else line=t;}
      ctx.fillText(line,90,y);
      if(catchcopy){ctx.font="24px Arial, sans-serif";const tw=ctx.measureText(catchcopy).width;ctx.fillStyle=p.c1;ctx.fillRect(88,y+24,tw+24,40);ctx.fillStyle="#fff";ctx.fillText(catchcopy,100,y+50);}
      [p.c1,p.c2,p.c3].forEach((c,i)=>{ctx.fillStyle=c;ctx.fillRect(i*(W/3),H-8,W/3,8);});
      return canvas.toDataURL("image/png");
    }
  },
  minimal: {
    label: "ミニマル", emoji: "□",
    generate: (title, catchcopy) => {
      const W=1200,H=630,canvas=document.createElement("canvas");
      canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d");
      const dark=Math.random()>0.5;
      const bg=dark?"#111111":"#f8f8f8",fg=dark?"#f0f0f0":"#111111",accent=dark?"#ffffff":"#000000";
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      ctx.fillStyle=accent;ctx.fillRect(60,60,200,2);
      ctx.fillStyle=fg;ctx.font="bold 64px Georgia, serif";
      const maxW=W-200;let line="",y=220,lineH=84;
      for(const ch of title){const t=line+ch;if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,80,y);line=ch;y+=lineH;}else line=t;}
      ctx.fillText(line,80,y);
      ctx.fillStyle=dark?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.2)";ctx.fillRect(80,y+28,120,1);
      if(catchcopy){ctx.fillStyle=dark?"rgba(255,255,255,0.6)":"rgba(0,0,0,0.5)";ctx.font="24px Georgia, serif";ctx.fillText(catchcopy,80,y+62);}
      ctx.fillStyle=dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)";ctx.font="bold 320px Georgia, serif";ctx.fillText("P",W-260,H+60);
      ctx.fillStyle=accent;ctx.fillRect(0,H-3,W,3);
      return canvas.toDataURL("image/png");
    }
  }
};
function extractMeta(text) {
  const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
  let title="",catchcopy="";
  for(let i=0;i<lines.length;i++){
    if(!title&&lines[i].startsWith("# "))title=lines[i].replace(/^#\s+/,"");
    if(title&&!catchcopy&&lines[i].startsWith("## はじめに")){
      for(let j=i+1;j<lines.length;j++){if(lines[j]&&!lines[j].startsWith("#")){catchcopy=lines[j].slice(0,40)+(lines[j].length>40?"…":"");break;}}
    }
    if(title&&catchcopy)break;
  }
  return {title:title||"今週のPMトレンド",catchcopy};
}
function downloadImage(dataUrl) {
  const img=new Image();
  img.onload=()=>{
    const canvas=document.createElement("canvas");
    canvas.width=img.width;canvas.height=img.height;
    canvas.getContext("2d").drawImage(img,0,0);
    canvas.toBlob(blob=>{
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="eyecatch.png";
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    },"image/png");
  };
  img.src=dataUrl;
}
const C={
  primary:"#1976D2",primaryLight:"#E3F2FD",secondary:"#7B1FA2",
  success:"#388E3C",successLight:"#E8F5E9",error:"#D32F2F",errorLight:"#FFEBEE",
  warning:"#F57C00",warningLight:"#FFF3E0",
  surface:"#FFFFFF",bg:"#F5F5F5",text:"#212121",textMed:"#757575",divider:"#E0E0E0",
};
function Card({children}){return <div style={{background:C.surface,borderRadius:"8px",boxShadow:"0 1px 3px rgba(0,0,0,0.12)",marginBottom:"16px",overflow:"hidden"}}>{children}</div>;}
function CardHeader({title,badge}){return <div style={{padding:"16px 20px 14px",borderBottom:`1px solid ${C.divider}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:"15px",fontWeight:"500",color:C.text}}>{title}</span>{badge}</div>;}
function CardBody({children}){return <div style={{padding:"16px 20px"}}>{children}</div>;}
function ActionRow({children}){return <div style={{display:"flex",gap:"8px",padding:"12px 20px",justifyContent:"flex-end",borderTop:`1px solid ${C.divider}`,flexWrap:"wrap"}}>{children}</div>;}
function BtnPrimary({onClick,children,disabled}){return <button onClick={onClick} disabled={disabled} style={{background:disabled?"#bbb":C.primary,color:"#fff",border:"none",borderRadius:"4px",padding:"10px 20px",fontSize:"14px",fontWeight:"500",cursor:disabled?"not-allowed":"pointer",boxShadow:disabled?"none":"0 2px 4px rgba(25,118,210,0.3)",display:"inline-flex",alignItems:"center",gap:"6px"}}>{children}</button>;}
function BtnOutlined({onClick,children}){return <button onClick={onClick} style={{background:"transparent",color:C.primary,border:`1px solid ${C.primary}`,borderRadius:"4px",padding:"10px 20px",fontSize:"14px",fontWeight:"500",cursor:"pointer"}}>{children}</button>;}
function BtnText({onClick,children}){return <button onClick={onClick} style={{background:"transparent",color:C.textMed,border:"none",borderRadius:"4px",padding:"10px 16px",fontSize:"14px",fontWeight:"500",cursor:"pointer"}}>{children}</button>;}
function Progress(){return <div style={{height:"4px",background:C.divider,borderRadius:"2px",overflow:"hidden",marginTop:"12px"}}><div style={{height:"100%",background:C.primary,borderRadius:"2px",animation:"indeterminate 1.5s ease-in-out infinite",width:"40%"}}/></div>;}
function ResultBox({text}){return <div style={{fontSize:"14px",lineHeight:"1.8",color:C.text,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#FAFAFA",border:`1px solid ${C.divider}`,borderRadius:"4px",padding:"16px",maxHeight:"360px",overflowY:"auto",fontFamily:"monospace"}}>{text}</div>;}
function Badge({children,color}){return <span style={{fontSize:"12px",padding:"3px 10px",borderRadius:"12px",background:color+"20",color,fontWeight:"500"}}>{children}</span>;}
function ThemeSelector({value,onChange}){
  return (
    <div>
      <div style={{fontSize:"13px",fontWeight:"500",color:C.text,marginBottom:"8px"}}>アイキャッチテイスト</div>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        {Object.entries(THEMES).map(([key,theme])=>(
          <button key={key} onClick={()=>onChange(key)} style={{padding:"8px 16px",borderRadius:"20px",fontSize:"13px",fontWeight:"500",border:`2px solid ${value===key?C.primary:C.divider}`,background:value===key?C.primaryLight:"#fff",color:value===key?C.primary:C.textMed,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:"6px"}}>
            {theme.emoji} {theme.label}
          </button>
        ))}
      </div>
    </div>
  );
}
function EyecatchPreview({eyecatchUrl,themeKey,onThemeChange,onRegen,onDownload}){
  return (
    <Card>
      <CardHeader title="アイキャッチ画像" badge={<Badge color={C.success}>✓ 自動生成</Badge>}/>
      <CardBody>
        <img src={eyecatchUrl} alt="アイキャッチ" style={{width:"100%",borderRadius:"4px",border:`1px solid ${C.divider}`,display:"block",marginBottom:"16px"}}/>
        <ThemeSelector value={themeKey} onChange={(k)=>{onThemeChange(k);onRegen(k);}}/>
      </CardBody>
      <ActionRow>
        <BtnText onClick={()=>onRegen(themeKey)}>🎲 ランダム生成</BtnText>
        <BtnPrimary onClick={onDownload}>⬇️ ダウンロード</BtnPrimary>
      </ActionRow>
    </Card>
  );
}
// トピック選択UI
function TopicSelector({topics, selected, onChange}){
  const toggle = (topic) => {
    if(selected.includes(topic)){
      onChange(selected.filter(t=>t!==topic));
    } else {
      onChange([...selected, topic]);
    }
  };
  const selectionLabel = selected.length === 0
    ? "全トレンドから記事を生成"
    : selected.length === 1
    ? `「${selected[0]}」に絞った記事を生成`
    : `選んだ${selected.length}トピックで記事を生成`;
  return (
    <div style={{marginBottom:"16px"}}>
      <div style={{fontSize:"13px",fontWeight:"500",color:C.text,marginBottom:"4px"}}>
        トピックを選んで記事の方向性を絞れます
      </div>
      <div style={{fontSize:"12px",color:C.textMed,marginBottom:"12px"}}>
        選ばなければ全体から生成、1つ選べば深掘り、複数選べばまとめ記事になります
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"12px"}}>
        {topics.map((topic,i)=>{
          const isSelected = selected.includes(topic);
          return (
            <button key={i} onClick={()=>toggle(topic)} style={{
              display:"flex",alignItems:"center",gap:"12px",
              padding:"12px 16px",borderRadius:"8px",textAlign:"left",
              border:`2px solid ${isSelected?C.primary:C.divider}`,
              background:isSelected?C.primaryLight:"#FAFAFA",
              cursor:"pointer",transition:"all 0.15s",
            }}>
              <div style={{
                width:"22px",height:"22px",borderRadius:"4px",flexShrink:0,
                border:`2px solid ${isSelected?C.primary:C.divider}`,
                background:isSelected?C.primary:"#fff",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"13px",color:"#fff",fontWeight:"bold",
              }}>
                {isSelected?"✓":""}
              </div>
              <span style={{fontSize:"14px",fontWeight:isSelected?"500":"400",color:isSelected?C.primary:C.text}}>
                {topic}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{
        padding:"10px 14px",borderRadius:"6px",fontSize:"13px",fontWeight:"500",
        background: selected.length===0?"#F5F5F5":C.primaryLight,
        color: selected.length===0?C.textMed:C.primary,
        border:`1px solid ${selected.length===0?C.divider:C.primary+"40"}`,
      }}>
        → {selectionLabel}
      </div>
    </div>
  );
}
// ============================================================
// MODE A: トレンドから作る
// ============================================================
function ModeA({onReset,showSnackbar}){
  const [step,setStep]=useState("keyword");
  const [useCustomKw,setUseCustomKw]=useState(false);
  const [customKw,setCustomKw]=useState("");
  const [research,setResearch]=useState("");
  const [topics,setTopics]=useState([]);
  const [selectedTopics,setSelectedTopics]=useState([]);
  const [note,setNote]=useState("");
  const [eyecatchUrl,setEyecatchUrl]=useState("");
  const [themeKey,setThemeKey]=useState("cyber");
  const [errorMsg,setErrorMsg]=useState("");
  const defaultKw=["プロダクトマネージャー","プロダクト開発","product management"];
  const getKeywords=()=>useCustomKw?customKw.split("\n").map(k=>k.trim()).filter(Boolean):defaultKw;
  const doResearch=async()=>{
    setStep("researching");setResearch("");setNote("");setEyecatchUrl("");setErrorMsg("");setTopics([]);setSelectedTopics([]);
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:3000,tools:[{type:"web_search_20250305",name:"web_search"}],system:RESEARCH_PROMPT(getKeywords()),messages:[{role:"user",content:"直近1週間のPDMトレンドをリサーチしてください。記事生成はしないでください。"}]})});
      const data=await res.json();
      if(data.error)throw new Error(data.error.message);
      const text=data.content?.map(b=>b.type==="text"?b.text:"").join("")||"";
      if(!text)throw new Error("リサーチ結果が空です");
      setResearch(text);
      setTopics(parseTopics(text));
      setStep("reviewed");
    }catch(e){setErrorMsg(e.message);setStep("error");}
  };
  const doGenerate=async()=>{
    setStep("generating");setErrorMsg("");
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,system:ARTICLE_FROM_RESEARCH_PROMPT(selectedTopics),messages:[{role:"user",content:`以下のリサーチ結果をもとにnote記事を最後まで書ききってください。\n\n${research}`}]})});
      const data=await res.json();
      if(data.error)throw new Error(data.error.message);
      const text=data.content?.map(b=>b.type==="text"?b.text:"").join("")||"";
      if(!text)throw new Error("生成結果が空です");
      setNote(text);
      const {title,catchcopy}=extractMeta(text);
      setEyecatchUrl(THEMES[themeKey].generate(title,catchcopy));
      setStep("done");
    }catch(e){setErrorMsg(e.message);setStep("error");}
  };
  const regenEyecatch=(key)=>{const {title,catchcopy}=extractMeta(note);setEyecatchUrl(THEMES[key||themeKey].generate(title,catchcopy));};
  const download=()=>downloadImage(eyecatchUrl);
  const copy=async()=>{
    const t=note.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
    try{await navigator.clipboard.writeText(t);}catch{const el=document.createElement("textarea");el.value=t;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el);}
    showSnackbar();
  };
  const stepDefs=[
    {label:"リサーチ",done:["reviewed","generating","done"].includes(step),active:["keyword","researching"].includes(step),color:C.primary},
    {label:"トピック選択",done:["generating","done"].includes(step),active:step==="reviewed",color:C.secondary},
    {label:"記事生成",done:step==="done",active:["generating","done"].includes(step),color:C.success},
  ];
  return (
    <>
      {/* ステップインジケーター */}
      <div style={{display:"flex",alignItems:"center",marginBottom:"24px"}}>
        {stepDefs.map((s,i)=>(
          <div key={s.label} style={{display:"flex",alignItems:"center",flex:i<stepDefs.length-1?1:"none"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
              <div style={{width:"32px",height:"32px",borderRadius:"50%",background:s.done||s.active?s.color:C.divider,color:s.done||s.active?"#fff":C.textMed,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:"600",boxShadow:s.active?`0 2px 8px ${s.color}50`:"none",transition:"all 0.3s"}}>
                {s.done?"✓":i+1}
              </div>
              <span style={{fontSize:"11px",fontWeight:"500",color:s.done||s.active?s.color:C.textMed,whiteSpace:"nowrap"}}>{s.label}</span>
            </div>
            {i<stepDefs.length-1&&<div style={{flex:1,height:"2px",margin:"0 8px 18px",background:s.done?s.color:C.divider,transition:"background 0.3s"}}/>}
          </div>
        ))}
      </div>
      {step==="keyword"&&(
        <Card>
          <CardHeader title="🔍 リサーチキーワード"/>
          <CardBody>
            <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
              {[{v:false,l:"自動（デフォルト）"},{v:true,l:"キーワードを入力"}].map(({v,l})=>(
                <button key={l} onClick={()=>setUseCustomKw(v)} style={{flex:1,padding:"10px",borderRadius:"4px",border:`2px solid ${useCustomKw===v?C.primary:C.divider}`,background:useCustomKw===v?C.primaryLight:"#fff",color:useCustomKw===v?C.primary:C.textMed,cursor:"pointer",fontSize:"13px",fontWeight:"500"}}>{l}</button>
              ))}
            </div>
            {!useCustomKw?(
              <div style={{padding:"12px 14px",background:"#FAFAFA",border:`1px solid ${C.divider}`,borderRadius:"4px",marginBottom:"16px"}}>
                {defaultKw.map(k=><div key={k} style={{fontSize:"13px",color:C.textMed,padding:"3px 0"}}>・{k}</div>)}
              </div>
            ):(
              <textarea value={customKw} onChange={e=>setCustomKw(e.target.value)} placeholder={"キーワードを1行ずつ入力\n例：\nAIエージェント\nプロダクト戦略\nGrowth PM"} style={{width:"100%",minHeight:"120px",padding:"12px",border:`1px solid ${C.divider}`,borderRadius:"4px",fontSize:"13px",lineHeight:"1.7",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",marginBottom:"16px"}}/>
            )}
            <ThemeSelector value={themeKey} onChange={setThemeKey}/>
          </CardBody>
          <ActionRow><BtnPrimary onClick={doResearch} disabled={useCustomKw&&!customKw.trim()}>📡 リサーチ開始</BtnPrimary></ActionRow>
        </Card>
      )}
      {step==="researching"&&<Card><CardHeader title="トレンドをリサーチ中..."/><CardBody><p style={{fontSize:"14px",color:C.textMed}}>直近1週間のPDM関連情報を検索しています（30秒ほど）</p><Progress/></CardBody></Card>}
      {step==="reviewed"&&(
        <Card>
          <CardHeader title="リサーチ結果"/>
          <CardBody>
            {/* トピック選択 */}
            {topics.length > 0 && (
              <TopicSelector topics={topics} selected={selectedTopics} onChange={setSelectedTopics}/>
            )}
            <div style={{fontSize:"13px",color:C.textMed,marginBottom:"8px",fontWeight:"500"}}>リサーチ全文</div>
            <ResultBox text={research}/>
          </CardBody>
          <ActionRow>
            <BtnText onClick={()=>setStep("keyword")}>キーワードを変える</BtnText>
            <BtnText onClick={doResearch}>再リサーチ</BtnText>
            <BtnPrimary onClick={doGenerate}>
              {selectedTopics.length===0?"✍️ このまま記事を生成":selectedTopics.length===1?`✍️「${selectedTopics[0]}」で生成`:`✍️ ${selectedTopics.length}トピックで生成`}
            </BtnPrimary>
          </ActionRow>
        </Card>
      )}
      {step==="generating"&&(
        <Card>
          <CardHeader title="記事＋アイキャッチを生成中..."/>
          <CardBody>
            <p style={{fontSize:"14px",color:C.textMed,marginBottom:"8px"}}>
              {selectedTopics.length===0?"全トレンドをもとに記事を執筆しています":selectedTopics.length===1?`「${selectedTopics[0]}」を深掘りした記事を執筆しています`:`選んだ${selectedTopics.length}トピックで記事を執筆しています`}
            </p>
            <Progress/>
          </CardBody>
        </Card>
      )}
      {step==="done"&&(
        <>
          <EyecatchPreview eyecatchUrl={eyecatchUrl} themeKey={themeKey} onThemeChange={setThemeKey} onRegen={regenEyecatch} onDownload={download}/>
          <Card>
            <CardHeader title="生成された記事" badge={<Badge color={C.success}>✓ 完成</Badge>}/>
            <CardBody>
              <ResultBox text={note}/>
              <div style={{marginTop:"12px",padding:"12px 14px",borderRadius:"4px",background:C.primaryLight,fontSize:"13px",color:C.primary}}>
                💡 コピーしてnoteのMarkdownエディタに貼り付けてください
              </div>
            </CardBody>
            <ActionRow>
              <BtnText onClick={onReset}>最初から</BtnText>
              <BtnOutlined onClick={()=>setStep("reviewed")}>別のトピックで作る</BtnOutlined>
              <BtnPrimary onClick={copy}>📋 Markdownでコピー</BtnPrimary>
            </ActionRow>
          </Card>
        </>
      )}
      {step==="error"&&<Card><CardBody><div style={{padding:"12px",background:C.errorLight,color:C.error,borderRadius:"4px",fontSize:"14px",marginBottom:"12px"}}>⚠️ {errorMsg}</div><BtnOutlined onClick={()=>setStep("keyword")}>最初からやり直す</BtnOutlined></CardBody></Card>}
    </>
  );
}
// ============================================================
// MODE B: 雑記から作る
// ============================================================
function ModeB({onReset,showSnackbar}){
  const [step,setStep]=useState("input");
  const [memo,setMemo]=useState("");
  const [note,setNote]=useState("");
  const [eyecatchUrl,setEyecatchUrl]=useState("");
  const [themeKey,setThemeKey]=useState("cyber");
  const [errorMsg,setErrorMsg]=useState("");
  const doGenerate=async()=>{
    setStep("generating");setErrorMsg("");
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,system:ARTICLE_FROM_MEMO_PROMPT,messages:[{role:"user",content:`以下のメモ・雑記をnote記事に仕上げてください。\n\n${memo}`}]})});
      const data=await res.json();
      if(data.error)throw new Error(data.error.message);
      const text=data.content?.map(b=>b.type==="text"?b.text:"").join("")||"";
      if(!text)throw new Error("生成結果が空です");
      setNote(text);
      const {title,catchcopy}=extractMeta(text);
      setEyecatchUrl(THEMES[themeKey].generate(title,catchcopy));
      setStep("done");
    }catch(e){setErrorMsg(e.message);setStep("error");}
  };
  const regenEyecatch=(key)=>{const {title,catchcopy}=extractMeta(note);setEyecatchUrl(THEMES[key||themeKey].generate(title,catchcopy));};
  const download=()=>downloadImage(eyecatchUrl);
  const copy=async()=>{
    const t=note.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
    try{await navigator.clipboard.writeText(t);}catch{const el=document.createElement("textarea");el.value=t;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el);}
    showSnackbar();
  };
  if(step==="done") return (
    <>
      <EyecatchPreview eyecatchUrl={eyecatchUrl} themeKey={themeKey} onThemeChange={setThemeKey} onRegen={regenEyecatch} onDownload={download}/>
      <Card>
        <CardHeader title="生成された記事" badge={<Badge color={C.success}>✓ 完成</Badge>}/>
        <CardBody>
          <ResultBox text={note}/>
          <div style={{marginTop:"12px",padding:"12px 14px",borderRadius:"4px",background:C.primaryLight,fontSize:"13px",color:C.primary}}>
            💡 コピーしてnoteのMarkdownエディタに貼り付けてください
          </div>
        </CardBody>
        <ActionRow>
          <BtnText onClick={onReset}>最初から</BtnText>
          <BtnOutlined onClick={()=>setStep("input")}>入力に戻る</BtnOutlined>
          <BtnPrimary onClick={copy}>📋 Markdownでコピー</BtnPrimary>
        </ActionRow>
      </Card>
    </>
  );
  return (
    <>
      {step==="input"&&(
        <Card>
          <CardHeader title="✏️ 雑記・メモを入力"/>
          <CardBody>
            <p style={{fontSize:"13px",color:C.textMed,marginBottom:"12px"}}>思ったこと、気づき、経験談などを自由に書いてください。箇条書きでも話し言葉でもOK。</p>
            <div style={{padding:"10px 14px",background:C.warningLight,border:`1px solid #FFE082`,borderRadius:"4px",fontSize:"12px",color:C.warning,marginBottom:"12px"}}>
              ⚠️ この機能はVercel移行後に本格稼働します。現在はAPIの制限により動作しない場合があります。
            </div>
            <textarea value={memo} onChange={e=>setMemo(e.target.value)} placeholder={"例：\n今週のスプリントレビューで気づいたこと...\nPDMのジョブディスクリプションって会社によって全然違うよなとか..."} style={{width:"100%",minHeight:"200px",padding:"12px",border:`1px solid ${C.divider}`,borderRadius:"4px",fontSize:"14px",lineHeight:"1.8",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{marginTop:"16px"}}><ThemeSelector value={themeKey} onChange={setThemeKey}/></div>
          </CardBody>
          <ActionRow><BtnPrimary onClick={doGenerate} disabled={!memo.trim()}>✍️ 記事を生成する</BtnPrimary></ActionRow>
        </Card>
      )}
      {step==="generating"&&<Card><CardHeader title="記事＋アイキャッチを生成中..."/><CardBody><p style={{fontSize:"14px",color:C.textMed}}>雑記をもとに記事を執筆しています（30秒ほど）</p><Progress/></CardBody></Card>}
      {step==="error"&&<Card><CardBody><div style={{padding:"12px",background:C.errorLight,color:C.error,borderRadius:"4px",fontSize:"14px",marginBottom:"12px"}}>⚠️ {errorMsg}</div><BtnOutlined onClick={()=>setStep("input")}>入力に戻る</BtnOutlined></CardBody></Card>}
    </>
  );
}
// ============================================================
// MODE C: アイキャッチだけ作る
// ============================================================
function ModeC({onReset}){
  const [title,setTitle]=useState("");
  const [catchcopy,setCatchcopy]=useState("");
  const [themeKey,setThemeKey]=useState("cyber");
  const [eyecatchUrl,setEyecatchUrl]=useState("");
  const generate=()=>setEyecatchUrl(THEMES[themeKey].generate(title,catchcopy));
  const download=()=>downloadImage(eyecatchUrl);
  return (
    <>
      <Card>
        <CardHeader title="🎨 アイキャッチ情報を入力"/>
        <CardBody>
          <div style={{marginBottom:"16px"}}>
            <label style={{fontSize:"13px",fontWeight:"500",color:C.text,display:"block",marginBottom:"6px"}}>タイトル</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例：AIとPMの仕事、これからどうなるの？" style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.divider}`,borderRadius:"4px",fontSize:"14px",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div style={{marginBottom:"16px"}}>
            <label style={{fontSize:"13px",fontWeight:"500",color:C.text,display:"block",marginBottom:"6px"}}>キャッチコピー（1行）</label>
            <input value={catchcopy} onChange={e=>setCatchcopy(e.target.value)} placeholder="例：週次でPDMの現場をゆるく解説" style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.divider}`,borderRadius:"4px",fontSize:"14px",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <ThemeSelector value={themeKey} onChange={(k)=>{setThemeKey(k);if(eyecatchUrl)setEyecatchUrl(THEMES[k].generate(title,catchcopy));}}/>
        </CardBody>
        <ActionRow>
          <BtnText onClick={onReset}>戻る</BtnText>
          <BtnPrimary onClick={generate} disabled={!title.trim()}>🖼️ 画像を生成する</BtnPrimary>
        </ActionRow>
      </Card>
      {eyecatchUrl&&(
        <Card>
          <CardHeader title="アイキャッチ画像" badge={<Badge color={C.success}>✓ 生成完了</Badge>}/>
          <CardBody><img src={eyecatchUrl} alt="アイキャッチ" style={{width:"100%",borderRadius:"4px",border:`1px solid ${C.divider}`,display:"block"}}/></CardBody>
          <ActionRow>
            <BtnText onClick={generate}>🎲 再生成</BtnText>
            <BtnPrimary onClick={download}>⬇️ ダウンロード</BtnPrimary>
          </ActionRow>
        </Card>
      )}
    </>
  );
}
// ============================================================
// TWEET PROMPT
// ============================================================
const TWEET_PROMPT = (url) => `あなたはX（Twitter）の投稿文を作成する専門AIです。
以下の条件でツイート文を3本作成してください。
【条件】
- 文体：くだけた口語体（「〜ですよね」「〜なんですよ」「まあ〜」など）
- 文字数：各ツイート140字以内
- 目的：現役PDMに「この記事読みたい」と思わせること
- ハッシュタグ：#PdM #プロダクトマネージャー の両方を必ず末尾に付ける
- 末尾に「🔗 ${url || '[記事URL]'}」を入れる
【3本の切り口】
1本目：記事の一番刺さるポイントを「問いかけ」で投げる
2本目：記事内のデータや事実をシンプルに提示する
3本目：読者が「わかるわ〜」と思うような共感型
【出力形式】
---ツイート1---
（本文）
---ツイート2---
（本文）
---ツイート3---
（本文）
各ツイートは必ず140字以内に収めること。`;
// ============================================================
// MODE D: X投稿文を作る
// ============================================================
function ModeD({onReset}){
  const [step,setStep]=useState("input");
  const [articleText,setArticleText]=useState("");
  const [url,setUrl]=useState("");
  const [tweets,setTweets]=useState([]);
  const [copiedIdx,setCopiedIdx]=useState(null);
  const [errorMsg,setErrorMsg]=useState("");
  const doGenerate=async()=>{
    setStep("generating");setErrorMsg("");setTweets([]);
    try{
      const res=await fetch("/api/claude",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:800,
          system:TWEET_PROMPT(url),
          messages:[{role:"user",content:`以下のnote記事の内容をもとに、ツイート文を3本作成してください。\n\n${articleText.slice(0,2000)}`}]
        })
      });
      const data=await res.json();
      if(data.error)throw new Error(data.error.message);
      const text=data.content?.map(b=>b.type==="text"?b.text:"").join("")||"";
      if(!text)throw new Error("生成結果が空です");
      // パース：どんな形式でも3本取り出す
      let parsed=[];
      // パターン1: ---ツイート1--- 区切り
      const byDivider=text.split(/---ツイート\d+---/).map(s=>s.trim()).filter(Boolean);
      if(byDivider.length>=2) parsed=byDivider.slice(0,3);
      // パターン2: 【ツイート1】や「1.」区切り
      if(parsed.length<2){
        const byLabel=text.split(/【ツイート\d+】|^\d+[.)）]\s/m).map(s=>s.trim()).filter(Boolean);
        if(byLabel.length>=2) parsed=byLabel.slice(0,3);
      }
      // パターン3: 空行で区切られたブロック
      if(parsed.length<2){
        const byBlank=text.split(/\n\s*\n/).map(s=>s.trim()).filter(s=>s.length>10);
        if(byBlank.length>=2) parsed=byBlank.slice(0,3);
      }
      // フォールバック: テキスト全体を1本目として表示
      if(parsed.length===0) parsed=[text.trim()];
      setTweets(parsed.slice(0,3));
      setStep("done");
    }catch(e){setErrorMsg(e.message);setStep("error");}
  };
  const copyTweet=async(text,idx)=>{
    try{await navigator.clipboard.writeText(text);}catch{const el=document.createElement("textarea");el.value=text;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el);}
    setCopiedIdx(idx);setTimeout(()=>setCopiedIdx(null),2000);
  };
  return (
    <>
      {step==="input"&&(
        <Card>
          <CardHeader title="🐦 X投稿文を作る"/>
          <CardBody>
            <p style={{fontSize:"13px",color:C.textMed,marginBottom:"16px",lineHeight:"1.6"}}>
              宣伝したいnote記事の本文を貼り付けてください。ツイート文を3本生成します。
            </p>
            <div style={{marginBottom:"16px"}}>
              <label style={{fontSize:"13px",fontWeight:"500",color:C.text,display:"block",marginBottom:"6px"}}>記事のURL（末尾に添付されます）</label>
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://note.com/..." style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.divider}`,borderRadius:"4px",fontSize:"14px",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div style={{marginBottom:"16px"}}>
              <label style={{fontSize:"13px",fontWeight:"500",color:C.text,display:"block",marginBottom:"6px"}}>記事の本文（コピペでOK）</label>
              <textarea value={articleText} onChange={e=>setArticleText(e.target.value)} placeholder={"noteの記事本文をここに貼り付けてください。\nMarkdownのままでもOKです。"} style={{width:"100%",minHeight:"200px",padding:"12px",border:`1px solid ${C.divider}`,borderRadius:"4px",fontSize:"13px",lineHeight:"1.8",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div style={{padding:"12px 14px",background:"#F3E5F5",borderRadius:"4px",fontSize:"12px",color:"#7B1FA2"}}>
              💡 3本の切り口：問いかけ型 / データ提示型 / 共感型
            </div>
          </CardBody>
          <ActionRow>
            <BtnText onClick={onReset}>戻る</BtnText>
            <BtnPrimary onClick={doGenerate} disabled={!articleText.trim()}>✨ ツイートを生成する</BtnPrimary>
          </ActionRow>
        </Card>
      )}
      {step==="generating"&&(
        <Card><CardHeader title="ツイート文を生成中..."/><CardBody><p style={{fontSize:"14px",color:C.textMed}}>X投稿文を3本作成しています（10秒ほど）</p><Progress/></CardBody></Card>
      )}
      {step==="done"&&(
        <Card>
          <CardHeader title="生成されたツイート文" badge={<Badge color={C.success}>✓ 3本完成</Badge>}/>
          <CardBody>
            <p style={{fontSize:"12px",color:C.textMed,marginBottom:"16px"}}>各ツイートをコピーしてXに投稿してください。</p>
            {tweets.map((tweet,i)=>(
              <div key={i} style={{marginBottom:"12px",padding:"16px",background:"#FAFAFA",border:`1px solid ${C.divider}`,borderRadius:"8px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                  <span style={{fontSize:"12px",fontWeight:"500",color:C.textMed}}>{["💬 問いかけ型","📊 データ提示型","🤝 共感型"][i]||`ツイート${i+1}`}</span>
                  <span style={{fontSize:"11px",color:tweet.length>140?"#D32F2F":C.textMed}}>{tweet.length}字</span>
                </div>
                <p style={{fontSize:"14px",lineHeight:"1.7",color:C.text,margin:"0 0 12px",whiteSpace:"pre-wrap"}}>{tweet}</p>
                <button onClick={()=>copyTweet(tweet,i)} style={{padding:"6px 16px",borderRadius:"4px",fontSize:"12px",fontWeight:"500",cursor:"pointer",background:copiedIdx===i?C.success:"transparent",color:copiedIdx===i?"#fff":C.primary,border:`1px solid ${copiedIdx===i?C.success:C.primary}`,transition:"all 0.2s"}}>
                  {copiedIdx===i?"✓ コピー済":"コピー"}
                </button>
              </div>
            ))}
          </CardBody>
          <ActionRow>
            <BtnText onClick={()=>setStep("input")}>別の記事で作る</BtnText>
            <BtnPrimary onClick={doGenerate}>🔄 再生成</BtnPrimary>
          </ActionRow>
        </Card>
      )}
      {step==="error"&&(
        <Card><CardBody>
          <div style={{padding:"12px",background:C.errorLight,color:C.error,borderRadius:"4px",fontSize:"14px",marginBottom:"12px"}}>⚠️ {errorMsg}</div>
          <BtnOutlined onClick={()=>setStep("input")}>入力に戻る</BtnOutlined>
        </CardBody></Card>
      )}
    </>
  );
}
// ============================================================
// ============================================================
// REPLY PROMPT
// ============================================================
const REPLY_PROMPT = `あなたはX（Twitter）のリプライ文を作成する専門AIです。
PDMとして活動しているアカウントが、PDM界隈でバズったツイートにリプライする文章を3本作成してください。
【前提】
- 投稿者はPDMで、noteでPDM向けの記事を書いている
- 目的：界隈に認知してもらうこと。フォローしてもらうきっかけを作ること
- 自分語りや宣伝は避ける。あくまで会話の流れに乗る自然なリプ
【3本の切り口】
1本目：現場視点で一言添える（「自分の現場だと〜」「PMやってると確かに〜」みたいな感じ）
2本目：軽く深掘りする（「これって〜という側面もありません？」くらいの温度感）
3本目：さらっと共感＋一言（「わかりすぎる。特に〜のあたり」みたいな感じ）
【文体】
- くだけた口語体。フランクだけど馴れ馴れしすぎない
- 140字以内
- ハッシュタグなし
- 宣伝文句や自己紹介を入れない
- 「！」は多用しない
【出力形式】
---リプ1---
（本文）
---リプ2---
（本文）
---リプ3---
（本文）`;
// ============================================================
// MODE E: リプ案を作る
// ============================================================
function ModeE({onReset}){
  const [step,setStep]=useState("input");
  const [tweetText,setTweetText]=useState("");
  const [replies,setReplies]=useState([]);
  const [copiedIdx,setCopiedIdx]=useState(null);
  const [errorMsg,setErrorMsg]=useState("");
  const doGenerate=async()=>{
    setStep("generating");setErrorMsg("");setReplies([]);
    try{
      const res=await fetch("/api/claude",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:800,
          system:REPLY_PROMPT,
          messages:[{role:"user",content:`以下のバズったツイートに対するリプ案を3本作成してください。\n\n【ツイート本文】\n${tweetText}`}]
        })
      });
      const data=await res.json();
      if(data.error)throw new Error(data.error.message);
      const text=data.content?.map(b=>b.type==="text"?b.text:"").join("")||"";
      if(!text)throw new Error("生成結果が空です");
      // パース
      const parsed=[];
      const parts=text.split(/---リプ\d+---/).filter(p=>p.trim());
      parts.forEach(p=>{const t=p.trim();if(t)parsed.push(t);});
      if(parsed.length===0){
        // フォールバック
        const ls=text.split("\n\n").filter(l=>l.trim());
        ls.forEach(l=>{if(l.trim())parsed.push(l.trim());});
      }
      setReplies(parsed.slice(0,3));
      setStep("done");
    }catch(e){setErrorMsg(e.message);setStep("error");}
  };
  const copyReply=async(text,idx)=>{
    try{await navigator.clipboard.writeText(text);}catch{const el=document.createElement("textarea");el.value=text;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el);}
    setCopiedIdx(idx);setTimeout(()=>setCopiedIdx(null),2000);
  };
  return (
    <>
      {step==="input"&&(
        <Card>
          <CardHeader title="💬 リプ案を作る"/>
          <CardBody>
            <p style={{fontSize:"13px",color:C.textMed,marginBottom:"16px",lineHeight:"1.6"}}>
              バズったツイートの本文を貼り付けてください。そのツイートへのリプ案を3本生成します。
            </p>
            <div style={{marginBottom:"16px"}}>
              <label style={{fontSize:"13px",fontWeight:"500",color:C.text,display:"block",marginBottom:"6px"}}>バズったツイートの本文</label>
              <textarea
                value={tweetText}
                onChange={e=>setTweetText(e.target.value)}
                placeholder={"リプしたいツイートの文章をここに貼り付けてください。"}
                style={{width:"100%",minHeight:"140px",padding:"12px",border:`1px solid ${C.divider}`,borderRadius:"4px",fontSize:"14px",lineHeight:"1.8",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}
              />
            </div>
            <div style={{padding:"12px 14px",background:"#E8F5E9",borderRadius:"4px",fontSize:"12px",color:"#388E3C"}}>
              💡 3本の切り口：現場視点 / 軽く深掘り / さらっと共感
            </div>
          </CardBody>
          <ActionRow>
            <BtnText onClick={onReset}>戻る</BtnText>
            <BtnPrimary onClick={doGenerate} disabled={!tweetText.trim()}>✨ リプ案を生成する</BtnPrimary>
          </ActionRow>
        </Card>
      )}
      {step==="generating"&&(
        <Card><CardHeader title="リプ案を生成中..."/><CardBody><p style={{fontSize:"14px",color:C.textMed}}>リプ案を3本作成しています（10秒ほど）</p><Progress/></CardBody></Card>
      )}
      {step==="done"&&(
        <Card>
          <CardHeader title="生成されたリプ案" badge={<Badge color={C.success}>✓ 3本完成</Badge>}/>
          <CardBody>
            <div style={{padding:"12px 14px",background:"#FAFAFA",border:`1px solid ${C.divider}`,borderRadius:"6px",fontSize:"13px",color:C.textMed,marginBottom:"16px",lineHeight:"1.7"}}>
              <span style={{fontWeight:"500",color:C.text}}>元ツイート：</span>{tweetText.slice(0,80)}{tweetText.length>80?"…":""}
            </div>
            {replies.map((reply,i)=>(
              <div key={i} style={{marginBottom:"12px",padding:"16px",background:"#FAFAFA",border:`1px solid ${C.divider}`,borderRadius:"8px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                  <span style={{fontSize:"12px",fontWeight:"500",color:C.textMed}}>
                    {["🏢 現場視点","🔍 軽く深掘り","🤝 さらっと共感"][i]||`リプ${i+1}`}
                  </span>
                  <span style={{fontSize:"11px",color:reply.length>140?"#D32F2F":C.textMed}}>{reply.length}字</span>
                </div>
                <p style={{fontSize:"14px",lineHeight:"1.7",color:C.text,margin:"0 0 12px",whiteSpace:"pre-wrap"}}>{reply}</p>
                <button
                  onClick={()=>copyReply(reply,i)}
                  style={{padding:"6px 16px",borderRadius:"4px",fontSize:"12px",fontWeight:"500",cursor:"pointer",background:copiedIdx===i?C.success:"transparent",color:copiedIdx===i?"#fff":C.primary,border:`1px solid ${copiedIdx===i?C.success:C.primary}`,transition:"all 0.2s"}}
                >
                  {copiedIdx===i?"✓ コピー済":"コピー"}
                </button>
              </div>
            ))}
          </CardBody>
          <ActionRow>
            <BtnText onClick={()=>setStep("input")}>別のツイートで作る</BtnText>
            <BtnPrimary onClick={doGenerate}>🔄 再生成</BtnPrimary>
          </ActionRow>
        </Card>
      )}
      {step==="error"&&(
        <Card><CardBody>
          <div style={{padding:"12px",background:C.errorLight,color:C.error,borderRadius:"4px",fontSize:"14px",marginBottom:"12px"}}>⚠️ {errorMsg}</div>
          <BtnOutlined onClick={()=>setStep("input")}>入力に戻る</BtnOutlined>
        </CardBody></Card>
      )}
    </>
  );
}
// ROOT
// ============================================================
export default function App(){
  const [mode,setMode]=useState(null);
  const [snackbar,setSnackbar]=useState(false);
  const showSnackbar=()=>{setSnackbar(true);setTimeout(()=>setSnackbar(false),2500);};
  const modes=[
    {key:"A",emoji:"📡",title:"トレンドから作る",desc:"最新PDMトレンドをリサーチ → トピックを選んで記事＋アイキャッチを生成"},
    {key:"B",emoji:"✏️",title:"雑記から作る",desc:"自分のメモや気づきをテキスト入力して記事化（Vercel移行後に本格稼働）"},
    {key:"C",emoji:"🎨",title:"アイキャッチだけ作る",desc:"タイトルとキャッチコピーを入力してカード画像を生成"},
    {key:"D",emoji:"🐦",title:"X投稿文を作る",desc:"note記事のURLを入力→記事を読んでツイート文を3本生成"},
    {key:"E",emoji:"💬",title:"リプ案を作る",desc:"バズったツイートを貼り付けて、リプ案を3本生成"},
  ];
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Roboto','Noto Sans JP',sans-serif"}}>
      <div style={{background:C.primary,color:"#fff",padding:"16px 24px",boxShadow:"0 2px 4px rgba(0,0,0,0.2)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:"720px",margin:"0 auto",display:"flex",alignItems:"center",gap:"12px"}}>
          {mode&&<button onClick={()=>setMode(null)} style={{background:"transparent",border:"none",color:"#fff",cursor:"pointer",fontSize:"20px",padding:"0 4px",opacity:0.85}}>←</button>}
          <div>
            <div style={{fontSize:"20px",fontWeight:"500"}}>PM Note Generator</div>
            {mode&&<div style={{fontSize:"12px",opacity:0.85}}>{modes.find(m=>m.key===mode)?.title}</div>}
          </div>
        </div>
      </div>
      <div style={{maxWidth:"720px",margin:"0 auto",padding:"24px 16px"}}>
        {!mode&&(
          <>
            <p style={{fontSize:"14px",color:C.textMed,marginBottom:"20px",lineHeight:"1.7"}}>どの方法で作りますか？</p>
            {modes.map(m=>(
              <button key={m.key} onClick={()=>setMode(m.key)} style={{display:"flex",alignItems:"center",gap:"16px",width:"100%",background:C.surface,border:`1px solid ${C.divider}`,borderRadius:"8px",padding:"20px",marginBottom:"12px",cursor:"pointer",textAlign:"left",boxShadow:"0 1px 3px rgba(0,0,0,0.08)",transition:"box-shadow 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 3px 8px rgba(0,0,0,0.15)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.08)"}
              >
                <span style={{fontSize:"32px"}}>{m.emoji}</span>
                <div><div style={{fontSize:"15px",fontWeight:"500",color:C.text,marginBottom:"4px"}}>{m.title}</div><div style={{fontSize:"13px",color:C.textMed,lineHeight:"1.5"}}>{m.desc}</div></div>
                <span style={{marginLeft:"auto",color:C.textMed,fontSize:"18px"}}>›</span>
              </button>
            ))}
          </>
        )}
        {mode==="A"&&<ModeA onReset={()=>setMode(null)} showSnackbar={showSnackbar}/>}
        {mode==="B"&&<ModeB onReset={()=>setMode(null)} showSnackbar={showSnackbar}/>}
        {mode==="C"&&<ModeC onReset={()=>setMode(null)}/>}
        {mode==="D"&&<ModeD onReset={()=>setMode(null)}/>}
        {mode==="E"&&<ModeE onReset={()=>setMode(null)}/>}
      </div>
      <div style={{position:"fixed",bottom:"24px",left:"50%",transform:snackbar?"translateX(-50%) translateY(0)":"translateX(-50%) translateY(80px)",background:"#323232",color:"#fff",padding:"12px 20px",borderRadius:"4px",fontSize:"14px",boxShadow:"0 3px 6px rgba(0,0,0,0.3)",transition:"transform 0.3s ease",zIndex:1000,whiteSpace:"nowrap"}}>
        ✓ Markdownでコピーしました
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap');
        @keyframes indeterminate{0%{transform:translateX(-150%);width:40%}100%{transform:translateX(350%);width:40%}}
      `}</style>
    </div>
  );
}
