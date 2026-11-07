/* 2D AP research measurements. Pure functions; no images or network access. */
(function (root) {
  'use strict';
  const finitePoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const midpoint = (a,b) => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  function circleFromThree(ps) {
    if (!ps || ps.length!==3 || !ps.every(finitePoint)) return {error:'骨頭輪郭3点が必要です。'};
    const [a,b,c]=ps, bx=b.x-a.x,by=b.y-a.y,cx=c.x-a.x,cy=c.y-a.y;
    const lengths=[distance(a,b),distance(b,c),distance(c,a)], span=Math.max(...lengths);
    const cross=bx*cy-by*cx;
    // Reject duplicate points and short/near-collinear arcs, not just exact singularities.
    if(Math.min(...lengths)<2 || Math.abs(cross)/(span*span)<0.04)
      return {error:'骨頭3点が近すぎるか一直線に近いため、離れた輪郭へ打ち直してください。'};
    const q=2*cross, ub=((bx*bx+by*by)*cy-(cx*cx+cy*cy)*by)/q;
    const vb=(bx*(cx*cx+cy*cy)-cx*(bx*bx+by*by))/q;
    const center={x:a.x+ub,y:a.y+vb}, radius=Math.hypot(ub,vb);
    if(!finitePoint(center)||!Number.isFinite(radius)||radius<2) return {error:'骨頭円を算出できません。'};
    return {center,radius};
  }
  function calibration(ps,knownMm,confirmed) {
    if(!confirmed) return {mmPerPx:null,status:'未校正：既知長の確認が必要'};
    if(!ps || ps.length!==2 || !ps.every(finitePoint)) return {mmPerPx:null,status:'未校正：校正2点が必要'};
    if(!Number.isFinite(knownMm)||knownMm<=0||knownMm>1000) return {mmPerPx:null,status:'未校正：既知長は0超〜1000 mm'};
    const size=distance(ps[0],ps[1]);
    if(!Number.isFinite(size)||size<2) return {mmPerPx:null,status:'未校正：校正点が近すぎます'};
    return {mmPerPx:knownMm/size,status:'校正済み'};
  }
  function cupCalibration(ab,diameterMm,confirmed) {
    const out=calibration(ab,diameterMm,confirmed);
    const diameterPx=ab&&ab.length===2&&ab.every(finitePoint)?distance(ab[0],ab[1]):null;
    return {...out,source:'cup_outer_diameter_ab',knownMm:Number.isFinite(diameterMm)&&diameterMm>0?diameterMm:null,
      diameterPx:Number.isFinite(diameterPx)?diameterPx:null,
      status:out.mmPerPx===null?'カップ外径校正なし：'+out.status:'カップ外径 A–B 校正（確認された投影上の参考倍率）',
      uncertainty:'外径とA/B外縁の対応、カップ形状、撮影投影、画像の縦横比、部位ごとの拡大率の一致は自動検証できません。'};
  }
  function measure(input) {
    const {head,shaft,teardrops,side,scale}=input;
    const out={femoralPx:null,acetabularPx:null,globalPx:null,femoralMm:null,acetabularMm:null,globalMm:null,errors:[],warnings:[]};
    const circle=circleFromThree(head);
    if(circle.error){out.errors.push(circle.error);return out;}
    out.center=circle.center;out.radius=circle.radius;
    if(!shaft||shaft.length!==4||!shaft.every(finitePoint)) out.errors.push('骨幹の2断面で左右皮質4点が必要です。');
    else {
      const a=midpoint(shaft[0],shaft[1]),b=midpoint(shaft[2],shaft[3]);
      const dx=b.x-a.x,dy=b.y-a.y,len=distance(a,b);
      const widths=[distance(shaft[0],shaft[1]),distance(shaft[2],shaft[3])];
      if(!Number.isFinite(len)||!widths.every(Number.isFinite)||Math.min(...widths)<2||len<2) out.errors.push('骨幹皮質点または軸の2中心を確認してください。近すぎる点では算出できません。');
      else {
        const t=((circle.center.x-a.x)*dx+(circle.center.y-a.y)*dy)/(len*len);
        const foot={x:a.x+t*dx,y:a.y+t*dy},fo=distance(circle.center,foot);
        if(finitePoint(foot)&&Number.isFinite(fo)){out.axis=[a,b];out.foot=foot;out.femoralPx=fo;}
        else out.errors.push('骨幹軸の数値範囲が不正です。');
        if(len<Math.max(...widths)) out.warnings.push('骨幹の2断面が近いため、軸方向が不安定です。離れた断面で確認してください。');
      }
    }
    if(!teardrops||teardrops.length!==2||!teardrops.every(finitePoint)) out.errors.push('骨盤側距離には両側の涙滴点が必要です。');
    else if(!['imageLeft','imageRight'].includes(side)) out.errors.push('画像側を選んでください。');
    else {
      const [l,r]=teardrops,dx=r.x-l.x,dy=r.y-l.y,len=distance(l,r);
      if(!Number.isFinite(len)||dx<=0||len<2) out.errors.push('涙滴点はTD-Lを画像左、TD-Rを画像右へ置いてください。');
      else {
        if(dx/len<0.5) out.warnings.push('涙滴間線が大きく傾いています。画像の向きと涙滴点を確認してください。');
        const td=side==='imageLeft'?l:r,sign=side==='imageLeft'?-1:1;
        const lateral=sign*((circle.center.x-td.x)*dx+(circle.center.y-td.y)*dy)/len;
        if(!Number.isFinite(lateral)) out.errors.push('骨盤基準の数値範囲が不正です。');
        else if(lateral < -1e-9*len) out.errors.push('骨頭中心が同側涙滴点より内側です。画像側・涙滴点を確認してください。AOとGOは表示しません。');
        else {out.acetabularPx=Math.max(0,lateral);out.pelvicFoot={x:circle.center.x-sign*out.acetabularPx*dx/len,y:circle.center.y-sign*out.acetabularPx*dy/len};}
      }
    }
    if(out.femoralPx!==null&&out.acetabularPx!==null&&Number.isFinite(out.femoralPx+out.acetabularPx)) out.globalPx=out.femoralPx+out.acetabularPx;
    if(Number.isFinite(scale)&&scale>0) for(const name of ['femoral','acetabular','global'])
      if(out[name+'Px']!==null&&Number.isFinite(out[name+'Px']*scale))out[name+'Mm']=out[name+'Px']*scale;
    return out;
  }
  const api={circleFromThree,calibration,cupCalibration,measure};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.OffsetGeometry=api;
})(typeof globalThis==='object'?globalThis:this);
