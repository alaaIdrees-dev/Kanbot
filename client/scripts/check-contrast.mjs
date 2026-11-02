// WCAG 2.2 AA audit of the colour tokens (design-system.md §5).
// Run after ANY change to src/design/tokens.ts:  npm run check:contrast   (Node ≥ 22.6)
import { schemes } from "../src/design/tokens.ts";
const lin=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4};
const L=h=>{h=h.replace('#','');const [r,g,b]=[0,2,4].map(i=>lin(parseInt(h.slice(i,i+2),16)));return .2126*r+.7152*g+.0722*b};
const ratio=(a,b)=>{const [x,y]=[L(a),L(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
let fails=0;
function chk(scheme,name,fg,bg,min){const r=ratio(fg,bg);const ok=r>=min;if(!ok)fails++;console.log(`${ok?"PASS":"FAIL"} ${scheme.padEnd(5)} ${r.toFixed(2).padStart(5)} (min ${min}) ${name}  ${fg} on ${bg}`)}
for(const [n,s] of Object.entries(schemes)){
  const surfaces={default:s.background.default,paper:s.background.paper,raised:s.background.raised,sunken:s.background.sunken};
  // TEXT 4.5
  for(const [sn,sv] of Object.entries(surfaces)){
    chk(n,`text.primary on ${sn}`,s.text.primary,sv,4.5);
    chk(n,`text.secondary on ${sn}`,s.text.secondary,sv,4.5);
    chk(n,`text.muted on ${sn}`,s.text.muted,sv,4.5);
    chk(n,`primary link on ${sn}`,s.primary.main,sv,4.5);
    chk(n,`ai.text on ${sn}`,s.ai.text,sv,4.5);
    for(const k of ["success","warning","error","info"]) chk(n,`${k} text on ${sn}`,s[k].main,sv,4.5);
  }
  // Buttons: label on fill
  for(const k of ["primary","ai","success","warning","error","info"]) chk(n,`${k} contrastText on main`,s[k].contrastText,s[k].main,4.5);
  chk(n,"ai contrastText on ai.dark (hover)",s.ai.contrastText,s.ai.dark,4.5);
  for(const k of ["primary","success","warning","error","info"]) { chk(n,`text.primary on tint.${k} (alert body)`,s.text.primary,s.tint[k],4.5); }
  chk(n,"text.primary on tint.ai",s.text.primary,s.tint.ai,4.5);
  // Tinted chips: coloured text on its tint
  chk(n,"primary on tint",s.primary.main,s.tint.primary,4.5);
  chk(n,"ai.text on tint",s.ai.text,s.tint.ai,4.5);
  for(const k of ["success","warning","error","info"]) chk(n,`${k} on tint`,s[k].main,s.tint[k],4.5);
  chk(n,"text.primary on tint.primary (selected row)",s.text.primary,s.tint.primary,4.5);
  // NON-TEXT 3:1
  for(const [sn,sv] of Object.entries({default:s.background.default,paper:s.background.paper,raised:s.background.raised})) chk(n,`border.interactive vs ${sn}`,s.border.interactive,sv,3);
  for(const [g,obj] of [["status",s.status],["priority",s.priority],["todoType",s.todoType],["sprint",s.sprint]]) for(const [k,v] of Object.entries(obj)) { chk(n,`${g}.${k} marker vs paper`,v,s.background.paper,3); chk(n,`${g}.${k} marker vs default`,v,s.background.default,3); }
  chk(n,"focus ring (primary) vs default",s.primary.main,s.background.default,3);
  chk(n,"focus ring (primary) vs paper",s.primary.main,s.background.paper,3);
}
console.log(fails? `\n${fails} FAILING PAIRS`:"\nALL PAIRS PASS");
