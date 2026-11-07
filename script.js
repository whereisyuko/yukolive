const form=document.querySelector('#signup'),statusEl=document.querySelector('#status'),button=document.querySelector('#submit');
form.addEventListener('submit',async event=>{
 event.preventDefault();statusEl.textContent='';
 const city=document.querySelector('#city').value.trim(),phone=document.querySelector('#phone').value.trim(),email=document.querySelector('#email').value.trim();
 const emailConsent=document.querySelector('#emailConsent').checked,smsConsent=document.querySelector('#smsConsent').checked;
 if(!city){statusEl.textContent='Please enter your city.';return;}
 if(!email&&!phone){statusEl.textContent='Please enter an email address or phone number.';return;}
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){statusEl.textContent='Please enter a valid email address.';return;}
 if(phone&&!/^[+\d][\d\s()\-]{6,24}$/.test(phone)){statusEl.textContent='Please check your phone number.';return;}
 if(emailConsent&&!email){statusEl.textContent='Add your email to receive email updates.';return;}
 if(smsConsent&&!phone){statusEl.textContent='Add your phone number to receive text updates.';return;}
 if(!emailConsent&&!smsConsent){statusEl.textContent='Choose at least one way to receive updates.';return;}
 const endpoint=window.YUKO_SIGNUP_ENDPOINT;
 if(!endpoint){statusEl.textContent='Signups are not connected yet. Please check back soon.';return;}
 button.disabled=true;statusEl.textContent='Sending your signup…';
 try{
  // text/plain avoids a browser preflight for the Apps Script endpoint.
  // The request returns readable JSON when the endpoint supports CORS; Apps Script redirects may prevent this.
  // Do not report success unless an explicit positive acknowledgement is received.
  const receiptId = Array.from({length:4},()=>Math.random().toString(36).slice(2)).join('');
  // Apps Script does not expose a readable cross-origin POST response.
  // Send the request, then independently check the private random receipt ID.
  await fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({city,phone,email,emailConsent,receiptId,source:'yuko-live'})});
  let confirmed=false;
  for(let attempt=0;attempt<6&&!confirmed;attempt++){
    await new Promise(resolve=>setTimeout(resolve,1400+attempt*900));
    try{confirmed=await checkReceipt(endpoint,receiptId);}catch(_){}
  }
  if(!confirmed){
    statusEl.textContent='Your details were sent, but we could not verify the signup. Please do not submit again yet.';
    return;
  }
  form.reset();statusEl.textContent="YOU'RE ON THE LIST! Keep an eye out for Yuko updates.";
 }catch(error){statusEl.textContent="Could not confirm the signup. Please check with Yuko before trying again.";}
 finally{button.disabled=false;}
});

// JSONP is used only for checking a random receipt ID, never for sending personal details.
function checkReceipt(endpoint,receiptId){
 return new Promise((resolve,reject)=>{
  const callback='yukoReceipt_'+Math.random().toString(36).slice(2);
  const script=document.createElement('script');
  let finished=false;
  const cleanup=()=>{if(finished)return;finished=true;clearTimeout(timer);script.remove();delete window[callback];};
  const timer=setTimeout(()=>{cleanup();reject(new Error('Receipt check timed out'));},6500);
  window[callback]=data=>{cleanup();resolve(data&&data.confirmed===true);};
  script.onerror=()=>{cleanup();reject(new Error('Receipt check failed'));};
  const url=new URL(endpoint);
  url.searchParams.set('receiptId',receiptId);
  url.searchParams.set('callback',callback);
  script.src=url.toString();
  document.head.appendChild(script);
 });
}

// Open the public Google Form only when its link has been configured.
const surveyLink=document.querySelector('#survey-link');
const surveyNote=document.querySelector('#survey-note');
surveyLink.addEventListener('click',event=>{
 const url=window.YUKO_SURVEY_URL;
 if(!url){event.preventDefault();surveyNote.textContent='Fan survey coming soon!';return;}
 try{const parsed=new URL(url);if(parsed.protocol!=='https:'){throw new Error('Invalid URL');}surveyLink.href=parsed.href;}
 catch(_){event.preventDefault();surveyNote.textContent='Survey link is not set up yet.';}
});
