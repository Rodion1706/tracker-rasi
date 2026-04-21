export var DEF_HABITS = [
  { id:"d01", text:"Morning without phone", sub:"Music OK. No screens." },
  { id:"d02", text:"Glass of warm water", sub:"" },
  { id:"d03", text:"Wake up 7:00-7:30", sub:"" },
  { id:"d04", text:"Shower 9 min or less", sub:"Goal: 5 min by June" },
  { id:"d05", text:"No TikTok before 2 PM", sub:"Work footage is allowed" },
  { id:"d07", text:"No chess after 2 losses in a row", sub:"" },
  { id:"d08", text:"Don't take a task your team can do", sub:"Unless no showcase creative this week" },
  { id:"d09", text:"Gym", sub:"" },
  { id:"d10", text:"Cardio", sub:"" },
  { id:"d11", text:"Channel slot 20:00-21:00", sub:"" },
  { id:"d12", text:"English before bed", sub:"During skincare routine" },
];

export var DEF_GOALS = [
  { id:"g1", text:"Videos published", target:20, current:0, unit:"videos", quarter:"Q2" },
  { id:"g2", text:"Niche decided", target:1, current:0, unit:"yes/no", quarter:"Q2" },
  { id:"g3", text:"Channel revenue", target:500, current:0, unit:"$/mo", quarter:"Q3" },
  { id:"g4", text:"English level B2", target:1, current:0, unit:"yes/no", quarter:"Q4" },
  { id:"g5", text:"Independent income", target:1000, current:0, unit:"$/mo", quarter:"Q4" },
];

export var TAGS = ["Work 1","Work 2","Channel","Personal"];
export var TAG_COLORS = { "Work 1":"#5b7fbf", "Work 2":"#d4a54a", "Channel":"#e8102a", "Personal":"#ff6fb2" };
export var MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
export var WDAYS = ["M","T","W","T","F","S","S"];
export var QUOTES = [
  "Every no today is a yes to the Director you're becoming.",
  "You don't rise to motivation. You fall to systems.",
  "The channel won't build itself.",
  "Discipline = freedom in 18 months.",
  "Ship it. Fix it later. But ship it today.",
  "Доказывать нужно себе. Остальные подождут.",
];

export var C = {
  bg:"#111114", card:"#18161c", item:"#15131a", itemOn:"#1c0a10",
  brd:"#2a2430", brdOn:"#3a1828",
  t1:"#f0eeea", t2:"#948e98", t3:"#6e6878",
  r:"#e8102a", r2:"#ff2840", r3:"#ff5060",
};

export function argDate(off) {
  var n = new Date();
  var a = new Date(n.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  a.setDate(a.getDate() + (off || 0));
  return a.getFullYear()+"-"+String(a.getMonth()+1).padStart(2,"0")+"-"+String(a.getDate()).padStart(2,"0");
}

export function niceDate(s) {
  return new Date(s+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
}

export function dayDiff(a,b) {
  return Math.round((new Date(a+"T12:00:00")-new Date(b+"T12:00:00"))/86400000);
}

export function monthDays(y,m) {
  var arr=[];var x=new Date(y,m,1);
  while(x.getMonth()===m){arr.push(x.toISOString().split("T")[0]);x.setDate(x.getDate()+1);}
  return arr;
}

export function monStart(y,m){var d=new Date(y,m,1).getDay();return d===0?6:d-1;}

export function getWeekId(dateStr) {
  // ISO 8601 week number: week 1 is the week containing the year's first Thursday.
  var src = new Date(dateStr+"T12:00:00");
  var d = new Date(Date.UTC(src.getFullYear(), src.getMonth(), src.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var wk = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear()+"-W"+String(wk).padStart(2,"0");
}

export function dayOfYear(dateStr) {
  var d = new Date(dateStr + "T12:00:00");
  var jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d - jan1) / 86400000);
}

export function getWeekDays(dateStr) {
  var d = new Date(dateStr+"T12:00:00");
  var dow = d.getDay();
  var mon = new Date(d);
  mon.setDate(d.getDate()-(dow===0?6:dow-1));
  var days=[];
  for(var i=0;i<7;i++){var dd=new Date(mon);dd.setDate(mon.getDate()+i);days.push(dd.toISOString().split("T")[0]);}
  return days;
}
