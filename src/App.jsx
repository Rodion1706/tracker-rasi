import { useState, useEffect } from "react";
import { db, auth, provider, doc, getDoc, setDoc, signInWithPopup, onAuthStateChanged } from "./firebase";
import { DEF_HABITS, DEF_GOALS, TAGS, TAG_COLORS, MONTHS, WDAYS, QUOTES, C, argDate, niceDate, dayDiff, monthDays, monStart, getWeekId, getWeekDays } from "./config";

/* ══════ FIREBASE HOOKS ══════ */
function useAuth() {
  var [user,setUser]=useState(null);var [loading,setL]=useState(true);
  useEffect(function(){return onAuthStateChanged(auth,function(u){setUser(u);setL(false);});},[]);
  return {user,loading};
}

function useData(uid) {
  var [d,setD]=useState({days:{},habits:null,recurring:[],goals:DEF_GOALS,logs:{}});
  var [ld,setLd]=useState(true);
  useEffect(function(){if(!uid)return;(async function(){
    try{var s=await getDoc(doc(db,"users",uid));if(s.exists())setD(function(prev){return Object.assign({},prev,s.data());});}catch(e){}
    setLd(false);
  })();},[uid]);
  function save(nd){setD(nd);if(uid)setDoc(doc(db,"users",uid),nd,{merge:true}).catch(function(){});}
  return {data:d,loading:ld,save:save};
}

/* ══════ SHARED COMPONENTS ══════ */
function Chk(){return <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke={C.r} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
function Box({on}){return <div style={{width:20,height:20,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",border:on?"2px solid "+C.r:"2px solid "+C.brd,background:on?C.r+"15":"transparent"}}>{on?<Chk/>:null}</div>;}
function Section({label,count,total}){return <div style={{fontSize:10,letterSpacing:3,color:C.t2,marginBottom:10,display:"flex",alignItems:"center",gap:8}}><div style={{width:14,height:2,background:C.r,borderRadius:1}}/><span>{label}</span><div style={{flex:1,height:1,background:C.brd}}/>{total!==undefined&&<span style={{color:C.t3}}>{count}/{total}</span>}</div>;}

/* ══════ LOGIN ══════ */
function Login({onLogin,busy}){
  return <div style={{background:C.bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,"+C.r+","+C.r2+",transparent)"}}/>
    <div style={{width:8,height:8,background:C.r,borderRadius:2,marginBottom:16}}/>
    <div style={{fontSize:11,letterSpacing:5,color:C.r,fontWeight:700,marginBottom:40}}>COMMAND CENTER</div>
    <div onClick={onLogin} style={{padding:"14px 32px",background:C.r+"18",color:C.r,borderRadius:8,cursor:busy?"wait":"pointer",fontSize:11,fontWeight:700,border:"1px solid "+C.r+"30",opacity:busy?0.5:1}}>{busy?"CONNECTING...":"SIGN IN WITH GOOGLE"}</div>
  </div>;
}

/* ══════ MAIN APP ══════ */
export default function App(){
  var {user,loading:authLd}=useAuth();
  var [busy,setBusy]=useState(false);
  async function login(){setBusy(true);try{await signInWithPopup(auth,provider);}catch(e){}setBusy(false);}
  if(authLd)return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.t3,fontSize:13}}>loading...</div></div>;
  if(!user)return <Login onLogin={login} busy={busy}/>;
  return <Tracker uid={user.uid}/>;
}

function Tracker({uid}){
  var {data,loading,save}=useData(uid);
  var [tab,setTab]=useState("day");
  var [dayOff,setDayOff]=useState(0);
  var [mOff,setMOff]=useState(0);
  var [habitModal,setHabitModal]=useState(null);

  var today=argDate(0);
  var habits=data.habits||DEF_HABITS;
  var goals=data.goals||DEF_GOALS;
  var recurring=data.recurring||[];
  var days=data.days||{};
  var logs=data.logs||{};

  function setHabits(h){save(Object.assign({},data,{habits:h}));}
  function setGoals(g){save(Object.assign({},data,{goals:g}));}
  function setRecurring(r){save(Object.assign({},data,{recurring:r}));}
  function setLogs(l){save(Object.assign({},data,{logs:l}));}
  function setDay(key,val){var nd=Object.assign({},data);nd.days=Object.assign({},nd.days);nd.days[key]=val;save(nd);}
  function bulkSetDays(updates){var nd=Object.assign({},data);nd.days=Object.assign({},nd.days,updates);save(nd);}

  // Apply recurring tasks
  function getDayData(key){
    var dd=days[key]||{checks:{},tasks:[]};
    if(!dd.checks)dd.checks={};
    if(!dd.tasks)dd.tasks=[];
    return dd;
  }

  // Streak
  var streak=0,bestStreak=0,cur=0;
  for(var si=0;si<365;si++){
    var sk=argDate(-si);var sx=days[sk];
    if(sx&&sx.checks&&habits.every(function(h){return sx.checks[h.id];})){
      if(si===streak)streak++;
      cur++;if(cur>bestStreak)bestStreak=cur;
    }else{cur=0;}
  }

  var tabs=[["day","DAY"],["week","WEEK"],["month","MONTH"],["log","LOG"],["goals","GOALS"],["settings","SET"]];

  if(loading)return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.t3,fontSize:13}}>loading...</div></div>;

  return <div style={{background:C.bg,minHeight:"100vh",color:C.t1,maxWidth:460,margin:"0 auto",position:"relative"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,"+C.r+","+C.r2+",transparent)"}}/>
    <div style={{padding:"24px 16px 16px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
        <div style={{width:8,height:8,background:"linear-gradient(135deg,"+C.r+","+C.r2+")",borderRadius:2}}/>
        <div style={{fontSize:11,letterSpacing:5,fontWeight:700,background:"linear-gradient(90deg,"+C.r+","+C.r2+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>COMMAND CENTER</div>
      </div>
      {/* Tabs */}
      <div style={{display:"flex",marginBottom:20,borderBottom:"1px solid "+C.brd,overflowX:"auto"}}>
        {tabs.map(function(p){return <div key={p[0]} onClick={function(){setTab(p[0]);if(p[0]==="day")setDayOff(0);}} style={{
          flex:1,textAlign:"center",padding:"10px 0",fontSize:8,letterSpacing:2,whiteSpace:"nowrap",
          color:tab===p[0]?C.r:C.t3,cursor:"pointer",fontWeight:tab===p[0]?700:400,
          borderBottom:tab===p[0]?"2px solid "+C.r:"2px solid transparent",minWidth:50,
        }}>{p[1]}</div>;})}
      </div>

      {tab==="day"&&<DayView days={days} habits={habits} today={today} dayOff={dayOff} setDayOff={setDayOff}
        setDay={setDay} getDayData={getDayData} streak={streak} bestStreak={bestStreak} recurring={recurring}
        openHabitModal={function(h){setHabitModal(h);}}/>}
      {tab==="week"&&<WeekView days={days} habits={habits} today={today} dayOff={dayOff} setDayOff={setDayOff} setTab={setTab}/>}
      {tab==="month"&&<MonthView days={days} habits={habits} today={today} mOff={mOff} setMOff={setMOff} setDayOff={setDayOff} setTab={setTab}/>}
      {tab==="log"&&<LogView logs={logs} setLogs={setLogs} today={today}/>}
      {tab==="goals"&&<GoalsView goals={goals} setGoals={setGoals}/>}
      {tab==="settings"&&<SettingsView habits={habits} setHabits={setHabits} recurring={recurring} setRecurring={setRecurring} data={data} setDay={setDay} getDayData={getDayData} today={today} bulkSetDays={bulkSetDays}/>}

      <div style={{marginTop:30,height:2,background:"linear-gradient(90deg,transparent,"+C.r+"20,transparent)"}}/>
      <div style={{textAlign:"center",marginTop:10,fontSize:8,color:"#2a2430",letterSpacing:3}}>SUBTRACTION IS THE STRATEGY</div>
    </div>

    {/* Habit calendar modal */}
    {habitModal&&<HabitCalendarModal habit={habitModal} days={days} today={today} onClose={function(){setHabitModal(null);}}/>}
  </div>;
}

/* ══════ HABIT CALENDAR MODAL ══════ */
function HabitCalendarModal({habit,days,today,onClose}){
  var [mOff,setMOff]=useState(0);
  var now=new Date();
  var vm=new Date(now.getFullYear(),now.getMonth()+mOff,1);
  var mDays=monthDays(vm.getFullYear(),vm.getMonth());
  var fO=monStart(vm.getFullYear(),vm.getMonth());

  // Stats
  var curStreak=0;
  for(var i=0;i<365;i++){
    var k=argDate(-i);var x=days[k];
    if(x&&x.checks&&x.checks[habit.id])curStreak++;
    else break;
  }
  var bestStreak=0,running=0,totalDone=0,totalTracked=0;
  var allDates=Object.keys(days).sort();
  for(var j=0;j<allDates.length;j++){
    var kk=allDates[j];var xx=days[kk];
    if(xx&&xx.checks){
      totalTracked++;
      if(xx.checks[habit.id]){
        totalDone++;running++;
        if(running>bestStreak)bestStreak=running;
      }else{running=0;}
    }
  }
  var compliance=totalTracked>0?Math.round(totalDone/totalTracked*100):0;

  return <div onClick={onClose} style={{
    position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.8)",
    display:"flex",alignItems:"center",justifyContent:"center",padding:16,zIndex:100,
  }}>
    <div onClick={function(e){e.stopPropagation();}} style={{
      background:C.bg,borderRadius:14,padding:20,maxWidth:420,width:"100%",
      border:"1px solid "+C.brdOn,position:"relative",maxHeight:"90vh",overflow:"auto",
    }}>
      <div onClick={onClose} style={{position:"absolute",top:12,right:14,fontSize:18,color:C.t3,cursor:"pointer"}}>{"×"}</div>

      <div style={{marginBottom:4,fontSize:10,letterSpacing:3,color:C.r,fontWeight:700}}>HABIT</div>
      <div style={{fontSize:16,fontWeight:700,color:C.t1,marginBottom:2}}>{habit.text}</div>
      {habit.sub&&<div style={{fontSize:10,color:C.t3,marginBottom:16}}>{habit.sub}</div>}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:18}}>
        <div style={{padding:"10px 8px",borderRadius:8,background:C.item,border:"1px solid "+C.brd,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:curStreak>0?C.r:C.t3}}>{curStreak}</div>
          <div style={{fontSize:8,color:C.t3,letterSpacing:1}}>STREAK</div>
        </div>
        <div style={{padding:"10px 8px",borderRadius:8,background:C.item,border:"1px solid "+C.brd,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:bestStreak>0?C.r2:C.t3}}>{bestStreak}</div>
          <div style={{fontSize:8,color:C.t3,letterSpacing:1}}>BEST</div>
        </div>
        <div style={{padding:"10px 8px",borderRadius:8,background:C.item,border:"1px solid "+C.brd,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:C.t2}}>{totalDone}</div>
          <div style={{fontSize:8,color:C.t3,letterSpacing:1}}>TOTAL</div>
        </div>
        <div style={{padding:"10px 8px",borderRadius:8,background:C.item,border:"1px solid "+C.brd,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:compliance>=80?C.r:C.t2}}>{compliance}%</div>
          <div style={{fontSize:8,color:C.t3,letterSpacing:1}}>RATE</div>
        </div>
      </div>

      {/* Month nav */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div onClick={function(){setMOff(mOff-1);}} style={{fontSize:18,color:C.r,cursor:"pointer",padding:"4px 12px"}}>{"‹"}</div>
        <div style={{fontSize:11,letterSpacing:3,color:C.t2,fontWeight:600}}>{MONTHS[vm.getMonth()]} {vm.getFullYear()}</div>
        <div onClick={function(){if(mOff<0)setMOff(mOff+1);}} style={{fontSize:18,color:mOff<0?C.r:C.brd,cursor:mOff<0?"pointer":"default",padding:"4px 12px"}}>{"›"}</div>
      </div>

      {/* Weekday labels */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
        {WDAYS.map(function(l,i){return <div key={i} style={{textAlign:"center",fontSize:8,color:C.t3,padding:2}}>{l}</div>;})}
      </div>

      {/* Calendar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {Array.from({length:fO}).map(function(_,i){return <div key={"e"+i}/>;})}
        {mDays.map(function(day){
          var x=days[day]||{};var done=x.checks&&x.checks[habit.id];
          var hasData=x.checks&&Object.keys(x.checks).length>0;
          var isTd=day===today;var fut=day>today;
          var dn=parseInt(day.split("-")[2]);
          return <div key={day} style={{
            aspectRatio:"1",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",
            background:done?"linear-gradient(135deg,"+C.r+","+C.r2+")":hasData&&!fut?"#1a1520":C.item,
            border:isTd?"2px solid "+C.r:"1px solid "+C.brd,opacity:fut?0.3:1,
          }}>
            <div style={{fontSize:11,color:done?"#fff":hasData&&!fut?C.t2:"#3a3440",fontWeight:done||isTd?700:400}}>{dn}</div>
          </div>;
        })}
      </div>

      <div style={{marginTop:14,padding:10,borderLeft:"2px solid "+C.r+"30",fontSize:10,color:C.t3,lineHeight:1.5}}>
        Red = held. Dark = day tracked but habit missed. Gray = no data.
      </div>
    </div>
  </div>;
}

/* ══════ DAY VIEW ══════ */
function DayView({days,habits,today,dayOff,setDayOff,setDay,getDayData,streak,bestStreak,recurring,openHabitModal}){
  var [nt,setNt]=useState("");var [tag,setTag]=useState("");var [tgt,setTgt]=useState("this");
  var [pk,setPk]=useState("");var [spk,setSpk]=useState(false);
  var [eid,setEid]=useState(null);var [ev,setEv]=useState("");
  var [tagFilter,setTagFilter]=useState("");

  var viewDay=argDate(dayOff);var isToday=viewDay===today;var isFuture=viewDay>today;
  var dd=getDayData(viewDay);var ch=dd.checks;var tasks=dd.tasks;

  // Apply recurring tasks for this day
  var dayOfWeek=new Date(viewDay+"T12:00:00").getDay();
  var dayNames=["SU","MO","TU","WE","TH","FR","SA"];
  var recToday=recurring.filter(function(r){return r.days.includes(dayNames[dayOfWeek]);});
  var recNotAdded=recToday.filter(function(r){return !tasks.some(function(t){return t.recId===r.id;});});

  function applyRecurring(){
    if(recNotAdded.length===0)return;
    var newTasks=tasks.concat(recNotAdded.map(function(r){return {id:Date.now()+"-"+r.id,text:r.text,done:false,tag:r.tag||"",recId:r.id};}));
    setDay(viewDay,Object.assign({},dd,{tasks:newTasks}));
  }
  useEffect(function(){if(isToday&&recNotAdded.length>0)applyRecurring();},[viewDay]);

  function toggleCheck(id){var nc=Object.assign({},ch);nc[id]=!nc[id];setDay(viewDay,Object.assign({},dd,{checks:nc}));}
  function toggleTask(id){setDay(viewDay,Object.assign({},dd,{tasks:tasks.map(function(t){return t.id===id?Object.assign({},t,{done:!t.done}):t;})}));}
  function delTask(id){setDay(viewDay,Object.assign({},dd,{tasks:tasks.filter(function(t){return t.id!==id;})}));}
  function saveEdit(id){if(!ev.trim())return;setDay(viewDay,Object.assign({},dd,{tasks:tasks.map(function(t){return t.id===id?Object.assign({},t,{text:ev.trim()}):t;})}));setEid(null);}
  function addTask(){
    if(!nt.trim())return;
    var target=tgt==="this"?viewDay:tgt==="next"?argDate(dayOff+1):pk||viewDay;
    var td=getDayData(target);
    var newT=(td.tasks||[]).concat([{id:Date.now()+"",text:nt.trim(),done:false,tag:tag}]);
    setDay(target,Object.assign({},td,{tasks:newT}));
    setNt("");setSpk(false);
  }
  function copyOverdue(t){
    var td2=getDayData(today);
    if(td2.tasks.some(function(x){return x.text===t.text;}))return;
    setDay(today,Object.assign({},td2,{tasks:td2.tasks.concat([{id:Date.now()+"",text:t.text,done:false,tag:t.tag||""}])}));
  }

  var checksDone=habits.filter(function(h){return ch[h.id];}).length;
  var filteredTasks=tagFilter?tasks.filter(function(t){return t.tag===tagFilter;}):tasks;
  var tasksDone=tasks.filter(function(t){return t.done;}).length;
  var total=habits.length+tasks.length;var totDone=checksDone+tasksDone;
  var pct=total>0?Math.round(totDone/total*100):0;

  // Per-habit streaks
  function habitStreak(hid){var s=0;for(var i=0;i<365;i++){var k=argDate(-i);var x=days[k];if(x&&x.checks&&x.checks[hid])s++;else break;}return s;}

  // Overdue
  var yest=argDate(-1);var yd=getDayData(yest);
  var overdue=(yd.tasks||[]).filter(function(t){return !t.done;});

  // Week bars
  var weekDays=getWeekDays(viewDay);

  var quote=QUOTES[new Date().getDate()%QUOTES.length];

  return <div>
    {/* Nav */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div onClick={function(){setDayOff(dayOff-1);}} style={{fontSize:18,color:C.r,cursor:"pointer",padding:"4px 12px"}}>{"‹"}</div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:13,color:isToday?C.r:C.t1,fontWeight:600,letterSpacing:1}}>{isToday?"TODAY":niceDate(viewDay)}</div>
        {!isToday&&<div onClick={function(){setDayOff(0);}} style={{fontSize:9,color:C.t2,marginTop:3,cursor:"pointer"}}>{"▸ BACK TO TODAY"}</div>}
      </div>
      <div onClick={function(){setDayOff(dayOff+1);}} style={{fontSize:18,color:C.r,cursor:"pointer",padding:"4px 12px"}}>{"›"}</div>
    </div>

    {/* Stats */}
    <div style={{display:"flex",gap:10,marginBottom:6}}>
      <div style={{flex:1,padding:"12px 14px",borderRadius:12,background:"linear-gradient(135deg,#1e0a10,"+C.card+")",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:"linear-gradient(180deg,"+C.r+","+C.r2+")"}}/>
        <div style={{fontSize:9,color:C.t2,marginBottom:4,letterSpacing:1}}>Streak</div>
        <div style={{fontSize:26,fontWeight:700,lineHeight:1,background:"linear-gradient(90deg,"+C.r+","+C.r2+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{streak}<span style={{fontSize:10}}> d</span></div>
      </div>
      <div style={{flex:1,padding:"12px 14px",borderRadius:12,background:"linear-gradient(135deg,#161420,"+C.card+")",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:"linear-gradient(180deg,"+C.r2+","+C.r3+")"}}/>
        <div style={{fontSize:9,color:C.t2,marginBottom:4,letterSpacing:1}}>Done</div>
        <div style={{fontSize:26,fontWeight:700,color:totDone===total&&total>0?C.r:C.t1,lineHeight:1}}>{totDone}<span style={{fontSize:12,color:C.t3}}>/{total}</span></div>
      </div>
    </div>
    <div style={{display:"flex",gap:10,marginBottom:14}}>
      <div style={{flex:1,padding:"8px 14px",borderRadius:8,background:C.item,border:"1px solid "+C.brd,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:9,color:C.t3,letterSpacing:1}}>BEST</span>
        <span style={{fontSize:13,fontWeight:700,color:bestStreak>0?C.r2:C.t3}}>{bestStreak}d</span>
      </div>
      <div style={{flex:1,padding:"8px 14px",borderRadius:8,background:C.item,border:"1px solid "+C.brd,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:9,color:C.t3,letterSpacing:1}}>WEEK</span>
        <div style={{display:"flex",gap:2}}>{weekDays.map(function(wd,i){
          var wx=days[wd];var done=wx&&wx.checks&&habits.every(function(h){return wx.checks[h.id];});
          var isTd=wd===today;var fut=wd>today;
          return <div key={i} style={{width:5,height:12,borderRadius:2,background:done?C.r:fut?C.brd+"60":C.brd,border:isTd?"1px solid "+C.r:"none"}}/>;
        })}</div>
      </div>
    </div>
    {/* Progress */}
    <div style={{height:4,background:"#1e1a24",borderRadius:3,marginBottom:20,overflow:"hidden"}}>
      <div style={{height:"100%",background:"linear-gradient(90deg,"+C.r+","+C.r2+","+C.r3+")",borderRadius:3,width:pct+"%",transition:"width 0.3s"}}/>
    </div>

    {/* Overdue */}
    {isToday&&overdue.length>0&&<div style={{marginBottom:18}}>
      <div style={{fontSize:10,letterSpacing:3,color:"#cc8833",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:14,height:2,background:"#cc8833",borderRadius:1}}/>OVERDUE<div style={{flex:1,height:1,background:"#cc883320"}}/>
      </div>
      {overdue.map(function(t){return <div key={t.id} onClick={function(){copyOverdue(t);}} style={{
        display:"flex",justifyContent:"space-between",padding:"9px 14px",background:"#1a1510",borderRadius:8,marginBottom:4,border:"1px solid #2a2018",cursor:"pointer",
      }}><span style={{fontSize:12,color:"#cc8833"}}>{t.text}</span><span style={{fontSize:9,color:"#886630"}}>+ADD</span></div>;})}
    </div>}

    {/* Checklist */}
    {!isFuture&&<div>
      <Section label="DAILY CHECKLIST" count={checksDone} total={habits.length}/>
      <div style={{marginBottom:20}}>
        {habits.map(function(h){var on=!!ch[h.id];var hs=habitStreak(h.id);return <div key={h.id} style={{
          display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:10,marginBottom:4,position:"relative",overflow:"hidden",
          background:on?C.itemOn:C.item,border:"1px solid "+(on?C.brdOn:C.brd),userSelect:"none",WebkitTapHighlightColor:"transparent",
        }}>
          {on&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:"linear-gradient(180deg,"+C.r+","+C.r2+")"}}/>}
          <div onClick={function(){toggleCheck(h.id);}} style={{cursor:"pointer"}}><Box on={on}/></div>
          <div onClick={function(){toggleCheck(h.id);}} style={{flex:1,cursor:"pointer"}}>
            <div style={{fontSize:12,color:on?C.t2:C.t1,textDecoration:on?"line-through":"none",textDecorationColor:C.r+"30",lineHeight:1.4}}>{h.text}</div>
            {h.sub?<div style={{fontSize:9,color:C.t3,marginTop:1}}>{h.sub}</div>:null}
          </div>
          {hs>1&&<div style={{fontSize:9,color:C.r+"90",fontWeight:600}}>{hs}d</div>}
          <div onClick={function(){openHabitModal(h);}} style={{
            padding:"4px 8px",fontSize:10,color:C.t3,cursor:"pointer",borderRadius:6,
            background:C.card,border:"1px solid "+C.brd,
          }}>📊</div>
        </div>;})}
      </div>
    </div>}

    {/* Tasks */}
    <Section label="TASKS" count={tasksDone} total={tasks.length}/>
    {/* Tag filter */}
    {tasks.length>0&&<div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
      <div onClick={function(){setTagFilter("");}} style={{padding:"3px 8px",fontSize:8,borderRadius:4,cursor:"pointer",background:!tagFilter?C.r+"18":C.item,color:!tagFilter?C.r:C.t3,border:"1px solid "+(tagFilter?C.brd:C.r+"30")}}>All</div>
      {TAGS.map(function(tg){return <div key={tg} onClick={function(){setTagFilter(tagFilter===tg?"":tg);}} style={{
        padding:"3px 8px",fontSize:8,borderRadius:4,cursor:"pointer",
        background:tagFilter===tg?TAG_COLORS[tg]+"20":C.item,color:tagFilter===tg?TAG_COLORS[tg]:C.t3,
        border:"1px solid "+(tagFilter===tg?TAG_COLORS[tg]+"40":C.brd),
      }}>{tg}</div>;})}
    </div>}

    {filteredTasks.length===0&&<div style={{padding:14,textAlign:"center",color:C.t3,fontSize:11,borderRadius:10,background:C.item,border:"1px solid "+C.brd,marginBottom:4}}>
      {isFuture?"No tasks scheduled":"No tasks yet"}</div>}

    {filteredTasks.map(function(t){return <div key={t.id} style={{
      display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:10,marginBottom:4,position:"relative",overflow:"hidden",
      background:t.done?C.itemOn:C.item,border:"1px solid "+(t.done?C.brdOn:C.brd),justifyContent:"space-between",
    }}>
      {t.done&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:"linear-gradient(180deg,"+C.r+","+C.r2+")"}}/>}
      <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
        <div onClick={function(){toggleTask(t.id);}} style={{cursor:"pointer"}}><Box on={t.done}/></div>
        {eid===t.id?<input value={ev} onChange={function(e){setEv(e.target.value);}} onBlur={function(){saveEdit(t.id);}} onKeyDown={function(e){if(e.key==="Enter")saveEdit(t.id);}} autoFocus style={{flex:1,background:"transparent",border:"none",borderBottom:"1px solid "+C.brdOn,color:C.t1,fontSize:12,outline:"none",padding:"2px 0"}}/>
        :<div onClick={function(){setEid(t.id);setEv(t.text);}} style={{fontSize:12,color:t.done?C.t2:C.t1,cursor:"text",textDecoration:t.done?"line-through":"none",textDecorationColor:C.r+"30",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text}</div>}
      </div>
      {t.tag&&<div style={{fontSize:7,color:TAG_COLORS[t.tag]||C.t3,padding:"2px 6px",borderRadius:4,background:(TAG_COLORS[t.tag]||C.t3)+"15",flexShrink:0}}>{t.tag}</div>}
      <div onClick={function(){delTask(t.id);}} style={{fontSize:14,color:C.t3,cursor:"pointer",padding:"0 4px"}}>{"×"}</div>
    </div>;})}

    {/* Add task */}
    <div style={{marginTop:8}}>
      <div style={{display:"flex",gap:6}}>
        <input value={nt} onChange={function(e){setNt(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addTask();}} placeholder="+ Add task..."
          style={{flex:1,background:C.item,border:"1px solid "+C.brd,borderRadius:8,color:C.t2,fontSize:11,padding:"10px 12px",outline:"none"}}/>
        <div onClick={addTask} style={{padding:"10px 12px",background:C.r+"18",color:C.r,borderRadius:8,cursor:"pointer",fontSize:10,fontWeight:600,border:"1px solid "+C.r+"30",display:"flex",alignItems:"center"}}>ADD</div>
      </div>
      <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
        {TAGS.map(function(tg){return <div key={tg} onClick={function(){setTag(tag===tg?"":tg);}} style={{
          padding:"3px 8px",fontSize:8,borderRadius:4,cursor:"pointer",
          background:tag===tg?TAG_COLORS[tg]+"20":C.item,color:tag===tg?TAG_COLORS[tg]:C.t3,
          border:"1px solid "+(tag===tg?TAG_COLORS[tg]+"40":C.brd),
        }}>{tg}</div>;})}
        <div style={{flex:1}}/>
        {[["this","This day"],["next","Next day"],["pick","Date"]].map(function(p){return <div key={p[0]} onClick={function(){setTgt(p[0]);setSpk(p[0]==="pick");}} style={{
          padding:"3px 8px",fontSize:8,borderRadius:4,cursor:"pointer",
          background:tgt===p[0]?C.r+"12":C.item,color:tgt===p[0]?C.r:C.t3,border:"1px solid "+(tgt===p[0]?C.r+"30":C.brd),
        }}>{p[1]}</div>;})}
      </div>
      {spk&&<input type="date" value={pk} onChange={function(e){setPk(e.target.value);}}
        style={{marginTop:6,background:C.item,border:"1px solid "+C.brd,borderRadius:8,color:C.t2,fontSize:11,padding:"8px 12px",outline:"none",width:"100%",boxSizing:"border-box",colorScheme:"dark"}}/>}
    </div>

    {/* Quote */}
    {isToday&&<div style={{padding:12,borderLeft:"2px solid "+C.r+"40",marginTop:20}}>
      <div style={{fontSize:10,color:C.t2,lineHeight:1.6,fontStyle:"italic"}}>{'"'+quote+'"'}</div>
    </div>}

    {totDone===total&&total>0&&!isFuture&&<div style={{textAlign:"center",marginTop:16,padding:16,borderRadius:12,background:"linear-gradient(135deg,#1c0a10,"+C.card+")",border:"1px solid "+C.brdOn}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:2,background:"linear-gradient(90deg,"+C.r+","+C.r2+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>CLEAN DAY</div>
    </div>}
  </div>;
}

/* ══════ WEEK VIEW ══════ */
function WeekView({days,habits,today,dayOff,setDayOff,setTab}){
  var weekDays=getWeekDays(argDate(dayOff));
  return <div>
    <div style={{fontSize:10,letterSpacing:3,color:C.t2,marginBottom:14}}>WEEK OF {niceDate(weekDays[0])}</div>
    {weekDays.map(function(day){
      var x=days[day]||{checks:{},tasks:[]};
      var dc=habits.filter(function(h){return x.checks&&x.checks[h.id];}).length;
      var tc=(x.tasks||[]).filter(function(t){return t.done;}).length;
      var tt=(x.tasks||[]).length;
      var tot=dc+tc;var mx=habits.length+tt;var p=mx>0?Math.round(tot/mx*100):0;
      var pf=p===100&&mx>0;var isTd=day===today;var fut=day>today;
      var dayName=new Date(day+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"});
      var dayNum=parseInt(day.split("-")[2]);
      return <div key={day} onClick={function(){setDayOff(dayDiff(day,today));setTab("day");}} style={{
        display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,marginBottom:5,cursor:"pointer",
        background:pf?"linear-gradient(90deg,#1c0a10,"+C.item+")":C.item,border:isTd?"1px solid "+C.r:"1px solid "+C.brd,opacity:fut?0.5:1,
      }}>
        <div style={{width:36,textAlign:"center"}}>
          <div style={{fontSize:9,color:isTd?C.r:C.t3,letterSpacing:1}}>{dayName.toUpperCase()}</div>
          <div style={{fontSize:16,fontWeight:700,color:isTd?C.r:pf?C.r:C.t1}}>{dayNum}</div>
        </div>
        <div style={{flex:1}}>
          <div style={{height:4,background:"#1e1a24",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",background:pf?C.r:C.r2,borderRadius:2,width:p+"%"}}/>
          </div>
        </div>
        <div style={{fontSize:11,color:pf?C.r:C.t3,fontWeight:600,minWidth:30,textAlign:"right"}}>{p}%</div>
        {tt>0&&<div style={{fontSize:9,color:C.t3}}>{tc}/{tt}</div>}
      </div>;
    })}
  </div>;
}

/* ══════ MONTH VIEW ══════ */
function MonthView({days,habits,today,mOff,setMOff,setDayOff,setTab}){
  var now=new Date();var vm=new Date(now.getFullYear(),now.getMonth()+mOff,1);
  var mDays=monthDays(vm.getFullYear(),vm.getMonth());var fO=monStart(vm.getFullYear(),vm.getMonth());
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div onClick={function(){setMOff(mOff-1);}} style={{fontSize:18,color:C.r,cursor:"pointer",padding:"4px 12px"}}>{"‹"}</div>
      <div style={{fontSize:12,letterSpacing:4,color:C.t2,fontWeight:600}}>{MONTHS[vm.getMonth()]} {vm.getFullYear()}</div>
      <div onClick={function(){setMOff(mOff+1);}} style={{fontSize:18,color:C.r,cursor:"pointer",padding:"4px 12px"}}>{"›"}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
      {WDAYS.map(function(l,i){return <div key={i} style={{textAlign:"center",fontSize:9,color:C.t3,padding:4}}>{l}</div>;})}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
      {Array.from({length:fO}).map(function(_,i){return <div key={"e"+i}/>;})}{mDays.map(function(day){
        var x=days[day]||{};var dc=x.checks?habits.filter(function(h){return x.checks[h.id];}).length:0;
        var tc=x.tasks?x.tasks.filter(function(t){return t.done;}).length:0;var tt=x.tasks?x.tasks.length:0;
        var tot=dc+tc;var mx=habits.length+tt;var p=mx>0?tot/mx:0;
        var pf=p===1&&mx>0;var pt=p>0&&!pf;var ht=tt>0;var isTd=day===today;var fut=day>today;var dn=parseInt(day.split("-")[2]);
        return <div key={day} onClick={function(){setDayOff(dayDiff(day,today));setTab("day");}} style={{
          aspectRatio:"1",borderRadius:6,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",
          background:pf?"linear-gradient(135deg,#2a1020,#1e0a10)":pt?"#18121c":C.item,
          border:isTd?"2px solid "+C.r:"1px solid "+C.brd,opacity:fut&&!ht?0.35:1,
        }}><div style={{fontSize:11,color:pf?C.r:pt?C.t2:"#3a3440",fontWeight:isTd?700:400}}>{dn}</div>
          {tot>0&&!fut&&<div style={{fontSize:7,color:pf?C.r:C.t3,marginTop:1}}>{Math.round(p*100)+"%"}</div>}
          {fut&&ht&&<div style={{width:4,height:4,borderRadius:2,background:C.r+"70",marginTop:1}}/>}
        </div>;})}
    </div>
    <div style={{background:C.card,borderRadius:12,padding:"14px 16px",marginTop:20,borderLeft:"3px solid "+C.r}}>
      <div style={{fontSize:9,color:C.t3,letterSpacing:3,marginBottom:10,fontWeight:600}}>STATS</div>
      {(function(){var past=mDays.filter(function(d){return d<=today;});
        var perf=past.filter(function(d){var x=days[d];if(!x||!x.checks)return false;return habits.every(function(h){return x.checks[h.id];});}).length;
        var actv=past.filter(function(d){var x=days[d];if(!x)return false;return habits.some(function(h){return x.checks&&x.checks[h.id];});}).length;
        return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          <div><div style={{fontSize:20,fontWeight:700,color:C.r}}>{perf}</div><div style={{fontSize:8,color:C.t3}}>perfect</div></div>
          <div><div style={{fontSize:20,fontWeight:700,color:C.t2}}>{actv}</div><div style={{fontSize:8,color:C.t3}}>tracked</div></div>
          <div><div style={{fontSize:20,fontWeight:700,color:C.t3}}>{past.length}</div><div style={{fontSize:8,color:C.t3}}>elapsed</div></div>
        </div>;})()}
    </div>
  </div>;
}

/* ══════ WEEKLY LOG ══════ */
function LogView({logs,setLogs,today}){
  var wk=getWeekId(today);var log=logs[wk]||{videos:0,lesson:"",change:"",published:0,spent:0,revenue:0};
  var [editing,setEditing]=useState(false);var [form,setForm]=useState(log);
  useEffect(function(){setForm(logs[wk]||{videos:0,lesson:"",change:"",published:0,spent:0,revenue:0});},[wk]);

  function saveLog(){var nl=Object.assign({},logs);nl[wk]=form;setLogs(nl);setEditing(false);}
  var sortedWeeks=Object.keys(logs).sort().reverse();

  return <div>
    <Section label={"WEEKLY LOG — "+wk}/>
    {!editing?<div>
      <div style={{background:C.item,borderRadius:10,padding:14,border:"1px solid "+C.brd,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
          <div><div style={{fontSize:18,fontWeight:700,color:C.r}}>{log.published||0}</div><div style={{fontSize:8,color:C.t3}}>published</div></div>
          <div><div style={{fontSize:18,fontWeight:700,color:C.t2}}>${log.spent||0}</div><div style={{fontSize:8,color:C.t3}}>spent</div></div>
          <div><div style={{fontSize:18,fontWeight:700,color:C.r2}}>${log.revenue||0}</div><div style={{fontSize:8,color:C.t3}}>revenue</div></div>
        </div>
        {log.lesson&&<div style={{marginBottom:8}}><div style={{fontSize:9,color:C.t3,letterSpacing:1,marginBottom:4}}>KEY LESSON</div><div style={{fontSize:12,color:C.t1,lineHeight:1.5}}>{log.lesson}</div></div>}
        {log.change&&<div><div style={{fontSize:9,color:C.t3,letterSpacing:1,marginBottom:4}}>CHANGE NEXT WEEK</div><div style={{fontSize:12,color:C.t1,lineHeight:1.5}}>{log.change}</div></div>}
      </div>
      <div onClick={function(){setEditing(true);setForm(log);}} style={{padding:"10px 0",textAlign:"center",color:C.r,fontSize:10,cursor:"pointer",letterSpacing:2}}>EDIT THIS WEEK</div>
    </div>
    :<div style={{background:C.item,borderRadius:10,padding:14,border:"1px solid "+C.brdOn}}>
      {[["published","Videos published","number"],["spent","$ spent on editors","number"],["revenue","$ revenue","number"]].map(function(f){
        return <div key={f[0]} style={{marginBottom:10}}>
          <div style={{fontSize:9,color:C.t3,letterSpacing:1,marginBottom:4}}>{f[1]}</div>
          <input type={f[2]} value={form[f[0]]||""} onChange={function(e){var nf=Object.assign({},form);nf[f[0]]=f[2]==="number"?Number(e.target.value):e.target.value;setForm(nf);}}
            style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t1,fontSize:13,outline:"none",padding:"4px 0",boxSizing:"border-box"}}/>
        </div>;})}
      {[["lesson","Key lesson this week"],["change","One change for next week"]].map(function(f){
        return <div key={f[0]} style={{marginBottom:10}}>
          <div style={{fontSize:9,color:C.t3,letterSpacing:1,marginBottom:4}}>{f[1]}</div>
          <textarea value={form[f[0]]||""} onChange={function(e){var nf=Object.assign({},form);nf[f[0]]=e.target.value;setForm(nf);}} rows={2}
            style={{width:"100%",background:"transparent",border:"1px solid "+C.brd,borderRadius:6,color:C.t1,fontSize:12,outline:"none",padding:8,resize:"none",boxSizing:"border-box"}}/>
        </div>;})}
      <div style={{display:"flex",gap:8}}>
        <div onClick={saveLog} style={{padding:"8px 16px",background:C.r+"18",color:C.r,borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,border:"1px solid "+C.r+"30"}}>SAVE</div>
        <div onClick={function(){setEditing(false);}} style={{padding:"8px 16px",color:C.t3,cursor:"pointer",fontSize:10}}>CANCEL</div>
      </div>
    </div>}

    {/* Past logs */}
    {sortedWeeks.length>0&&<div style={{marginTop:20}}>
      <div style={{fontSize:9,color:C.t3,letterSpacing:2,marginBottom:8}}>HISTORY</div>
      {sortedWeeks.filter(function(w){return w!==wk;}).slice(0,8).map(function(w){var l=logs[w];return <div key={w} style={{
        padding:"10px 14px",background:C.item,borderRadius:8,marginBottom:4,border:"1px solid "+C.brd,display:"flex",justifyContent:"space-between",alignItems:"center",
      }}><span style={{fontSize:11,color:C.t2}}>{w}</span>
        <span style={{fontSize:10,color:C.t3}}>{l.published||0} vids · ${l.revenue||0}</span>
      </div>;})}
    </div>}
  </div>;
}

/* ══════ GOALS VIEW ══════ */
function GoalsView({goals,setGoals}){
  var [editId,setEditId]=useState(null);var [val,setVal]=useState(0);
  var [fullEditId,setFullEditId]=useState(null);
  var [form,setForm]=useState({text:"",target:0,unit:"",quarter:"Q2",current:0});
  var [adding,setAdding]=useState(false);

  function saveProgress(id){setGoals(goals.map(function(g){return g.id===id?Object.assign({},g,{current:val}):g;}));setEditId(null);}
  function saveFullEdit(id){
    if(!form.text.trim())return;
    setGoals(goals.map(function(g){return g.id===id?Object.assign({},g,{text:form.text.trim(),target:Number(form.target)||0,unit:form.unit.trim(),quarter:form.quarter,current:Number(form.current)||0}):g;}));
    setFullEditId(null);
  }
  function delGoal(id){if(!confirm("Delete this goal?"))return;setGoals(goals.filter(function(g){return g.id!==id;}));setFullEditId(null);}
  function addGoal(){
    if(!form.text.trim())return;
    var newGoal={id:"g"+Date.now(),text:form.text.trim(),target:Number(form.target)||0,unit:form.unit.trim()||"units",quarter:form.quarter,current:Number(form.current)||0};
    setGoals(goals.concat([newGoal]));
    setForm({text:"",target:0,unit:"",quarter:"Q2",current:0});
    setAdding(false);
  }
  function startFullEdit(g){setFullEditId(g.id);setForm({text:g.text,target:g.target,unit:g.unit,quarter:g.quarter,current:g.current});}
  function startAdd(q){setAdding(true);setFullEditId(null);setEditId(null);setForm({text:"",target:0,unit:"",quarter:q||"Q2",current:0});}

  var quarters=["Q2","Q3","Q4"];

  function EditForm({onSave,onCancel,showDelete,onDelete}){
    return <div style={{padding:12,background:C.card,borderRadius:10,border:"1px solid "+C.brdOn,marginBottom:5}}>
      <div style={{fontSize:9,color:C.t3,letterSpacing:1,marginBottom:4}}>GOAL</div>
      <input value={form.text} onChange={function(e){setForm(Object.assign({},form,{text:e.target.value}));}} placeholder="Goal text" autoFocus
        style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t1,fontSize:13,outline:"none",padding:"4px 0",marginBottom:10,boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:9,color:C.t3,letterSpacing:1,marginBottom:4}}>CURRENT</div>
          <input type="number" value={form.current} onChange={function(e){setForm(Object.assign({},form,{current:e.target.value}));}}
            style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t1,fontSize:13,outline:"none",padding:"4px 0",boxSizing:"border-box"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:9,color:C.t3,letterSpacing:1,marginBottom:4}}>TARGET</div>
          <input type="number" value={form.target} onChange={function(e){setForm(Object.assign({},form,{target:e.target.value}));}}
            style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t1,fontSize:13,outline:"none",padding:"4px 0",boxSizing:"border-box"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:9,color:C.t3,letterSpacing:1,marginBottom:4}}>UNIT</div>
          <input value={form.unit} onChange={function(e){setForm(Object.assign({},form,{unit:e.target.value}));}} placeholder="videos, $, etc"
            style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t1,fontSize:12,outline:"none",padding:"4px 0",boxSizing:"border-box"}}/>
        </div>
      </div>
      <div style={{fontSize:9,color:C.t3,letterSpacing:1,marginBottom:4}}>QUARTER</div>
      <div style={{display:"flex",gap:4,marginBottom:12}}>
        {["Q2","Q3","Q4"].map(function(q){return <div key={q} onClick={function(){setForm(Object.assign({},form,{quarter:q}));}} style={{
          flex:1,padding:"6px 0",textAlign:"center",fontSize:10,letterSpacing:2,borderRadius:6,cursor:"pointer",
          background:form.quarter===q?C.r+"20":C.item,color:form.quarter===q?C.r:C.t3,
          border:"1px solid "+(form.quarter===q?C.r+"40":C.brd),
        }}>{q}</div>;})}
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:6}}>
          <div onClick={onSave} style={{padding:"6px 14px",background:C.r+"18",color:C.r,borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,border:"1px solid "+C.r+"30"}}>SAVE</div>
          <div onClick={onCancel} style={{padding:"6px 14px",color:C.t3,cursor:"pointer",fontSize:10}}>CANCEL</div>
        </div>
        {showDelete&&<div onClick={onDelete} style={{padding:"6px 14px",color:"#cc3333",cursor:"pointer",fontSize:10,border:"1px solid #cc333340",borderRadius:6}}>DELETE</div>}
      </div>
    </div>;
  }

  return <div>
    {quarters.map(function(q){
      var qGoals=goals.filter(function(g){return g.quarter===q;});
      return <div key={q} style={{marginBottom:20}}>
        <div style={{fontSize:10,letterSpacing:3,color:C.t2,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:14,height:2,background:C.r,borderRadius:1}}/>{q} 2026<div style={{flex:1,height:1,background:C.brd}}/>
          <div onClick={function(){startAdd(q);}} style={{fontSize:9,color:C.r,cursor:"pointer",letterSpacing:1}}>+ ADD</div>
        </div>
        {qGoals.map(function(g){
          if(fullEditId===g.id)return <EditForm key={g.id}
            onSave={function(){saveFullEdit(g.id);}}
            onCancel={function(){setFullEditId(null);}}
            showDelete={true}
            onDelete={function(){delGoal(g.id);}}/>;

          var p=g.target>0?Math.min(100,Math.round(g.current/g.target*100)):0;
          return <div key={g.id} style={{padding:"12px 14px",background:C.item,borderRadius:10,marginBottom:5,border:"1px solid "+C.brd}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:8}}>
              <span style={{fontSize:12,color:C.t1,flex:1}}>{g.text}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {editId===g.id
                  ?<div style={{display:"flex",gap:4,alignItems:"center"}}>
                    <input type="number" value={val} onChange={function(e){setVal(Number(e.target.value));}} autoFocus
                      style={{width:60,background:"transparent",border:"none",borderBottom:"1px solid "+C.brdOn,color:C.t1,fontSize:12,outline:"none",textAlign:"right"}}/>
                    <div onClick={function(){saveProgress(g.id);}} style={{fontSize:9,color:C.r,cursor:"pointer"}}>OK</div>
                  </div>
                  :<div onClick={function(){setEditId(g.id);setVal(g.current);}} style={{fontSize:11,color:p>=100?C.r:C.t2,cursor:"pointer"}}>{g.current}/{g.target} {g.unit}</div>
                }
                <div onClick={function(){startFullEdit(g);}} style={{fontSize:10,color:C.t3,cursor:"pointer"}}>edit</div>
              </div>
            </div>
            <div style={{height:4,background:"#1e1a24",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",background:p>=100?C.r:"linear-gradient(90deg,"+C.r+","+C.r2+")",borderRadius:3,width:p+"%",transition:"width 0.3s"}}/>
            </div>
          </div>;
        })}
        {adding&&form.quarter===q&&<EditForm
          onSave={addGoal}
          onCancel={function(){setAdding(false);}}/>}
      </div>;
    })}
  </div>;
}

/* ══════ IMPORT TASKS ══════ */
function ImportTasks({setDay,getDayData,today,bulkSetDays}){
  var [text,setText]=useState("");
  var [preview,setPreview]=useState(null);
  var [error,setError]=useState("");

  function parseDate(s){
    s=s.trim().toLowerCase();
    if(s==="today")return today;
    if(s==="tomorrow")return argDate(1);
    if(s==="yesterday")return argDate(-1);
    // Day of week: monday, tuesday, etc — next occurrence
    var dayMap={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
    if(dayMap[s]!==undefined){
      var todayDate=new Date(today+"T12:00:00");
      var targetDay=dayMap[s];var curDay=todayDate.getDay();
      var diff=targetDay-curDay;if(diff<=0)diff+=7;
      var future=new Date(todayDate);future.setDate(future.getDate()+diff);
      return future.toISOString().split("T")[0];
    }
    // YYYY-MM-DD
    if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
    return null;
  }

  function doPreview(){
    setError("");
    var lines=text.split("\n").map(function(l){return l.trim();}).filter(function(l){return l&&!l.startsWith("#");});
    if(lines.length===0){setError("No tasks to parse");return;}
    var parsed=[];var errors=[];
    lines.forEach(function(line,idx){
      var parts=line.split("|").map(function(p){return p.trim();});
      if(parts.length<2){errors.push("Line "+(idx+1)+": need at least date | text");return;}
      var date=parseDate(parts[0]);
      if(!date){errors.push("Line "+(idx+1)+": bad date '"+parts[0]+"'");return;}
      var tag="",taskText="";
      if(parts.length===2){taskText=parts[1];}
      else if(parts.length>=3){
        var maybeTag=parts[1];
        if(TAGS.includes(maybeTag)){tag=maybeTag;taskText=parts.slice(2).join(" | ");}
        else{taskText=parts.slice(1).join(" | ");}
      }
      if(!taskText){errors.push("Line "+(idx+1)+": empty task text");return;}
      parsed.push({date:date,tag:tag,text:taskText});
    });
    if(errors.length>0){setError(errors.join("\n"));return;}
    // Group by date
    var grouped={};
    parsed.forEach(function(p){if(!grouped[p.date])grouped[p.date]=[];grouped[p.date].push(p);});
    setPreview({tasks:parsed,grouped:grouped,total:parsed.length});
  }

   function doImport(){
    if(!preview)return;
    var allUpdates={};
    Object.keys(preview.grouped).forEach(function(date){
      var dd=getDayData(date);
      var newTasks=(dd.tasks||[]).slice();
      preview.grouped[date].forEach(function(p,i){
        newTasks.push({id:Date.now()+""+i+Math.floor(Math.random()*1000),text:p.text,tag:p.tag,done:false});
      });
      allUpdates[date]=Object.assign({},dd,{tasks:newTasks});
    });
    bulkSetDays(allUpdates);
    setText("");setPreview(null);setError("");
    alert("Imported "+preview.total+" tasks");
  }


  var exampleText="# Format: DATE | TAG (optional) | TASK\n# Dates: YYYY-MM-DD, today, tomorrow, monday, tuesday...\n# Tags: Work 1, Work 2, Channel, Personal\n\n2026-04-20 | Channel | Red Team cat niche\ntomorrow | Work 1 | Review Ars brief\nfriday | Personal | Dentist follow-up";

  return <div style={{marginTop:24}}>
    <Section label="IMPORT TASKS"/>
    <div style={{padding:12,background:C.item,borderRadius:10,border:"1px solid "+C.brd,marginBottom:8}}>
      <div style={{fontSize:9,color:C.t3,lineHeight:1.5,marginBottom:8}}>
        Paste list: <span style={{color:C.t2}}>DATE | TAG | TASK</span> per line. Tag is optional.<br/>
        Dates: <span style={{color:C.t2}}>YYYY-MM-DD, today, tomorrow, monday..sunday</span>.
      </div>
      <textarea value={text} onChange={function(e){setText(e.target.value);setPreview(null);setError("");}} rows={8}
        placeholder={exampleText}
        style={{width:"100%",background:C.card,border:"1px solid "+C.brd,borderRadius:6,color:C.t1,fontSize:11,outline:"none",padding:8,resize:"vertical",boxSizing:"border-box",fontFamily:"monospace"}}/>
      {error&&<div style={{marginTop:8,padding:8,background:"#2a1010",borderRadius:6,color:"#cc3333",fontSize:10,whiteSpace:"pre-wrap"}}>{error}</div>}
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <div onClick={doPreview} style={{padding:"8px 14px",background:C.r+"18",color:C.r,borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,border:"1px solid "+C.r+"30"}}>PREVIEW</div>
        {preview&&<div onClick={doImport} style={{padding:"8px 14px",background:C.r2+"20",color:C.r2,borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,border:"1px solid "+C.r2+"40"}}>IMPORT {preview.total} TASKS</div>}
        {(text||preview)&&<div onClick={function(){setText("");setPreview(null);setError("");}} style={{padding:"8px 14px",color:C.t3,cursor:"pointer",fontSize:10}}>CLEAR</div>}
      </div>
    </div>

    {preview&&<div style={{padding:12,background:C.card,borderRadius:10,border:"1px solid "+C.brdOn,marginBottom:8}}>
      <div style={{fontSize:9,color:C.t3,letterSpacing:2,marginBottom:8}}>PREVIEW — {preview.total} tasks across {Object.keys(preview.grouped).length} days</div>
      {Object.keys(preview.grouped).sort().map(function(date){
        return <div key={date} style={{marginBottom:10}}>
          <div style={{fontSize:10,color:C.r,fontWeight:600,marginBottom:4}}>{date} ({preview.grouped[date].length})</div>
          {preview.grouped[date].map(function(p,i){return <div key={i} style={{fontSize:11,color:C.t2,padding:"3px 0 3px 12px",borderLeft:"1px solid "+C.brd,marginLeft:4,display:"flex",gap:6}}>
            {p.tag&&<span style={{fontSize:8,color:TAG_COLORS[p.tag]||C.t3,padding:"1px 5px",borderRadius:3,background:(TAG_COLORS[p.tag]||C.t3)+"15"}}>{p.tag}</span>}
            <span>{p.text}</span>
          </div>;})}
        </div>;
      })}
    </div>}
  </div>;
}

/* ══════ SETTINGS VIEW ══════ */
function SettingsView({habits,setHabits,recurring,setRecurring,data,setDay,getDayData,today,bulkSetDays}){
  var [newH,setNewH]=useState("");var [newHS,setNewHS]=useState("");
  var [eId,setEId]=useState(null);var [eT,setET]=useState("");var [eS,setES]=useState("");
  var [newR,setNewR]=useState("");var [newRTag,setNewRTag]=useState("");var [newRDays,setNewRDays]=useState([]);

  function addH(){if(!newH.trim())return;setHabits(habits.concat([{id:"h"+Date.now(),text:newH.trim(),sub:newHS.trim()}]));setNewH("");setNewHS("");}
  function delH(id){setHabits(habits.filter(function(h){return h.id!==id;}));}
  function saveE(){if(!eT.trim())return;setHabits(habits.map(function(h){return h.id===eId?Object.assign({},h,{text:eT.trim(),sub:eS.trim()}):h;}));setEId(null);}
  function addR(){if(!newR.trim()||newRDays.length===0)return;setRecurring(recurring.concat([{id:"r"+Date.now(),text:newR.trim(),tag:newRTag,days:newRDays}]));setNewR("");setNewRTag("");setNewRDays([]);}
  function delR(id){setRecurring(recurring.filter(function(r){return r.id!==id;}));}
  function toggleRDay(d){setNewRDays(newRDays.includes(d)?newRDays.filter(function(x){return x!==d;}):newRDays.concat([d]));}

  function exportData(){
    var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="command-center-backup-"+argDate(0)+".json";a.click();URL.revokeObjectURL(url);
  }

  var dayLabels=["MO","TU","WE","TH","FR","SA","SU"];

  return <div>
    {/* Habits */}
    <Section label="HABITS"/>
    {habits.map(function(h){
      if(eId===h.id)return <div key={h.id} style={{padding:12,background:C.item,borderRadius:10,marginBottom:5,border:"1px solid "+C.brdOn}}>
        <input value={eT} onChange={function(e){setET(e.target.value);}} style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t1,fontSize:12,outline:"none",padding:"4px 0",marginBottom:6,boxSizing:"border-box"}}/>
        <input value={eS} onChange={function(e){setES(e.target.value);}} placeholder="Subtitle" style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t2,fontSize:10,outline:"none",padding:"4px 0",marginBottom:8,boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:8}}><div onClick={saveE} style={{padding:"5px 12px",background:C.r+"18",color:C.r,borderRadius:6,cursor:"pointer",fontSize:9,border:"1px solid "+C.r+"30"}}>SAVE</div><div onClick={function(){setEId(null);}} style={{padding:"5px 12px",color:C.t3,cursor:"pointer",fontSize:9}}>CANCEL</div></div>
      </div>;
      return <div key={h.id} style={{display:"flex",alignItems:"center",padding:"10px 14px",background:C.item,borderRadius:10,marginBottom:4,border:"1px solid "+C.brd,justifyContent:"space-between"}}>
        <div style={{flex:1}}><div style={{fontSize:12,color:C.t1}}>{h.text}</div>{h.sub?<div style={{fontSize:9,color:C.t3,marginTop:1}}>{h.sub}</div>:null}</div>
        <div style={{display:"flex",gap:6}}>
          <div onClick={function(){setEId(h.id);setET(h.text);setES(h.sub||"");}} style={{fontSize:10,color:C.t2,cursor:"pointer"}}>edit</div>
          <div onClick={function(){delH(h.id);}} style={{fontSize:12,color:C.t3,cursor:"pointer"}}>{"×"}</div>
        </div>
      </div>;
    })}
    <div style={{marginTop:8,padding:12,background:C.item,borderRadius:10,border:"1px solid "+C.brd}}>
      <input value={newH} onChange={function(e){setNewH(e.target.value);}} placeholder="New habit" onKeyDown={function(e){if(e.key==="Enter")addH();}}
        style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t1,fontSize:12,outline:"none",padding:"4px 0",marginBottom:6,boxSizing:"border-box"}}/>
      <input value={newHS} onChange={function(e){setNewHS(e.target.value);}} placeholder="Subtitle (optional)"
        style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t2,fontSize:10,outline:"none",padding:"4px 0",marginBottom:8,boxSizing:"border-box"}}/>
      <div onClick={addH} style={{display:"inline-block",padding:"6px 14px",background:C.r+"18",color:C.r,borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:600,border:"1px solid "+C.r+"30"}}>ADD HABIT</div>
    </div>

    {/* Recurring tasks */}
    <div style={{marginTop:24}}><Section label="RECURRING TASKS"/></div>
    {recurring.map(function(r){return <div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:C.item,borderRadius:10,marginBottom:4,border:"1px solid "+C.brd,alignItems:"center"}}>
      <div><div style={{fontSize:12,color:C.t1}}>{r.text}</div><div style={{fontSize:9,color:C.t3,marginTop:2}}>{r.days.join(", ")}{r.tag?" · "+r.tag:""}</div></div>
      <div onClick={function(){delR(r.id);}} style={{fontSize:12,color:C.t3,cursor:"pointer"}}>{"×"}</div>
    </div>;})}
    <div style={{marginTop:8,padding:12,background:C.item,borderRadius:10,border:"1px solid "+C.brd}}>
      <input value={newR} onChange={function(e){setNewR(e.target.value);}} placeholder="Task text"
        style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px solid "+C.brd,color:C.t1,fontSize:12,outline:"none",padding:"4px 0",marginBottom:8,boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:3,marginBottom:8,flexWrap:"wrap"}}>
        {dayLabels.map(function(d){return <div key={d} onClick={function(){toggleRDay(d);}} style={{
          padding:"4px 8px",fontSize:8,borderRadius:4,cursor:"pointer",
          background:newRDays.includes(d)?C.r+"20":C.card,color:newRDays.includes(d)?C.r:C.t3,
          border:"1px solid "+(newRDays.includes(d)?C.r+"30":C.brd),
        }}>{d}</div>;})}
      </div>
      <div style={{display:"flex",gap:3,marginBottom:8,flexWrap:"wrap"}}>
        {TAGS.map(function(t){return <div key={t} onClick={function(){setNewRTag(newRTag===t?"":t);}} style={{
          padding:"3px 8px",fontSize:8,borderRadius:4,cursor:"pointer",
          background:newRTag===t?TAG_COLORS[t]+"20":C.card,color:newRTag===t?TAG_COLORS[t]:C.t3,
          border:"1px solid "+(newRTag===t?TAG_COLORS[t]+"40":C.brd),
        }}>{t}</div>;})}
      </div>
      <div onClick={addR} style={{display:"inline-block",padding:"6px 14px",background:C.r+"18",color:C.r,borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:600,border:"1px solid "+C.r+"30"}}>ADD RECURRING</div>
    </div>

    {/* Import tasks */}
    <ImportTasks setDay={setDay} getDayData={getDayData} today={today} bulkSetDays={bulkSetDays}/>

    {/* Export */}
    <div style={{marginTop:24}}><Section label="DATA"/></div>
    <div onClick={exportData} style={{padding:"12px 14px",background:C.item,borderRadius:10,border:"1px solid "+C.brd,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:12,color:C.t1}}>Export backup (JSON)</span>
      <span style={{fontSize:10,color:C.r}}>DOWNLOAD</span>
    </div>
    <div style={{marginTop:12,padding:12,borderLeft:"2px solid "+C.r+"30"}}>
      <div style={{fontSize:10,color:C.t3,lineHeight:1.6}}>Changes to habits apply to future days. Past data stays intact.</div>
    </div>
  </div>;
}
