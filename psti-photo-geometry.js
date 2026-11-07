/* Research-only AP distance, not a sagittal angle estimator. */
(function(root){
'use strict';
const definitions={pubicSuperior:'superior border of pubic symphysis',ischia:'each ischial contour point with greatest inferior perpendicular distance from interteardrop line (manual selection)',psti:'signed perpendicular distance from transischial line to pubic superior border; superior positive',version:'psti-photo-v1'};
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function baseline(a,b){if(!finite(a)||!finite(b))return null;const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<2||dx<=0)return null;return {x:dx/len,y:dy/len,nx:-dy/len,ny:dx/len};}
function measure(p,mmPerPx=null){
 const r={valid:false,pstiPx:null,pstiMm:null,ischialDepthLeftPx:null,ischialDepthRightPx:null,foot:null,errors:[],warnings:[]};
 const keys=['tdLeft','tdRight','ischiumLeft','ischiumRight','pubicSuperior'];
 if(keys.some(k=>!finite(p[k]))){r.errors.push('左右涙痕・左右坐骨先端・恥骨結合上縁の5点を指定してください。');return r;}
 const td=baseline(p.tdLeft,p.tdRight),it=baseline(p.ischiumLeft,p.ischiumRight);
 if(!td||!it){r.errors.push('画像左→右の基準線を2px以上離して指定してください。');return r;}
 const depth=q=>(q.x-p.tdLeft.x)*td.nx+(q.y-p.tdLeft.y)*td.ny;
 r.ischialDepthLeftPx=depth(p.ischiumLeft);r.ischialDepthRightPx=depth(p.ischiumRight);
 if(r.ischialDepthLeftPx<=0||r.ischialDepthRightPx<=0){r.errors.push('坐骨点は涙痕間線の下方に指定してください。画像の上下と打点を確認してください。');return r;}
 const ps=p.pubicSuperior,d=(ps.x-p.ischiumLeft.x)*it.nx+(ps.y-p.ischiumLeft.y)*it.ny;
 r.foot={x:ps.x-d*it.nx,y:ps.y-d*it.ny};r.pstiPx=d===0?0:-d;
 r.pstiMm=Number.isFinite(mmPerPx)&&mmPerPx>0?r.pstiPx*mmPerPx:null;r.valid=true;
 if(r.pstiPx<0)r.warnings.push('恥骨結合上縁が坐骨間線より下方です。負の符号を保持しています。打点と撮影条件を確認してください。');
 if(r.pstiMm===null)r.warnings.push('未校正：px値を別画像間で直接比較しないでください。');
 return r;
}
const api={measure,definitions};if(typeof module==='object'&&module.exports)module.exports=api;else root.PstiPhotoGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
