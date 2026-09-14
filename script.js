const toggle=document.querySelector('.menu-toggle');const nav=document.querySelector('.nav');if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');}));}
const reveals=document.querySelectorAll('.reveal');if('IntersectionObserver' in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}}),{threshold:.12});reveals.forEach(el=>io.observe(el));}else{reveals.forEach(el=>el.classList.add('visible'));}

// V4.1 — mobile swipe progress for the EPSIQ workflow
const workflowSteps=document.querySelector('.steps');
const workflowCurrent=document.querySelector('.workflow-current');
if(workflowSteps&&workflowCurrent){
  const cards=[...workflowSteps.querySelectorAll('.step')];
  let rafId=0;
  const updateWorkflowIndex=()=>{
    rafId=0;
    const viewportCenter=workflowSteps.scrollLeft+workflowSteps.clientWidth/2;
    let best=0,bestDistance=Infinity;
    cards.forEach((card,i)=>{
      const center=card.offsetLeft+card.offsetWidth/2;
      const distance=Math.abs(center-viewportCenter);
      if(distance<bestDistance){bestDistance=distance;best=i;}
    });
    workflowCurrent.textContent=String(best+1);
  };
  workflowSteps.addEventListener('scroll',()=>{
    if(!rafId)rafId=requestAnimationFrame(updateWorkflowIndex);
  },{passive:true});
  window.addEventListener('resize',updateWorkflowIndex,{passive:true});
  updateWorkflowIndex();
}


// V5.4 — remember explicit language preference without forcing navigation.
document.querySelectorAll('[data-language]').forEach(link=>{
  link.addEventListener('click',()=>{
    try{ localStorage.setItem('epsiq-language',link.dataset.language||'fr'); }catch(e){}
  });
});
