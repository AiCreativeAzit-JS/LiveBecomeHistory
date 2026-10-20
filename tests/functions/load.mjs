const env={SUPABASE_URL:'u',SUPABASE_SERVICE_ROLE_KEY:'SERVICE'}; let h; globalThis.Deno={env:{get:k=>env[k]},serve:x=>{h=x}};
await import((p=>/^[A-Za-z]:/.test(p)?'file:///'+p.replace(/\\/g,'/'):p)(process.argv[2])); const r=await h(new Request('https://f',{method:'POST',body:'{}'})); console.log(process.argv[2].split('/').slice(-2)[0], r.status, await r.text());
