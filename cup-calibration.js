/* Optional cup outer-diameter scale. Never infer rim identity from the cup ellipse. */
'use strict';
const cupCalibrationState={confirmedSignature:null};
function cupCalibrationSignature(){
  return JSON.stringify({a:points[2]||null,b:points[3]||null,diameter:document.getElementById('cupOuterDiameter').value});
}
function resetCupCalibration(){
  cupCalibrationState.confirmedSignature=null;
  document.getElementById('cupOuterDiameter').value='';
  document.getElementById('cupCalibrationConfirmed').checked=false;
  document.getElementById('lengthCalibrationSource').value='manual';
}
function cupCalibrationResult(){
  const check=document.getElementById('cupCalibrationConfirmed');
  if(check.checked&&cupCalibrationState.confirmedSignature!==cupCalibrationSignature()){
    check.checked=false;cupCalibrationState.confirmedSignature=null;
  }
  const raw=document.getElementById('cupOuterDiameter').value.trim();
  const result=OffsetGeometry.cupCalibration([points[2],points[3]],raw===''?NaN:Number(raw),imageLoaded&&check.checked);
  result.assumptionsAcknowledged=imageLoaded&&check.checked;
  result.points={A:points[2]?{...points[2]}:null,B:points[3]?{...points[3]}:null};
  const diameterText=Number.isFinite(result.diameterPx)?result.diameterPx.toFixed(1)+' px':'未打点';
  document.getElementById('cupCalibrationStatus').textContent='A–B: '+diameterText+' ｜ '+result.status+(result.mmPerPx===null?'':' ｜ '+result.mmPerPx.toFixed(5)+' mm/px');
  return result;
}
function refreshCalibrationOutputs(){updateLengthMeasurements();renderOffsetMeasurements();}
document.getElementById('cupOuterDiameter').addEventListener('input',()=>{
  document.getElementById('cupCalibrationConfirmed').checked=false;cupCalibrationState.confirmedSignature=null;refreshCalibrationOutputs();
});
document.getElementById('cupCalibrationConfirmed').addEventListener('change',e=>{
  cupCalibrationState.confirmedSignature=e.target.checked?cupCalibrationSignature():null;refreshCalibrationOutputs();
});
document.getElementById('lengthCalibrationSource').addEventListener('change',refreshCalibrationOutputs);
