function formDataObject(form){return Object.fromEntries(new FormData(form).entries());}

const loginForm=document.getElementById("loginForm");
if(loginForm){
  loginForm.addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=document.getElementById("message");
    const data=formDataObject(loginForm);
    const res=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    const json=await res.json();
    msg.textContent=json.message;
    msg.style.color=res.ok?"green":"crimson";
    if(res.ok)setTimeout(()=>location.href="catalogue.html",700);
  });
}

const registerForm=document.getElementById("registerForm");
if(registerForm){
  registerForm.addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=document.getElementById("message");
    const data=formDataObject(registerForm);
    const res=await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    const json=await res.json();
    msg.textContent=json.message;
    msg.style.color=res.ok?"green":"crimson";
    if(res.ok)setTimeout(()=>location.href="catalogue.html",700);
  });
}